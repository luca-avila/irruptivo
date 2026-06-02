# Decision 001: MVP Launch Geography

## Context

Irruptivo will launch as an Argentina-focused ecommerce. Fulfillment is manual and handled through Correo Argentino.

## Decision

The MVP supports Argentina-only orders.

## Why

Correo Argentino can deliver nationwide, and limiting launch scope to Argentina keeps address handling, payments, shipping copy, and fulfillment expectations clear.

## Tradeoffs

This excludes international buyers, but avoids customs, currency, tax, and logistics complexity.

## Revisit if

The brand has proven demand outside Argentina or needs international campaigns.

# Decision 002: Shipping And Local Pickup

## Context

The MVP needs simple fulfillment without integrating Correo Argentino APIs.

## Decision

The MVP supports two delivery methods:

- Nationwide home shipping through Correo Argentino for a flat ARS 5.000 fee.
- Free local pickup in Benavidez/Zona Norte, coordinated via WhatsApp after payment.

Mercado Pago payment is required for both methods before fulfillment or pickup coordination begins.

## Why

Flat shipping keeps checkout simple. Local pickup supports nearby customers without charging unnecessary shipping.

## Tradeoffs

Flat shipping may overcharge or undercharge some orders. Pickup adds a checkout branch and pickup-specific fulfillment states.

## Revisit if

Shipping costs vary too much, pickup volume grows, or automated logistics become necessary.

# Decision 003: Mercado Pago Payment Confirmation

## Context

The MVP needs real ecommerce payment behavior while avoiding custom payment processing.

## Decision

Orders are created before redirecting to Mercado Pago with status `pending_payment`. Mercado Pago webhook/server-side verification is the source of truth for payment confirmation.

Return pages are user-facing status pages only. They display the current known order/payment state but do not by themselves mark an order as paid.

## Why

Return URLs are not reliable enough to mark orders as paid. Server-side verification prevents spoofed or stale payment states.

## Tradeoffs

Users may see pending/confirming states while payment confirmation arrives.

## Revisit if

A more advanced payment orchestration or reconciliation system is introduced.

# Decision 004: Order Lifecycle And Stock Reservation

## Context

The original status list included cancellation, but MVP cancellation/refund handling is excluded. The MVP also needs to prevent overselling scarce variants while handling abandoned Mercado Pago checkouts.

## Decision

The MVP uses one simplified order status model:

- `pending_payment`
- `paid`
- `payment_failed`
- `expired`
- `preparing`
- `shipped`
- `delivered`
- `ready_for_pickup`
- `picked_up`

`cancelled` is excluded from MVP.

Stock is reserved when an order is created as `pending_payment`.

Unpaid `pending_payment` orders expire after 30 minutes, move to `expired`, and release reserved stock.

A verified payment failure moves the order to `payment_failed`, releases reserved stock immediately, and requires a fresh checkout/order for retry.

Late payment confirmation for an expired order is treated as manual payment review required. It does not automatically become `paid` or enter fulfillment.

## Why

This status model reflects supported MVP behavior only. Reserving stock prevents overselling, while expiration prevents abandoned checkouts from locking inventory indefinitely.

## Tradeoffs

The single status model mixes payment and fulfillment concepts, but it is simpler for MVP. Expiration and late-payment handling require careful implementation.

## Revisit if

Order volume increases, payment methods with longer settlement windows become important, or the system needs separate payment and fulfillment status models.

# Decision 005: Admin Order Queue And Fulfillment Transitions

## Context

Admin should focus on operationally actionable orders, and shipping and pickup have different fulfillment paths.

## Decision

Default admin order queue shows only:

- `paid`
- `preparing`
- `ready_for_pickup`
- `shipped`

`pending_payment`, `payment_failed`, `expired`, `delivered`, and `picked_up` are available through filters/history.

Fulfillment transitions are constrained by delivery method.

Shipping:

- `paid -> preparing -> shipped -> delivered`

Pickup:

- `paid -> preparing -> ready_for_pickup -> picked_up`

Payment states are system-controlled. Admin cannot move orders backward, cross delivery-method paths, or skip `preparing` in MVP.

## Why

This keeps the admin work queue focused and prevents invalid states like shipping a pickup order.

## Tradeoffs

Strict transitions may add admin clicks, but they reduce operational ambiguity.

## Revisit if

Admin workflows need controlled skip transitions, correction workflows, or more advanced reporting.

# Decision 006: No Admin Cancellation Or Refund Tracking In MVP

## Context

Cancellation and refund workflows are operationally sensitive and excluded from MVP.

## Decision

Admin cannot cancel `pending_payment`, `paid`, or `preparing` orders in the app.

