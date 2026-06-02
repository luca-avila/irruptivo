# Persistence Migration Checklist

> Source: persistence migration plan for `mvp-complete-v0`. Target: full VPS deployment
> (Next + PostgreSQL via Docker + persistent media volume + Nginx later).
> Stack per `docs/agent-rules.md`: Next.js, TypeScript, PostgreSQL, Prisma, Zod, Vitest.
> **This is a planning/checklist doc. Implement one phase per slice, on request.**

## Goal

- Replace in-memory / module-level persistence with PostgreSQL + Prisma.
- Prepare the app for a full VPS deployment (no serverless assumptions).
- Preserve current MVP behavior exactly — storefront, admin, checkout, webhook, email.

## Completed Outcome

- **Runtime source of truth:** PostgreSQL + Prisma back product catalog/admin edits,
  product image metadata, orders, payment events, and email delivery records.
- **Seed/test data only:** `demoCatalogProducts` lives in a seed/test fixture module and
  is not a runtime fallback. Runtime storefront/admin reads load catalog data from the DB.
- **Stock model:** there is no reservation/hold system. Cart validation checks available
  `variant.stock`; stock decrements once when a Mercado Pago payment is approved.
- **Intentional in-memory exception:** `src/notifications/email-provider.ts` keeps a
  local dev/demo email outbox for the local provider. Production send-once state is
  stored in `email_deliveries`.
- **Restart behavior:** business state survives cold restart when PostgreSQL and the
  configured media volume persist.

## Migration Rules (for every agent slice)

- **One slice at a time.** Do not start the next phase in the same change.
- **Tests first where possible** (TDD for stock, checkout, order transitions, webhook
  idempotency — per `docs/agent-rules.md`).
- **No broad refactors.** Keep pure domain functions untouched; swap only repository
  seams and data sources.
- **Preserve behavior.** Same routes, same UX, same Spanish (`es-AR`) copy, same enums.
- **Keep demo/seed data only where explicitly intended** (seed script), never as runtime state.
- After every slice run: `npm test` · `npm run typecheck` · `npm run build` · `git diff --check`.
- **Commit after every completed slice** (only when the user asks to commit).

---

## Phase 1 — Prisma / Database Foundation

- [x] Install deps: `prisma`, `@prisma/client`.
- [x] Add `prisma/schema.prisma` (datasource + generator + draft models below).
- [x] Add `DATABASE_URL` to `.env.example` (documented, with a local Docker default).
- [x] Add `docker-compose.yml` Postgres service for local + VPS.
- [x] Add DB client singleton `src/db/client.ts` (guard against dev hot-reload duplicates).
- [x] Generate the initial migration against a local container.
- [x] Checks: `typecheck` + `build` green; migration applies on a clean DB.
- **Done when:** Prisma connects, the initial migration applies cleanly, no app behavior
  changes, existing `npm test` still passes.

## Phase 2 — Catalog Read Model

- [x] Add `prisma/seed.ts` deriving rows from current `demoCatalogProducts` (preserve ids/slugs).
- [x] Add `src/catalog/product-repository.ts` (async loaders returning `CatalogProductRecord[]`).
- [x] Move storefront read entry points to the repository: `app/coleccion/*`, `app/suplementos/*`,
      `app/buscar/page.tsx`, `src/cart/actions.ts`, `src/checkout/actions.ts`.
- [x] Keep pure functions in `catalog.ts` / `supplements.ts` / `product-detail.ts` (still take a
      `products` param — just feed DB data in).
- [x] Preserve public route behavior (listing/detail/search render identically).
- [x] Tests: keep pure unit tests; add repository integration tests (slug uniqueness, active
      filter, area filter, search, image/rendition mapping fidelity).
- **Done when:** storefront renders from Postgres with no visual change; seed produces the
  three demo products with matching ids/slugs/variants/stock/images.

## Phase 3 — Admin Product Writes

- [x] Back `readAdminProductRecords` / `saveAdminProductRecords` (or replace) with targeted
      Prisma writes in `src/admin/products.ts`.
