# Arquitectura — el sistema como está construido

> Describe Irruptivo **tal como está implementado hoy**, no como se planeó originalmente.
> Donde el plan inicial difiere de la realidad (notablemente: reserva de stock), gana este
> documento. Para el "por qué" de las decisiones ver [`decisions.md`](./decisions.md).

## Stack

- **Next.js 16** (App Router) fullstack, **React 19**, **TypeScript**.
- **PostgreSQL** vía **Prisma 6** (`@prisma/client`).
- **Zod 4** para validación.
- **Tailwind 4** para estilos; **lucide-react** para íconos.
- **sharp** para procesamiento de imágenes (renditions).
- **Vitest** para tests de dominio/lógica.
- Server Components + **Server Actions** como mecanismo principal de mutación; las API
  routes se reservan para integraciones externas (webhook de Mercado Pago).
- Empaquetado y deploy vía **Docker / docker-compose** (app + Postgres + volumen de media).

Scripts (`package.json`): `dev`, `build`, `start`, `test` (vitest run), `typecheck`
(`tsc --noEmit`); `postinstall` corre `prisma generate`. La config de Prisma vive en
`prisma.config.ts` (no en `package.json#prisma`), que define el seed (`tsx prisma/seed.ts`).

## Organización del código

El código se organiza por **vertical slices / feature**, no por capa técnica. La lógica de
negocio vive en módulos profundos bajo `src/`; las rutas y la UI bajo `app/`.

### `src/` — dominio y lógica

| Módulo | Rol |
|---|---|
| `domain/rules.ts` | **Kernel de reglas de negocio.** Estados de pedido, transiciones de fulfillment, métodos y costos de envío, cálculo de precios/subtotales/totales, labels de disponibilidad, labels `es-AR` de estados. Fuente única de verdad de los invariantes. |
| `catalog/` | Lectura de catálogo: productos, detalle, variantes, imágenes, stock, suplementos. `product-repository.ts` lee de la DB; `demo-catalog-data.ts` es fixture de seed/test, **no** fallback de runtime. |
| `cart/` | Carrito (LocalStorage): modelo, validación de add-to-cart, revalidación contra stock/precio, server actions. |
| `checkout/` | Formulario de checkout, métodos de entrega, handoff de pago. |
| `orders/` | Creación de pedido, store de pedidos (Prisma), expiración de pendientes, token de acceso de invitado y proyección de estado de pedido. |
| `payments/` | Preferencia de Mercado Pago, webhook, reconciliación de pago, eventos de pago (idempotencia), páginas de resultado de pago. |
| `notifications/` | Emails transaccionales (confirmación al comprador, aviso al admin) y adaptador agnóstico de proveedor de email: modos `local` (outbox de dev), `http` (genérico) y `resend` (producción). |
| `admin/` | Auth/sesión de admin, gestión de productos/variantes/imágenes, cola y detalle de pedidos, transiciones de fulfillment, edición de contacto/fulfillment. |
| `storefront/` | Homepage, navegación, páginas de confianza (trust), y `components/` (UI compartida del storefront). |
| `media/` | Resolución y servido de media de producto desde el filesystem. |
| `db/client.ts` | Singleton del cliente Prisma. |

### `app/` — rutas (App Router)

- **Storefront:** `/` (home), `/coleccion` (listado de ropa) y `/coleccion/[slug]` (detalle),
  `/suplementos` (listado) y `/suplementos/[slug]` (detalle), `/buscar`, `/carrito`,
  `/checkout` y `/checkout/pago/*` (éxito, fallo, pendiente, vencido, estado), `/pedido`
  (fallback sin token) y `/pedido/[token]` (estado de pedido de invitado), `/nosotros`,
  `/envios-y-cambios` (trust pages).
- **Admin:** `/admin/login` + grupo protegido `/admin/(protected)/`: dashboard (`/admin`),
  `productos` (lista, nuevo, `[id]/editar`), `pedidos` (cola, `[id]`) y `configuracion`
  (settings de tienda, p. ej. el email de aviso al admin).
- **API:** `/api/mercado-pago/webhook` — única route handler externa.
- **Media:** `/media/[...path]` — sirve renditions de imágenes desde `IRRUPTIVO_MEDIA_ROOT`.

### `proxy.ts` (middleware)

Protege `/admin/:path*`: valida la cookie de sesión de admin y redirige a login con
`?estado=requerido` o `?estado=sesion-vencida` según el caso.

## Modelo de datos (Prisma)

Entidades principales (`prisma/schema.prisma`):

- **`Product`** → `ProductVariant` (1:N) → stock por variante, override de precio,
  opciones (color/talle/sabor/peso/presentación). `ProductImage` se asocia a producto y
  opcionalmente a variante, con `renditions` (JSON: card/detail/original) y soft-delete
  (`deletedAt`).
- **`Order`** — incluye número de pedido, **token de acceso de invitado**, **clave de
  idempotencia**, estado, datos de contacto, método/dirección de entrega, montos
  (subtotal/envío/total) y campos de pago de Mercado Pago (preference id, init points,
  external reference). Relaciona `OrderItem`, `OrderStatusHistory`, `PaymentEvent`,
  `EmailDelivery`.