Pending unpaid orders expire automatically after 30 minutes. Exceptional cancellations/refunds are handled manually outside the MVP system and are not tracked as order status changes.

## Why

This keeps the MVP order lifecycle smaller and avoids misleading refund semantics.

## Tradeoffs

Admin has less control inside the app, and exceptional cases require manual handling outside the system.

## Revisit if

Refund management or cancellation workflows become necessary.

# Decision 007: Customer Authentication Removed From MVP

## Context

Guest checkout is required, and customer auth does not provide enough MVP value without order history, saved addresses, or persistent server-side carts.

## Decision

Customer-facing register/login/logout is removed from MVP. Admin auth remains.

## Why

Customer auth would add complexity without improving the launch purchase flow.

## Tradeoffs

Customers cannot view account order history or save details in MVP.

## Revisit if

Order history, saved addresses, loyalty, or repeat-purchase features become priorities.

# Decision 008: Guest Order Access

## Context

Guest buyers need a way to check order status after purchase.

## Decision

MVP includes secure read-only guest order-status links using unguessable tokens.

The token mechanism, storage, expiry, and hardening details are deferred to architecture.

## Why

This gives guest buyers confidence without requiring accounts.

## Tradeoffs

Adds access-control requirements, but avoids customer account scope.

## Revisit if

Customer accounts with verified order history are added.

# Decision 009: Purchase Confirmation Email

## Context

The brand needs trust after payment, especially because fulfillment is manual.

## Decision

Send a basic confirmation email after Mercado Pago payment is verified as `paid`.

The email should include order number, total, delivery or pickup summary, next steps, WhatsApp/contact path, and secure guest order-status link.

Email provider: Resend. The adapter keeps local/dev outbox and generic HTTP modes, but
production transactional email uses Resend's `/emails` API with the provider-specific
payload shape. Sender-domain DNS verification remains a production readiness task.

## Why

Email confirmation makes the ecommerce feel legitimate and reduces support uncertainty.

## Tradeoffs

Requires email setup and deliverability handling.

## Revisit if

Email automation, marketing flows, or notification preferences are added.

# Decision 010: Cart Persistence And Pricing

## Context

Guest cart is stored locally, but prices may change while items remain in cart.

## Decision

The cart uses localStorage. Cart items store variant reference, quantity, price snapshot, and timestamp.

Add-to-cart price is honored for 24 hours. Increasing quantity refreshes that cart item to the current server price and restarts the 24-hour window. Expired snapshots refresh to the latest price with user notice.

The server must validate product availability, stock, and price snapshot eligibility before order creation.

## Why

This balances customer trust with business protection against indefinite stale prices.

## Tradeoffs

Price snapshot validation is more complex than always using the latest price.

## Revisit if

Server-side carts or authenticated carts are introduced.

# Decision 011: Product And Variant Model

## Context

Clothing and supplements both need variant-level stock.

## Decision

Every sellable product requires at least one sellable variant record/SKU. Clothing stock is tracked by combined color/size variants. Supplement stock is tracked by combined flavor/weight/presentation variants.

Variant-level price override is supported, with product base price as default.

A human-readable SKU code can be added if useful, but the required product concept is the sellable variant record.

## Why

The exact sellable unit owns stock and price.

## Tradeoffs

Admin product setup is more detailed, but cart/order/inventory logic is cleaner.

## Revisit if

The catalog grows enough to require bulk variant tooling.

# Decision 012: Product Availability

## Context

The catalog may be small, and out-of-stock products still contribute to brand perception.

## Decision

Active out-of-stock products remain visible and show `Sin stock`. Add-to-cart requires selected variant stock greater than zero. No backorders or preorders are supported in MVP.

Public stock display uses labels only:

- `Disponible`: 4+
- `Últimas unidades`: 1-3
- `Sin stock`: 0

Exact stock counts are admin-only.

## Why

This preserves product visibility while preventing invalid purchases.

## Tradeoffs

Visible out-of-stock products may frustrate customers.

## Revisit if

Waitlists, back-in-stock notifications, or preorders are added.

# Decision 013: Product URLs And Slugs

## Context

Product links may be shared through Instagram, ads, and WhatsApp.

## Decision

Product URLs are category-contextual:

- `/coleccion/[slug]`
- `/suplementos/[slug]`

Slugs are globally unique and immutable after creation.

## Why

Stable URLs protect shared links and keep routing simple.

## Tradeoffs

Admins cannot rename URLs after creation.

## Revisit if

Slug redirects or category migrations become necessary.

# Decision 014: Inactive Product Behavior

## Context

