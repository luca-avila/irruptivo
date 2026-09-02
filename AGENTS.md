# AGENTS.md

Guía para agentes de código (Codex, Claude Code, ZCode, etc.): qué es el proyecto, cómo
montarlo, cómo trabajarlo y mapa de navegación de la codebase.
`CLAUDE.md` es un symlink a este archivo, así ambas herramientas lo auto-cargan.

Para el **porqué** del producto y las
decisiones, ver `docs/` (en especial `docs/product.md`, `docs/architecture.md`,
`docs/decisions.md`). Las **convenciones** de código/UX/copy están en `docs/agent-rules.md`.

## Qué es

Ecommerce fullstack de la marca Irruptivo (ropa + suplementos). Next.js 16 (App Router) ·
React 19 · TypeScript · PostgreSQL + Prisma 6 · Zod 4 · Tailwind 4 · sharp · Mercado Pago ·
Vitest. Deploy en VPS vía Docker. Node 20 y PostgreSQL 16.

## Configuración del entorno

```bash
cp .env.example .env            # cada variable está documentada en el propio ejemplo
docker compose up -d postgres   # solo la DB local (el resto de los servicios es para prod)
npm install                     # instala deps y corre `prisma generate` (postinstall)
npx prisma migrate dev          # migraciones a la DB local
npx prisma db seed              # datos de demo (prisma/seed.ts)
```

- El CLI de Prisma lee `.env`, **no** `.env.local` — `DATABASE_URL` va en `.env`.
- `DATABASE_URL` apunta al host (`localhost:5432`); `docker-compose.yml` la reconstruye
  in-network con `POSTGRES_*` para los contenedores. No mezclar.
- Para media en local, setear `IRRUPTIVO_MEDIA_ROOT=./.media` (el default
  `/var/lib/irruptivo/media` suele no ser escribible).
- Sin credenciales de Mercado Pago ni email funciona igual: el provider de email default
  es `local` (outbox de dev/tests, ver `src/notifications/email-provider.ts`).

## Comandos

```bash
npm run dev         # servidor de desarrollo
npm test            # tests (vitest run)
npm run typecheck   # tsc --noEmit
npm run build       # next build
```

## Testing

- Vitest, sin watch (`npm test`). Tests colocalados junto al código: `src/**/*.test.ts`
  (los de integración, `*.integration.test.ts`). Corren en serie (`fileParallelism: false`).
- **Muchos tests usan la DB real vía Prisma**: sin PostgreSQL corriendo y migrada, la suite
  no pasa (CI levanta un `postgres:16` efímero y corre `prisma migrate deploy` antes).
- Un solo archivo: `npx vitest run src/cart/cart.test.ts`. Un test puntual:
  `npx vitest run -t "nombre del test"`.
- **TDD-first** para: carrito, validación de checkout, validación de stock, transiciones de
  pedido, reconciliación de pago, idempotencia del webhook. No sobre-testear lo visual.
- No hay cobertura configurada ni linter: `npm run typecheck` es el gate estático.

## CI / Build / Deploy

- **CI** (`.github/workflows/ci.yml`, en PRs y push a `main`): `prisma migrate deploy`
  sobre un servicio `postgres:16` efímero → `npm run typecheck` → `npm test` →
  `npm run build`. Todo verde antes de mergear.
- **Deploy** (`.github/workflows/deploy.yml`): en push a `main` se buildean dos imágenes
  Docker multi-stage (`Dockerfile`, targets `deps` y `runner`) y se publican en `ghcr.io`.
- El VPS no buildea: `docker compose -f docker-compose.prod.yml pull && up -d`. La imagen
  `-migrate` corre `npx prisma migrate deploy` (one-shot) y la app arranca recién después.
- `NEXT_PUBLIC_WHATSAPP_URL` / `NEXT_PUBLIC_INSTAGRAM_URL` son build-args: se hornean en
  el build del deploy, no en runtime.

## PRs y commits

- Correr `npm run typecheck` y `npm test` antes de subir; CI requiere typecheck + test +
  build en verde.