- [x] Persist create / edit / publish-status / variant operations (`src/admin/product-actions.ts`).
- [x] Persist product variants with per-product case-insensitive SKU uniqueness (DB unique index).
- [x] Persist product metadata (area, subcategory/type, base price, status).
- [x] Preserve admin UX: redirects, `revalidatePath`, error codes, "publish needs a variant" rule.
- [x] Tests: keep pure validators; add integration tests for create→activate, duplicate-SKU
      rejection, update flows.
- **Done when:** admin create/edit/publish/variant changes persist across restart and appear on
  the storefront; invariants enforced by DB + service.

## Phase 4 — Product Images / Media Metadata

- [x] Persist image metadata (alt, sortOrder, dimensions, associatedColor, variantId, renditions,
      `deletedAt`) in DB (`product_images`).
- [x] Keep media **binaries** on the VPS filesystem (`src/admin/product-image-processing.ts`,
      `src/media/product-media.ts`) — do not move files into the DB.
- [x] Preserve compensating cleanup: persist metadata only after file write succeeds; delete files
      on metadata failure.
- [x] Ensure `IRRUPTIVO_MEDIA_ROOT` is documented in `.env.example` (writable persistent volume).
- [x] Declare `sharp` in `package.json` dependencies.
- [x] Tests: keep pure tests; add integration tests for upload (metadata + file), reorder
      (`sort_order`), soft-delete (`deleted_at`).
- **Done when:** image metadata persists in DB, files persist on disk, upload/reorder/delete
  survive restart, `sharp` is a declared dependency.

## Phase 5 — Remove Stock Reservations

> **Decision (2026-06-01):** the stock-reservation/hold system is being removed. It added
> hold/release/expiry complexity we do not want for the MVP. Replacement model:
> availability = raw `variant.stock`; cart validation already caps quantities to it; **stock is
> decremented when a payment is approved** (see Phase 7). No holds, no release, no expiry-driven
> stock changes. Overselling under rare concurrent races is accepted for the MVP.
>
> Run this **before** Phase 6 (Orders) — it is a pure-code refactor (+ one schema migration) and
> leaves Phase 6 with a much smaller transaction.

- [x] Delete `src/orders/stock-reservation.ts` and `src/orders/stock-reservation.test.ts`.
- [x] `src/orders/order-creation.ts`: drop the `reserveStockForOrder` call, the `existingReservations`
      input, the `reservations` field on the `created` result, the `stock_unavailable` result variant,
      the `getReservableVariants` helper, and `STOCK_RESERVATION_ERROR_MESSAGE`. Keep all cart/checkout
      validation and totals math byte-for-byte — `validateCart` remains the stock gate.
- [x] `src/orders/order-store.ts`: remove the `stockReservations` array, the `reservations` field on
      `OrderStoreSnapshot` and on the creation result, and `releaseReservedStockForOrderInStore`.
- [x] `src/payments/payment-reconciliation.ts`: drop `releaseReservedStockForOrder` from the
      repository interface + default impl, the release call in `reconcileFailedPayment`, and
      `releasedReservationCount` from the `payment_failed` result.
- [x] `src/orders/order-expiration.ts`: drop `releaseReservedStockForOrder` from the repository +
      default impl, the release call, and `releasedReservationCount` / `releaseStatus` from
      `ExpiredPendingPaymentOrder`.
- [x] `src/checkout/payment-handoff.ts`: remove the now-unreachable `stock_unavailable` branch.
- [x] Drop the `StockReservation` Prisma model + its relations on `Order` and `ProductVariant`;
      generate a migration that drops the `stock_reservations` table.
- [x] Tests: delete the reservation math tests; update `order-creation`, `order-store`,
      `payment-reconciliation`, `payment-reconciliation-expiration`, `payment-result`,
      `payment-handoff`, and `order-expiration` tests to drop reservation mocks/assertions. No other
      asserted behavior changes.
- **Done when:** `grep -ri reservation src` is empty, the four standard checks pass, and checkout /
  payment-failure / expiration behave as before minus the (now nonexistent) reservation bookkeeping.

## Phase 6 — Orders