- **`OrderItem`** — **snapshot** del producto/variante al momento de la compra
  (nombre, slug, SKU, opciones, precio unitario y total de línea). Las refs a producto/
  variante son snapshots, no FKs.
- **`OrderStatusHistory`** — auditoría de transiciones (from/to, razón, actor).
- **`PaymentEvent`** — eventos del webhook con `@@unique([provider, providerEventId])`
  para **idempotencia**.
- **`EmailDelivery`** — estado de envío de emails transaccionales (idempotencia de
  "enviar una vez"), `@@unique` por `orderId + kind` (`buyer_confirmation`,
  `admin_notification`).
- **`StoreSettings`** — fila única `default` para settings operativos, hoy usada para
  `adminNotificationEmail`.

Enums: `ProductArea` (clothing/supplement), `ProductStatus`, `OrderStatus` (9 estados),
`DeliveryMethod`, `PaymentProvider` (mercado_pago), `EmailDeliveryStatus`.

## Máquina de estados del pedido

Estados (`src/domain/rules.ts`): `pending_payment`, `paid`, `payment_failed`, `expired`,
`preparing`, `shipped`, `delivered`, `ready_for_pickup`, `picked_up`.

Transiciones de fulfillment permitidas (post-pago), según método de entrega:

- **Envío:** `paid → preparing → shipped → delivered`
- **Retiro:** `paid → preparing → ready_for_pickup → picked_up`

Estados con pago bloqueado para el admin (`isAdminPaymentLockedOrderStatus`):
`pending_payment`, `payment_failed`, `expired`.

## Flujo de compra (end-to-end)

1. **Catálogo → detalle.** Lectura desde la DB. Disponibilidad por stock de variante:
   `0` = sin stock, `≤3` = últimas unidades, resto = disponible.
2. **Carrito (LocalStorage).** Se guarda un snapshot de precio en el cliente; el servidor
   **revalida** stock y precio contra la DB antes de crear el pedido.
3. **Checkout (invitado).** Formulario de contacto + método de entrega (envío ARS 5.000 /
   retiro ARS 0). Se crea el `Order` en estado `pending_payment` **antes** del redirect a
   Mercado Pago, con clave de idempotencia y token de acceso de invitado.
4. **Mercado Pago.** Se crea una preference y se redirige al checkout de MP. Las páginas de
   retorno (`/checkout/pago/*`) **solo muestran el estado conocido**, no confirman pagos.
5. **Confirmación (server-side).** La fuente de verdad es el **webhook**
   (`/api/mercado-pago/webhook`) con verificación de firma. La reconciliación
   (`payments/payment-reconciliation.ts`) actualiza el pedido a `paid`, registra el
   `PaymentEvent` de forma idempotente y **decrementa el stock** (ver más abajo). El commit
   más reciente también reconcilia al volver el comprador (no solo vía webhook).
6. **Emails de compra pagada.** Tras `paid`, se intenta enviar el email al comprador y el
   aviso interno al admin una sola vez por `kind` (idempotencia vía `EmailDelivery`). El
   destinatario admin se resuelve por DB (`StoreSettings`) y fallback
   `IRRUPTIVO_ADMIN_NOTIFICATION_EMAIL`; si falta, se omite sin romper el flujo.
7. **Estado de pedido.** El invitado consulta `/pedido/[token]` con su token seguro; el
   admin gestiona el fulfillment desde `/admin/(protected)/pedidos`.

## Modelo de stock (importante: sin reserva)

**No existe sistema de reserva/hold de stock.** Esto difiere del plan inicial (que describía
"stock reservado al crear el pedido"). Comportamiento real:

- La validación del carrito chequea el `stock` disponible de la variante.
- El stock se **decrementa una sola vez cuando Mercado Pago aprueba el pago** (en la
  reconciliación), no al crear el pedido.
- No hay liberación de stock reservado en expiración/fallo porque nunca se reservó.

## Expiración de pagos pendientes (lazy / on-read)

Los pedidos `pending_payment` expiran a los 30 minutos pasando a `expired`. **No hay cron.**
La expiración se dispara de forma perezosa cuando se cargan las páginas que leen estado de
pedido (`app/checkout/pago/payment-result-route.tsx`, `app/pedido/[token]/page.tsx`) y
durante la reconciliación de pago (`payments/payment-reconciliation.ts` →
`orders/order-expiration.ts`). Un pago tardío después de expirar no pasa automáticamente a
`paid`: va a revisión manual del admin.

## Media

Imágenes subidas por el admin se procesan con **sharp** generando renditions
(card/detail/original) y se guardan en el filesystem bajo `IRRUPTIVO_MEDIA_ROOT`
(default `/var/lib/irruptivo/media`). En Docker/VPS se montan en el volumen `media_data`
para persistir entre redeploys. Las imágenes se sirven vía `/media/[...path]`. Soft-delete
implementado; backup/cleanup del volumen es tarea humana pendiente.