Inactive products should not appear in public listings, but old links may exist.

## Decision

Inactive products are hidden from grids/search but direct URLs show a soft unavailable page with no purchase action.

## Why

This avoids dead links while preventing purchases.

## Tradeoffs

Some inactive product information remains publicly visible.

## Revisit if

Legal, campaign, or inventory needs require hard 404 behavior.

# Decision 015: Product Image Rules

## Context

Product visuals are central to trust and brand perception.

## Decision

Clothing images are grouped by visual variant/color, not duplicated per size variant. Supplements may use variant-specific images when packaging differs.

Admin galleries support manual ordering.

## Why

This gives customers accurate visuals without unnecessary admin duplication.

## Tradeoffs

The image model is more complex than product-only images.

## Revisit if

The catalog requires richer per-variant galleries or lookbook-style content.

# Decision 016: MVP Image Storage Requirement

## Context

The app will run on a VPS, and MVP should avoid external object storage complexity.

## Decision

Uploaded product images are stored on persistent VPS filesystem storage, outside the application codebase/container. PostgreSQL stores image metadata and relative paths only.

Product images must be publicly readable through a controlled media URL. Exact directory layout, server mapping, backup strategy, and serving mechanism are deferred to architecture.

## Why

This is simple and acceptable for a small MVP catalog on a VPS while preserving a future migration path to object storage.

## Tradeoffs

Requires reliable backups and careful deployment isolation.

## Revisit if

The app moves to ephemeral hosting, multiple servers, CDN needs, or larger media volume.

# Decision 017: Image Processing And Deletion Requirements

## Context

Large uploaded images can hurt mobile performance, and accidental deletion can break product pages.

## Decision

Uploads should produce responsive image renditions for grid/card use, product detail use, and original/high-res retention. Exact dimensions, formats, and image-processing library are deferred to architecture.

Image records are soft-deleted first. Physical file cleanup is deferred until files are unreferenced. Cleanup mechanics are deferred to architecture.

## Why

This protects performance and avoids broken references.

## Tradeoffs

Adds image-processing and cleanup complexity.

## Revisit if

External object storage or automated media lifecycle management is added.

# Decision 018: Catalog Structure And Search

## Context

Clothing should lead the brand while supplements remain easy to access.

## Decision

MVP uses separate top-level pages:

- `/coleccion`
- `/suplementos`

Clothing filters are limited to subcategories. Supplement filters are limited to supplement type. Search is simple global product-name search across active products.

## Why

This keeps discovery clear without marketplace-style complexity.

## Tradeoffs

No advanced search, sorting, size filters, flavor filters, or faceted browsing.

## Revisit if

Catalog size increases or users struggle to find products.

# Decision 019: Homepage Positioning

## Context

Clothing is the main identity driver, while supplements are a supporting business category.

## Decision

The homepage hero uses one primary CTA: `Ver colección` linking to `/coleccion`. Supplements appear after the clothing-led section and in navigation.

## Why

This makes the brand direction clear from the first impression.

## Tradeoffs

Supplement demand is not prioritized in the first viewport.

## Revisit if

Business strategy shifts toward supplements or mixed fitness retail.

# Decision 020: Trust Pages

## Context

The brand is early and needs trust for new visitors.

## Decision

MVP includes lean `Nosotros` and `Envíos y cambios` pages.

## Why

These pages support legitimacy, delivery clarity, and purchase confidence.

## Tradeoffs

Requires concise copy and maintenance.

## Revisit if

The brand develops richer storytelling, campaigns, or policy complexity.

# Decision 021: Exchange Policy

## Context

Clothing buyers need confidence, but refund/return operations should stay simple.

## Decision

MVP supports exchange-focused handling: contact within 7 days, unused/original condition, customer pays voluntary exchange shipping, Irruptivo covers wrong/defective item cases, refunds only when legally required or owner-approved.

Supplement issues are handled case-by-case through WhatsApp/Instagram instead of a detailed supplement-specific return workflow in MVP.

## Why

This protects the business while giving customers a clear support path.

## Tradeoffs

Less generous than a mature ecommerce return policy.

## Revisit if

Return volume grows or legal/business requirements change.

# Decision 022: Admin Order Editing

## Context

Manual fulfillment may require correcting customer contact or delivery information.

## Decision

After payment, admin may edit fulfillment/contact fields only. Admin may not edit items, quantities, prices, totals, shipping cost, payment amount, or payment status.

Admin may add an internal note for context.

## Why

This supports real operations without corrupting payment/order records.

## Tradeoffs

Item/order changes require manual handling outside the system.

## Revisit if

Order adjustment, refund, or exchange workflows are added.