- [x] Persist orders (`orders`) with status, order number, guest token, idempotency key, totals.
- [x] Persist order items (`order_items`) as immutable price/name/SKU snapshots (snapshot refs,
      not FKs to products).
- [x] Persist customer contact, delivery snapshot, and payment-preference fields.
- [x] Rewrite `src/orders/order-store.ts` functions against Prisma (become `async`); await in
      callers: `payment-handoff.ts`, `payment-result-route.tsx`, `admin/orders.ts`,
      `admin/order-fulfillment-edits.ts`, `admin/order-transitions.ts`.
- [x] Order creation in one `prisma.$transaction` (order row + items + initial status-history);
      idempotency via `UNIQUE(idempotency_key)` (on-conflict returns existing order,
      `isDuplicate: true`). No reservation rows (removed in Phase 5).
- [x] Add `order_status_history` row on creation (`checkout_created`); do **not** persist
      `updatedCart` (return it without storing).
- [x] Preserve checkout behavior + guest status lookup by token.
- [x] Tests: keep pure tests; add integration tests for idempotency dedup, guest-token lookup,
      status update + history append.
- **Done when:** placing an order survives restart, admin queue + guest status read it,
  idempotency dedup works against the DB.

## Phase 7 — Payment Events / Webhook Idempotency

- [x] Persist Mercado Pago events (`payment_events`).
- [x] Idempotency via `UNIQUE(provider, provider_event_id)` (on-conflict = `duplicate`).
- [x] Persist payment-driven status transitions (paid / payment_failed / manual_review) inside a
      transaction (event record + order status together).
- [x] **Decrement stock on paid:** in the paid transaction, `variant.stock -= quantity` for each
      order item (replaces the removed reservation hold; payment_failed / expired do nothing).
      Decrement against the order-item snapshot quantities; do not go below zero.
- [x] Keep `app/api/mercado-pago/webhook/route.ts` behavior unchanged (signature verify, responses).
- [x] Preserve manual-review state surfaced in admin order detail.
- [x] Tests: keep pure reconciliation tests; add integration tests for redelivered-event dedup,
      paid/failed transitions, manual-review flag, and stock-decrement-once-on-paid.
- **Done when:** replaying a webhook is a no-op after restart; status transitions + manual-review
  persist; a paid order decrements variant stock exactly once.

## Phase 8 — Email Delivery Records

- [x] Persist email delivery records (`email_deliveries`).
- [x] Preserve send-once via `UNIQUE(order_id)` (insert-once dedup).
- [x] Keep the provider-agnostic adapter (`src/notifications/email-provider.ts`) unchanged.
- [x] Keep the local outbox only for dev/demo (not as production state).
- [x] Tests: keep pure tests; add integration test for send-once across retry/restart.
- **Done when:** confirmation email sends exactly once across restarts; delivery status persists.

## Phase 9 — Cleanup In-Memory Stores

- [x] Remove module-level arrays: catalog `demoCatalogProducts` runtime default, `order-store.ts`,
      `payment-events.ts`, `order-confirmation-email.ts`.
- [x] Remove the `mutableDemoCatalogProducts` cast + whole-array read/save in `src/admin/products.ts`.
- [x] Repoint or remove `reset*ForTests` helpers at a DB-truncate test utility; keep seed/dev-only
      utilities clearly marked.
- [x] Update docs (`hitl-checklist.md` persistence item, this checklist, `.env.example`).
- [x] Run full checks.
- **Done when:** `grep` finds no runtime module-level business-data arrays; app runs entirely on
  Postgres; cold restart preserves all state.

---

## Proposed Prisma Model Draft

> **DRAFT — review invariants before committing the schema. Do not write this file in a planning slice.**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ProductArea { clothing supplement }
enum ProductStatus { active inactive }
enum OrderStatus {
  pending_payment paid payment_failed expired
  preparing shipped delivered ready_for_pickup picked_up
}
enum DeliveryMethod { shipping pickup }
enum PaymentProvider { mercado_pago }
enum EmailDeliveryStatus { sending sent configuration_missing failed }