- Commits: una línea, imperativo, en inglés (ej.: "Unify email validation and move
  boundary parsing to Zod").

## Reglas de trabajo (resumen — ver `docs/agent-rules.md`)

- **Vertical slices**, módulos profundos para la lógica de negocio, UI "tonta" cuando se
  pueda. Evitar abstracciones prematuras y archivos gigantes.
- **Server Actions** sobre API routes innecesarias. **Zod** para validación.
- Todo el copy customer-facing y admin en **español de Argentina (`es-AR`)**. Nunca renderizar
  valores internos de enum/estado (`pending_payment`, `paid`, ...) — mapearlos por los helpers
  de label de `src/domain/rules.ts`.
- Identificadores, enums, rutas, tests y símbolos de código en inglés.
- Solo implementar lo pedido: no refactorear sistemas no relacionados ni adelantar features.

## Mapa del código

### Núcleo de dominio

- `src/domain/rules.ts` — **kernel de reglas.** Estados de pedido (`ORDER_STATUS`),
  transiciones de fulfillment (`getAllowedFulfillmentTransitions`), costos de envío,
  cálculo de precio/subtotal/total, labels `es-AR` de estado y disponibilidad. **Empezá acá**
  para cualquier invariante de negocio.
- `src/db/client.ts` — singleton del cliente Prisma (`prisma`).
- `prisma/schema.prisma` — modelo de datos (Product/Variant/Image, Order/Item/StatusHistory,
  PaymentPreference, PaymentEvent, EmailDelivery).

### `src/shared/` — utilidades transversales

Helpers compartidos extraídos de duplicación. Reutilizar acá antes de re-implementar.

- `date-utils.ts` — `getDate` (coacciona `Date | string` validando, lanza si es inválida).
- `string-utils.ts` — `normalizeText`/`normalizeNullableText`/`normalizeOptionalText`,
  `slugify`, `assertNonEmptyString`.
- `url-utils.ts` — `normalizeAbsoluteUrlOrigin`, `normalizeAbsoluteUrlHref`.
- `prisma-utils.ts` — `isPrismaKnownError`, `isUniqueConstraintError`, `isRecordNotFoundError`.
- `form-utils.ts` — `readStringField` (lee un campo string de `FormData`).
- `id-utils.ts` — `generateUniqueId` (loop de sufijo-contador para ids/slugs únicos).

### `src/catalog/` — lectura de catálogo

- `catalog.ts` — tipos y vistas públicas + queries: `listActiveProducts(ByArea)`,
  `searchActiveProductsByName`, `getPublicProductBySlug`, `getProductCardView/DetailView`.
- `product-repository.ts` — `loadCatalogProducts` (lee de la DB).
- `product-detail.ts` — `getProductDetailPageView`, `resolveSelectedVariant`.
- `supplements.ts` — `listSupplementProducts` (listado + filtros de suplementos derivados
  del `supplementType` administrado).
- `variants.ts` — create/update de variantes, `getVariantAvailability`.
- `stock.ts` — `getAvailableStock`, `setVariantStock`.
- `product-images.ts` — upload/reorder/soft-delete, edición de asociación de imagen
  (`updateProductImageAssociation`) + `getPublicImageSet`/`getVariantAwarePublicImageSet`.
- `demo-catalog-data.ts` — fixture de seed/test (`demoCatalogProducts`), **no** fallback runtime.

### `src/cart/` — carrito (LocalStorage)

- `cart.ts` — modelo y operaciones puras: `addItem`, `updateQuantity`, `getCartSummary`,
  `serializeCart`/`hydrateCart`, snapshot de precio (`CART_PRICE_SNAPSHOT_WINDOW_MS`).
- `add-to-cart-validation.ts` — `validateAddToCartSelection`.
- `cart-validation.ts` — `validateCart`, `refreshExpiredPriceSnapshot`, `classifyCartIssue`.
- `actions.ts` — server actions: `validateAddToCartAction`, `refreshCartReviewAction`.

### `src/checkout/` — checkout

- `checkout.ts` — `validateCheckoutInput`, `buildCheckoutSummary`.
- `payment-handoff.ts` — `createCheckoutPaymentHandoff`.
- `actions.ts` — server actions: `validateCheckoutAction`, `createPendingOrderAction`.

### `src/orders/` — pedidos

- `order-creation.ts` — `createPendingOrderFromCheckout` (crea el pedido `pending_payment`).
- `order-store.ts` — persistencia de pedidos (Prisma): create/read/update, lookups por id y
  por retorno de pago.
- `order-expiration.ts` — `expirePendingPaymentOrders` (expira a los 30 min, **lazy/on-read**).
- `order-delivery.ts` — `getDeliverySummary` (resumen `es-AR` del envío/retiro de un pedido).
- `guest-access-token.ts` — `createGuestOrderAccessToken`.
- `guest-order-status.ts` — `getGuestOrderStatusByToken`, `getGuestOrderStatusView` (proyección
  `es-AR` para `/pedido/[token]`).

### `src/payments/` — Mercado Pago

- `payment-preference.ts` — `createPaymentPreferenceForOrder` / `createMercadoPagoPreference`;
  la preference de MP vence 5 min antes que la orden interna.
- `mercado-pago-webhook.ts` — parseo + verificación de firma + fetch del pago.
- `payment-reconciliation.ts` — **fuente de verdad del pago**: `reconcileMercadoPagoEvent`,
  `reconcileMercadoPagoPaymentById` (pasa a `paid`, decrementa stock, dispara email).
- `payment-events.ts` — idempotencia de eventos (`recordPaymentEventOnce`) + revisión manual.
- `payment-result.ts` — `getPaymentResultView` (estado para las páginas de retorno).

### `src/notifications/` — email

- `email-provider.ts` — adaptador de email transaccional (`sendEmail`). Modos según
  `IRRUPTIVO_EMAIL_PROVIDER`: `local` (outbox de dev/tests) y `resend` (producción,
  `https://api.resend.com/emails`).
- `email-helpers.ts` — `escapeHtml` (escape de HTML para cuerpos de email) y `sendEmailSafely`
  (envío que captura errores en vez de propagarlos).
- `order-confirmation-email.ts` — `sendOrderConfirmationOnce` (idempotente vía `EmailDelivery`),
  `buildOrderConfirmationEmailMessage`.
- `admin-order-notification-email.ts` — `sendAdminOrderNotificationOnce` (aviso interno al
  admin del pedido pagado), `buildAdminOrderNotificationEmailMessage`.
- `fulfillment-update-email.ts` — `sendFulfillmentUpdateOnce` (aviso al comprador en `shipped`/
  `ready_for_pickup`, idempotente vía `EmailDelivery`), `buildFulfillmentUpdateEmailMessage`,
  `isFulfillmentUpdateEmailStatus`, `getFulfillmentUpdateEmailDeliveryKind`.

### `src/admin/` — panel de admin

- `session.ts` — config/sesión/cookies de admin; `getAdminRouteAccess` (usado por `proxy.ts`).
- `auth.ts` — `getCurrentAdmin`, `requireAdmin`. `actions.ts` — `loginAdmin`/`logoutAdmin`.
- `products.ts` + `product-actions.ts` — gestión de productos/variantes (CRUD, publicación,
  borrado permanente vía `deleteAdminProduct`/`deleteAdminProductRecord`, carga y asociación
  de imágenes).
- `product-search.ts` — búsqueda instantánea por nombre dentro de la lista admin ya filtrada.
- `product-image-processing.ts` — procesa uploads con sharp (renditions); borra el directorio
  de media del producto en hard delete (`deleteProductMediaDirectory`).
- `product-image-upload-limits.ts` — `MAX_IMAGE_UPLOAD_BATCH` (carga de imágenes por lote).
- `orders.ts` — vistas de cola y detalle de pedidos (`listAdminOrders`, `getAdminOrderDetail`).
- `order-transitions.ts` + `order-actions.ts` — transiciones de fulfillment (disparan el email
  de fulfillment al comprador; `resendFulfillmentUpdateEmail` lo reenvía manualmente).
- `order-fulfillment-edits.ts` + `order-fulfillment-edit-actions.ts` — edición de contacto/envío.
- `settings.ts` (`getStoreSettings`, `setAdminNotificationEmail`, `getAdminNotificationRecipient`)
  + `settings-actions.ts` + `settings-validation.ts` — `StoreSettings` de la tienda
  (hoy: email de aviso al admin), editable desde `/admin/(protected)/configuracion`.

### `src/storefront/` — UI y navegación del storefront

- `navigation.ts` — rutas del menú, links de contacto/Instagram, `CART_STORAGE_KEY`.
- `homepage.ts` — `getHomepageFeaturedProducts`. `trust-pages.ts` — contenido de `/nosotros` y
  `/envios-y-cambios`.
- `components/` — UI compartida: `product-detail-page`, `cart-page`, `checkout-page`,
  `payment-result-page`, `guest-order-status-page`, `add-to-cart-control`, `storefront-header`.

### `src/media/`

- `product-media.ts` — resuelve y sirve media desde `IRRUPTIVO_MEDIA_ROOT` (`/media/[...path]`).

### `app/` — rutas (App Router)

- **Storefront:** `/` · `/coleccion` + `/coleccion/[slug]` (ropa) · `/suplementos` +
  `/suplementos/[slug]` · `/buscar` · `/carrito` · `/checkout` +
  `/checkout/pago/{exito,fallo,pendiente,vencido,estado}` · `/pedido` (fallback sin token) +
  `/pedido/[token]` · `/nosotros` · `/envios-y-cambios`.
- **Admin:** `/admin/login` + `/admin/(protected)/{,productos,pedidos,configuracion}`
  (dashboard + secciones; protegido por `proxy.ts`).
- **API:** `app/api/mercado-pago/webhook/route.ts` (POST) — único route handler externo.
- **Media:** `app/media/[...path]/route.ts` (GET).
- `proxy.ts` (raíz) — middleware que protege `/admin/:path*`.

## Notas que ahorran tiempo

- **No hay reserva de stock.** El stock se decrementa al confirmarse el pago, no al crear el
  pedido. Ver `docs/architecture.md` → "Modelo de stock".
- **Mercado Pago cierra antes que la orden interna.** La orden expira a los 30 min, pero la
  preference de MP vence 5 min antes (ventana efectiva: 25 min) para evitar pagos tardíos
  contra pedidos ya vencidos.
- **La expiración es lazy/on-read** (no hay cron): se dispara al cargar páginas de estado de
  pago/pedido y en la reconciliación.
- **El pago se confirma server-side** vía webhook + reconciliación; las páginas de retorno solo
  muestran estado conocido.
- **Asociación de imágenes:** en Colección se asocia por color visual (`associatedColor`),
  ignorando talle; en Suplementos se asocia por variante/SKU (`variantId`). El admin puede
  cambiar o limpiar esa asociación después de subir la imagen.
- Los `OrderItem` son **snapshots** (no FKs a producto/variante).
