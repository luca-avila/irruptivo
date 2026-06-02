# Arquitectura — el sistema como está construido

> Describe Irruptivo **tal como está implementado hoy**, no como se planeó originalmente.
> Donde el plan inicial difiere de la realidad (notablemente: reserva de stock), gana este
> documento. Para el "por qué" de las decisiones ver [`decisions.md`](./decisions.md); para
> el trabajo restante a producción ver [`hitl-checklist.md`](./hitl-checklist.md).

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
(`tsc --noEmit`); `postinstall` corre `prisma generate`; seed vía `prisma/seed.ts` (tsx).

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
| `notifications/` | Email de confirmación de pedido y adaptador de proveedor de email (con outbox local de dev). |
| `admin/` | Auth/sesión de admin, gestión de productos/variantes/imágenes, cola y detalle de pedidos, transiciones de fulfillment, edición de contacto/fulfillment. |
| `storefront/` | Homepage, navegación, páginas de confianza (trust), y `components/` (UI compartida del storefront). |
| `media/` | Resolución y servido de media de producto desde el filesystem. |
| `db/client.ts` | Singleton del cliente Prisma. |

### `app/` — rutas (App Router)

- **Storefront:** `/` (home), `/coleccion/[slug]` (ropa), `/suplementos/[slug]`,
  `/buscar`, `/carrito`, `/checkout` y `/checkout/pago/*` (éxito, fallo, pendiente,
  vencido, estado), `/pedido/[token]` (estado de pedido de invitado), `/nosotros`,
  `/envios-y-cambios` (trust pages).
- **Admin:** `/admin/login` + grupo protegido `/admin/(protected)/` con `productos`
  (lista, nuevo, `[id]/editar`) y `pedidos` (cola, `[id]`).
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
- **`EmailDelivery`** — estado de envío del email de confirmación (idempotencia de
  "enviar una vez"), `@@unique` por `orderId`.

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
6. **Email de confirmación.** Tras `paid`, se envía un email de confirmación una sola vez
   (idempotencia vía `EmailDelivery`).
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

`notifications/email-provider.ts` es un adaptador agnóstico con **outbox local** para
dev/demo, un modo HTTP genérico y un modo de producción `resend`. Resend usa
`https://api.resend.com/emails` con `IRRUPTIVO_EMAIL_PROVIDER_TOKEN` y el remitente
`IRRUPTIVO_EMAIL_FROM_EMAIL` / `IRRUPTIVO_EMAIL_FROM_NAME`; `IRRUPTIVO_EMAIL_PROVIDER_URL`
sólo aplica al modo `http`. El estado de envío se persiste en `email_deliveries`.
Pendiente para producción: verificar el dominio remitente en Resend (SPF/DKIM) — ver
[`hitl-checklist.md`](./hitl-checklist.md).

## Deploy

- **Docker / docker-compose:** servicios `app` (Next) + Postgres + volumen `media_data`
  para media persistente (Nginx delante, planeado).
- Target: **VPS** (no serverless), porque la media vive en filesystem persistente.
- Variables de entorno (`.env.example`): `IRRUPTIVO_APP_URL`, `DATABASE_URL` (+ `POSTGRES_*`),
  `NEXT_PUBLIC_WHATSAPP_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `ADMIN_USERNAME` / `ADMIN_PASSWORD`
  / `ADMIN_SESSION_SECRET`, `MERCADO_PAGO_ACCESS_TOKEN` / `MERCADO_PAGO_WEBHOOK_SECRET`,
  `IRRUPTIVO_MEDIA_ROOT`. La configuración para producción se documenta en
  [`hitl-checklist.md`](./hitl-checklist.md).

## Testing

Tests con **Vitest** (`*.test.ts`), concentrados en la lógica de negocio: reglas de
dominio, carrito, checkout, validación de stock, transiciones de pedido, reconciliación de
pago e idempotencia del webhook. No se sobre-testean componentes visuales.