model Product {
  id                  String        @id
  slug                String        @unique
  name                String
  description         String
  area                ProductArea
  status              ProductStatus @default(inactive)
  basePriceArs        Int           @map("base_price_ars")
  clothingSubcategory String?       @map("clothing_subcategory")
  supplementType      String?       @map("supplement_type")
  createdAt           DateTime      @default(now()) @map("created_at")
  updatedAt           DateTime      @updatedAt @map("updated_at")
  variants            ProductVariant[]
  images              ProductImage[]
  @@index([status, area])
  @@map("products")
}

model ProductVariant {
  id                 String   @id
  productId          String   @map("product_id")
  sku                String
  skuNormalized      String   @map("sku_normalized")
  name               String
  stock              Int
  priceOverrideArs   Int?     @map("price_override_ars")
  optionColor        String?  @map("option_color")
  optionSize         String?  @map("option_size")
  optionFlavor       String?  @map("option_flavor")
  optionWeight       String?  @map("option_weight")
  optionPresentation String?  @map("option_presentation")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  product            Product            @relation(fields: [productId], references: [id], onDelete: Cascade)
  images             ProductImage[]
  @@unique([productId, skuNormalized])
  @@index([productId])
  @@map("product_variants")
}

model ProductImage {
  id              String    @id
  productId       String    @map("product_id")
  alt             String
  sortOrder       Int       @map("sort_order")
  width           Int?
  height          Int?
  associatedColor String?   @map("associated_color")
  variantId       String?   @map("variant_id")
  renditions      Json      // { card, detail, original }
  deletedAt       DateTime? @map("deleted_at")
  product         Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  variant         ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  @@index([productId, sortOrder])
  @@map("product_images")
}

model Order {
  id                       String           @id
  orderNumber              String           @unique @map("order_number")
  guestAccessToken         String           @unique @map("guest_access_token")
  idempotencyKey           String           @unique @map("idempotency_key")
  status                   OrderStatus
  createdAt                DateTime          @map("created_at")
  contactFullName          String           @map("contact_full_name")
  contactEmail             String           @map("contact_email")
  contactPhone             String           @map("contact_phone")
  deliveryMethod           DeliveryMethod   @map("delivery_method")
  deliveryMethodLabel      String           @map("delivery_method_label")
  deliveryNotes            String?          @map("delivery_notes")
  shipAddressLine          String?          @map("ship_address_line")
  shipCity                 String?          @map("ship_city")
  shipProvince             String?          @map("ship_province")
  shipPostalCode           String?          @map("ship_postal_code")
  adminNotes               String?          @map("admin_notes")
  subtotalArs              Int              @map("subtotal_ars")
  deliveryCostArs          Int              @map("delivery_cost_ars")
  totalArs                 Int              @map("total_ars")
  paymentProvider          PaymentProvider? @map("payment_provider")
  paymentPreferenceId      String?          @map("payment_preference_id")
  paymentCheckoutUrl       String?          @map("payment_checkout_url")
  paymentInitPoint         String?          @map("payment_init_point")
  paymentSandboxInitPoint  String?          @map("payment_sandbox_init_point")
  paymentExternalReference String?          @map("payment_external_reference")
  paymentCreatedAt         DateTime?        @map("payment_created_at")
  items                    OrderItem[]
  statusHistory            OrderStatusHistory[]
  paymentEvents            PaymentEvent[]
  emailDelivery            EmailDelivery?
  @@index([status, createdAt])
  @@map("orders")
}

model OrderItem {
  id                 String      @id @default(uuid())
  orderId            String      @map("order_id")
  productId          String      @map("product_id")   // snapshot ref, not FK
  productName        String      @map("product_name")
  productSlug        String      @map("product_slug")
  productArea        ProductArea @map("product_area")
  variantId          String      @map("variant_id")   // snapshot ref, not FK
  variantName        String      @map("variant_name")
  sku                String
  optionColor        String?     @map("option_color")
  optionSize         String?     @map("option_size")
  optionFlavor       String?     @map("option_flavor")
  optionWeight       String?     @map("option_weight")
  optionPresentation String?     @map("option_presentation")
  optionSummary      String      @map("option_summary")
  quantity           Int
  unitPriceArs       Int         @map("unit_price_ars")
  lineTotalArs       Int         @map("line_total_ars")
  order              Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  @@index([orderId])
  @@map("order_items")
}