## Notificaciones por email

`notifications/email-provider.ts` es un **adaptador agnóstico de proveedor**: el resto del
código sólo conoce `sendEmail(EmailMessage)` y un `EmailSendResult` discriminado
(`sent` / `configuration_missing` / `failed`). El proveedor se elige con
`IRRUPTIVO_EMAIL_PROVIDER` y hoy hay tres modos:

- **`local`** — outbox en memoria para dev/demo (default fuera de producción); no envía nada
  real, sólo permite inspección/tests.
- **`http`** — POST genérico a `IRRUPTIVO_EMAIL_PROVIDER_URL` con `Bearer` token. Pensado para
  enchufar cualquier proveedor con un endpoint propio.
- **`resend`** — producción. POST a `https://api.resend.com/emails` con
  `IRRUPTIVO_EMAIL_PROVIDER_TOKEN`; `IRRUPTIVO_EMAIL_PROVIDER_URL` **no** aplica en este modo.

En todos los modos el remitente sale de `IRRUPTIVO_EMAIL_FROM_EMAIL` /
`IRRUPTIVO_EMAIL_FROM_NAME`, y agregar otro proveedor es escribir una nueva función `send*` +
su rama de normalización de config. El estado de cada envío se persiste en `email_deliveries`.
Pendiente para producción: verificar el dominio remitente en Resend (SPF/DKIM), si no los
emails caen en spam o el envío falla.

### Cuándo se envían

Hay **un único momento de negocio** que dispara emails: cuando un pedido pasa de
`pending_payment` a `paid` (pago aprobado por Mercado Pago). En ese instante
`reconcileApprovedPayment` (`payments/payment-reconciliation.ts`) manda **dos** emails en
paralelo (`sendPaidOrderEmailsSafely`, un `Promise.all`):

- **`buyer_confirmation`** → confirmación de compra al comprador (`sendOrderConfirmationOnce`).
- **`admin_notification`** → aviso interno al admin (`sendAdminOrderNotificationOnce`), **sólo
  si hay destinatario**: `StoreSettings.adminNotificationEmail` (panel `/admin/configuracion`)
  con fallback a `IRRUPTIVO_ADMIN_NOTIFICATION_EMAIL`; si no hay ninguno, se omite sin romper el flujo.

Ese paso a `paid` se reconcilia desde **dos entrypoints**, y cualquiera de los dos puede
gatillar los emails:

1. **Webhook de Mercado Pago** (`reconcileMercadoPagoEvent`) — fuente de verdad.
2. **Retorno del comprador** a `/checkout/pago/*` (`reconcileMercadoPagoPaymentById`) — cubre el
   caso de que el webhook todavía no haya llegado.

Garantías:

- **Una sola vez por `kind`**, aunque webhook y retorno reconcilien el mismo pedido:
  idempotencia por `EmailDelivery` con `@@unique(orderId, kind)`.
- **Sólo en la transición real a `paid`** (cuando `markOrderPaidAndDecrementStock` devuelve
  `paid`). Si el pedido ya estaba reconciliado (`duplicate` / `already_reconciled`) o `expired`,
  no se reenvía nada.
- **No bloquean el flujo:** los envíos van "safe"; un fallo no afecta la reconciliación a `paid`
  ni el decremento de stock, y el email del admin no bloquea al del comprador.

No se envían emails al crear el pedido, al expirar (30 min), en pago fallido, ni en las
transiciones de fulfillment posteriores (`preparing` → `shipped`/`ready_for_pickup` →
`delivered`/`picked_up`); esos avisos de envío/retiro están fuera del alcance del MVP.

## Deploy

- **Docker / docker-compose:** servicios `postgres`, `migrate` (corre `prisma migrate deploy`
  una vez y termina) y `app` (Next), con volúmenes `postgres_data` y `media_data` (media
  persistente). Nginx delante, planeado.
- Target: **VPS** (no serverless), porque la media vive en filesystem persistente.
- Variables de entorno (`.env.example`): `IRRUPTIVO_APP_URL`, `DATABASE_URL` (+ `POSTGRES_*`),
  `NEXT_PUBLIC_WHATSAPP_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `ADMIN_USERNAME` / `ADMIN_PASSWORD`
  / `ADMIN_SESSION_SECRET`, `MERCADO_PAGO_ACCESS_TOKEN` / `MERCADO_PAGO_WEBHOOK_SECRET`,
  `IRRUPTIVO_MEDIA_ROOT`, y las de email (`IRRUPTIVO_EMAIL_*`, ver arriba). Para producción
  faltan, además, las credenciales live de Mercado Pago y la verificación del dominio
  remitente en Resend.

## Testing

Tests con **Vitest** (`*.test.ts`), concentrados en la lógica de negocio: reglas de
dominio, carrito, checkout, validación de stock, transiciones de pedido, reconciliación de
pago e idempotencia del webhook. No se sobre-testean componentes visuales.