model OrderStatusHistory {
  id         String       @id @default(uuid())
  orderId    String       @map("order_id")
  fromStatus OrderStatus? @map("from_status")
  toStatus   OrderStatus  @map("to_status")
  reason     String
  actor      String
  createdAt  DateTime     @default(now()) @map("created_at")
  order      Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  @@index([orderId, createdAt])
  @@map("order_status_history")
}

model PaymentEvent {
  id                String          @id @default(uuid())
  provider          PaymentProvider
  providerEventId   String          @map("provider_event_id")
  providerPaymentId String          @map("provider_payment_id")
  orderId           String?         @map("order_id")
  type              String
  action            String
  providerStatus    String?         @map("provider_status")
  processingResult  String          @map("processing_result")
  receivedAt        DateTime        @map("received_at")
  order             Order?          @relation(fields: [orderId], references: [id], onDelete: SetNull)
  @@unique([provider, providerEventId])
  @@index([orderId, processingResult])
  @@map("payment_events")
}

model EmailDelivery {
  id                String              @id @default(uuid())
  orderId           String              @unique @map("order_id")
  recipientEmail    String              @map("recipient_email")
  status            EmailDeliveryStatus
  providerMessageId String?             @map("provider_message_id")
  attemptedAt       DateTime            @map("attempted_at")
  errorMessage      String?             @map("error_message")
  order             Order               @relation(fields: [orderId], references: [id], onDelete: Cascade)
  @@map("email_deliveries")
}
```

**Admin users:** no table for MVP. Keep env-based single admin + stateless HMAC cookie
(`src/admin/session.ts`). Revisit only when multi-admin / roles / password rotation is needed.

---

## Agent Slice Prompts

> Each prompt is self-contained for one Codex slice. Always end with the standard checks and report.

### Phase 1 — Prisma foundation
- **Scope:** Add Prisma + client, `prisma/schema.prisma` (draft models), `DATABASE_URL` in
  `.env.example`, `docker-compose.yml` Postgres, `src/db/client.ts`, initial migration. No read/write
  path changes.
- **Files likely touched:** `package.json`, `.env.example`, `prisma/schema.prisma`,
  `prisma/migrations/*`, `src/db/client.ts`, `docker-compose.yml`, `.gitignore`.
- **Do not touch:** any `src/**` runtime logic, any route, any in-memory store.
- **Checks:** `npm run typecheck`, `npm run build`, `npm test`, migration applies on clean DB.
- **Report:** files added, migration name, how to start the DB locally, checks status.

### Phase 2 — Catalog reads
- **Scope:** Seed script + `product-repository.ts`; route storefront reads through DB.
- **Files likely touched:** `prisma/seed.ts`, `src/catalog/product-repository.ts`, `app/coleccion/*`,
  `app/suplementos/*`, `app/buscar/page.tsx`, `src/cart/actions.ts`, `src/checkout/actions.ts`.
- **Do not touch:** pure functions in `catalog.ts`/`supplements.ts`/`product-detail.ts` (signatures),
  admin writes, order/payment/email modules.
- **Checks:** standard four + repository integration tests.
- **Report:** mapping approach, routes verified, test additions, checks status.

### Phase 3 — Admin product writes
- **Scope:** Persist create/edit/publish/variant via Prisma behind existing service signatures.
- **Files likely touched:** `src/admin/products.ts`, `src/admin/product-actions.ts`.
- **Do not touch:** pure validators' logic, storefront read paths, media file handling internals.
- **Checks:** standard four + admin write integration tests.
- **Report:** persistence approach, invariants enforced, test additions, checks status.

### Phase 4 — Image / media metadata
- **Scope:** Persist image metadata in DB; keep binaries on disk; declare `sharp`; document media root.
- **Files likely touched:** `src/catalog/product-images.ts`, `src/admin/product-actions.ts`,
  `src/admin/product-image-processing.ts` (metadata only), `package.json`, `.env.example`.
- **Do not touch:** rendition writing/serving binary logic, storefront rendering.
- **Checks:** standard four + image upload/reorder/delete integration tests.
- **Report:** metadata model used, cleanup-on-failure preserved, `sharp` declared, checks status.

### Phase 5 — Remove stock reservations
- **Scope:** Delete the reservation/hold system end to end (code + draft schema model + DB
  migration). Pure refactor; no new persistence. Availability stays = `variant.stock` (cart
  validation already gates it); sold-stock decrement moves to Phase 7.
- **Files likely touched:** delete `src/orders/stock-reservation.ts(.test.ts)`; edit
  `src/orders/order-creation.ts`, `src/orders/order-store.ts`,
  `src/payments/payment-reconciliation.ts`, `src/orders/order-expiration.ts`,
  `src/checkout/payment-handoff.ts`, `prisma/schema.prisma` (+ migration), and the affected tests.
- **Do not touch:** cart/checkout validation logic, totals math, order/contact/delivery snapshots.
- **Checks:** standard four; `grep -ri reservation src` returns nothing.
- **Report:** files deleted/edited, the `stock_unavailable` removal, migration name, checks status.

### Phase 6 — Orders
- **Scope:** Persist orders + items; order creation transaction + idempotency; status history.
- **Files likely touched:** `src/orders/order-store.ts`, `src/checkout/payment-handoff.ts`,
  `app/checkout/pago/payment-result-route.tsx`, `src/admin/orders.ts`,
  `src/admin/order-fulfillment-edits.ts`, `src/admin/order-transitions.ts`.
- **Do not touch:** pure domain math (`order-creation` calculations),
  payment-event/email modules (next phases).
- **Checks:** standard four + order persistence/idempotency integration tests.
- **Report:** transaction boundary, idempotency approach, async ripple list, checks status.

### Phase 7 — Payment events / webhook idempotency + stock decrement
- **Scope:** Persist events; DB-unique idempotency; transactional status transitions; decrement
  `variant.stock` on paid (replaces the removed reservation hold).
- **Files likely touched:** `src/payments/payment-events.ts`, `src/payments/payment-reconciliation.ts`,
  `src/orders/order-expiration.ts`, `app/api/mercado-pago/webhook/route.ts` (awaits only).
- **Do not touch:** signature verification + MP API client (`mercado-pago-webhook.ts`,
  `payment-preference.ts`).
- **Checks:** standard four + redelivered-event + transition + decrement-once integration tests.
- **Report:** idempotency constraint, transaction boundary, decrement approach, webhook parity, checks status.

### Phase 8 — Email delivery records
- **Scope:** Persist delivery records; send-once via unique constraint; keep adapter + dev outbox.
- **Files likely touched:** `src/notifications/order-confirmation-email.ts`.
- **Do not touch:** `src/notifications/email-provider.ts` adapter contract.
- **Checks:** standard four + send-once integration test.
- **Report:** dedup approach, outbox scope, checks status.

### Phase 9 — Cleanup
- **Scope:** Remove module-level arrays + mutable demo state; mark seed/dev utilities; update docs.
- **Files likely touched:** `src/catalog/catalog.ts`, `src/admin/products.ts`,
  `src/orders/order-store.ts`, `src/payments/payment-events.ts`,
  `src/notifications/order-confirmation-email.ts`, docs.
- **Do not touch:** working DB paths from prior phases.
- **Checks:** standard four + full suite; `grep` for residual runtime arrays.
- **Report:** removed items, remaining intentional seed/dev code, checks status.

---

## Final Production Readiness Criteria

- [x] No critical business data stored only in memory.
- [x] Clean install works (`npm ci` from scratch, including `sharp`).
- [x] `npm run build` passes.
- [x] `npm test` passes.
- [x] `npm run typecheck` passes.
- [x] DB migration runs on a clean database.
- [x] App survives restart without losing data.
- [x] Admin product changes persist across restart.
- [x] Orders persist across restart.
- [x] Stock decrements on paid (no reservation/hold system remains).
- [x] Payment events persist and remain idempotent.
- [x] Email delivery records persist and preserve send-once.
