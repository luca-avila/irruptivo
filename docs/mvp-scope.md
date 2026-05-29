# 4) MVP Scope

## Goal

Reduce complexity, ship faster, and validate the ecommerce experience as early as possible.

The MVP should:

- Feel usable and professional
- Support the core shopping flow
- Represent the Irruptivo brand correctly
- Make clothing/sportswear lead the brand identity
- Support third-party supplement resale
- Use Mercado Pago for payments
- Support Argentina-only delivery/pickup
- Provide a basic admin for product and order management
- Avoid unnecessary complexity
- Prioritize speed of iteration and maintainability

The focus is not building a massive ecommerce platform.

The focus is validating:

- UX quality
- Product presentation
- Shopping flow
- Operational workflow
- Brand perception
- Basic admin usability
- Real purchase handling

---

## Product Context

Irruptivo is a fitness/lifestyle brand with two product realities:

1. Clothing/sportswear is becoming the central brand direction for the ecommerce experience.
2. Supplements are third-party products resold/curated by Irruptivo.

The MVP supports both categories, but the customer-facing experience should make clothing feel central to the brand identity.

Supplements should be available and easy to buy, but the site should not feel like a generic supplement store.

---

## MVP Definition

The MVP is a real ecommerce with a simplified operational model.

It includes:

- Public ecommerce
- Product catalog
- Product detail pages
- Simple global product-name search
- LocalStorage cart
- Guest checkout
- Mercado Pago payment
- Argentina-only nationwide shipping
- Free local pickup
- Order creation before payment
- Stock reservation during payment
- Purchase confirmation
- Secure guest order-status link
- Basic confirmation email
- Basic admin
- Product/variant/stock management
- Image management
- Order management

It does not include customer accounts, advanced ecommerce, marketing automation, advanced logistics, refund/cancellation workflows, complex user systems, or large-scale marketplace features.

---

## Included

### 1. Public Ecommerce

#### Home

The homepage should introduce the brand and guide users toward products quickly.

Included:

- Clothing-led hero section
- One primary hero CTA: `Ver colección` linking to `/coleccion`
- Featured clothing
- Featured supplements below the clothing-led section
- Clear CTAs
- Basic brand/trust section
- Shipping/pickup/exchange/contact reassurance
- Footer

Goal:

- Communicate brand identity
- Make clothing feel central
- Give users a clear path to shop

### 2. Product Catalog

The catalog should allow users to browse products with low friction.

Included:

- `/coleccion`
- `/suplementos`
- Product grid
- Responsive layout
- Product cards
- Basic clothing subcategory filtering
- Basic supplement type filtering
- Product availability labels
- Active out-of-stock products visible as `Sin stock`

Excluded:

- Advanced search
- Advanced filters
- Size/color grid filters
- Flavor/weight/presentation grid filters
- Sorting complexity
- Marketplace-style category depth

Goal:

- Help users scan products quickly
- Keep navigation simple
- Avoid unnecessary catalog complexity

### 3. Search

Included:

- Simple global product-name search
- Searches active clothing and supplement products
- Simple result cards
- Empty state

Excluded:

- Typo tolerance
- Advanced ranking
- Faceted search
- Search analytics
- Search suggestions

Goal:

- Support direct product lookup without turning the catalog into a marketplace.

### 4. Product Detail

Product detail pages should help users confidently understand and add products to cart.

Included:

- Product images
- Product name
- Product description
- Price
- Category/type
- Variant selection
- Availability label
- Add to cart
- Shipping/pickup information
- Exchange information
- Size guide when applicable
- WhatsApp/contact access

Public availability labels:

- `Disponible`: 4+ units
- `Últimas unidades`: 1-3 units
- `Sin stock`: 0 units

Variant model:

- Every sellable product requires at least one variant/SKU.
- Clothing uses combined color/size SKUs.
- Supplements use combined flavor/weight/presentation SKUs.
- Variant-level price override is supported.
- Product base price is the default.

Image model:

- Clothing galleries are grouped by visual variant/color.
- Supplements use variant-specific images when packaging differs.

Goal:

- Make product evaluation easy
- Show essential buying information clearly
- Support trust and clarity before purchase

### 5. Cart

The cart should let users review and adjust their purchase before checkout.

Included:

- View cart items
- View selected variants/options
- Modify quantity
- Remove products
- View subtotal
- View shipping/pickup cost when known
- View total
- Proceed to checkout
- Stock validation
- Price snapshot validation

Cart persistence:

- Guest cart stored in localStorage.
- Cart item stores variant/SKU reference, quantity, price snapshot, and timestamp.
- Add-to-cart price is honored for 24 hours.
- Increasing quantity refreshes the item to current server price.
- Expired snapshots refresh to current server price with notice.

Goal:

- Keep purchase review simple and predictable
- Avoid forcing login before checkout
- Avoid stale/tampered cart data at order creation

### 6. Checkout

The checkout should support a real purchase flow with simple operational complexity.

Included:

- Guest checkout only
- Contact information
- Delivery method selection
- Shipping/address form when shipping is selected
- Pickup notes when pickup is selected
- Fixed ARS 5.000 home shipping
- Free local pickup
- Order summary
- Mercado Pago payment flow
- Order creation before payment
- Stock reservation
- Payment result handling
- Purchase confirmation

Delivery methods:

- Nationwide Argentina shipping through Correo Argentino for ARS 5.000.
- Local pickup in Benavidez/Zona Norte for ARS 0, coordinated via WhatsApp after payment.

Checkout behavior:

- Validate cart and customer data.
- Validate stock and price snapshots.
- Create order as `pending_payment`.
- Reserve stock.
- Create Mercado Pago payment preference.
- Redirect to Mercado Pago.
- Receive webhook/server-side payment confirmation.
- Update order status.
- Show success/failure/pending page.

Goal:

- Let users complete real purchases.
- Keep checkout clear and trustworthy.
- Avoid dynamic shipping complexity in MVP.

### 7. Purchase Result And Guest Order Status

The MVP should support clear payment result states.

Included:

- Purchase success page
- Payment failure page
- Payment pending/confirming page
- Expired payment handling
- Order number
- Next steps
- Contact information
- Delivery/pickup summary
- Secure read-only guest order-status link
- Confirmation email after verified payment

Success page should communicate:

- Payment/order confirmation
- Order number
- Total
- Delivery or pickup summary
- What happens next
- Contact/WhatsApp option
- Guest order-status link

Goal:

- Reduce uncertainty after payment.
- Make manual fulfillment feel professional.
- Avoid requiring customer accounts.

### 8. Admin Authentication

The admin should access protected management screens.

Included:

- Admin login
- Admin-only protected routes
- Unauthorized/expired-session handling

Excluded:

- Customer-facing register/login/logout
- Customer account dashboard
- Authenticated carts
- Customer order history
- Guest-order claiming
- Complex staff roles/permissions

Goal:

- Protect admin operations without adding customer auth scope.

### 9. Product Management

The admin should be able to manage the catalog without direct database edits.

Included:

- Create products
- Edit products
- Activate/deactivate products
- Generate immutable globally unique slug on create
- Manage product category/type
- Manage product description
- Manage product base price
- Manage variant price overrides
- Upload/manage product images
- Reorder image galleries
- Soft-delete image records
- Manage generic variants/SKUs
- Manage stock per variant

Product status:

- `active`
- `inactive`

Customer-facing behavior:

- Active products appear in public store/search.
- Active out-of-stock products remain visible as `Sin stock`.
- Inactive products are hidden from listings/search.
- Direct inactive product URLs show a soft unavailable page.

Goal:

- Make the catalog operationally manageable.
- Avoid manual database edits.

### 10. Image Storage And Processing

Included:

- Uploaded product images stored on VPS persistent filesystem.
- Image directory/volume lives outside the app codebase/container.
- PostgreSQL stores metadata and relative paths only.
- Public images served under controlled prefix such as `/media/products/...`.
- Generate thumbnail/grid, detail/mobile, and original/high-res variants.
- Strip metadata.
- Store dimensions.
- Soft-delete image records before physical cleanup.

Excluded:

- Database blobs
- External object storage in MVP
- CDN-specific image pipeline
- Automated media lifecycle management

Goal:

- Keep MVP image handling simple for a VPS deployment while preserving a migration path to object storage later.

### 11. Order Management

The admin should be able to understand and update fulfillment.

Included:

- View orders
- View order details
- View payment/order status
- View customer contact data
- View shipping/delivery data
- View pickup coordination data
- Update fulfillment status through allowed transitions
- Edit contact/delivery fulfillment fields after payment
- Add internal/admin note

MVP order statuses:

- `pending_payment`
- `paid`
- `payment_failed`
- `expired`
- `preparing`
- `shipped`
- `delivered`
- `ready_for_pickup`
- `picked_up`

Default admin queue:

- `paid`
- `preparing`
- `ready_for_pickup`
- `shipped`

Payment/history filters:

- `pending_payment`
- `payment_failed`
- `expired`
- `delivered`
- `picked_up`

Allowed fulfillment transitions:

Shipping:

- `paid -> preparing -> shipped -> delivered`

Pickup:

- `paid -> preparing -> ready_for_pickup -> picked_up`

Excluded:

- Admin cancellation
- Refund management
- Editing paid order items/quantities/prices/totals/payment status
- Backward/cross-path status transitions

Goal:

- Support manual fulfillment through Correo Argentino and pickup coordination.
- Keep admin focused on actionable paid orders.

### 12. Backend / Core Systems

Included backend systems:

- Product system
- Product category/type system
- Product variant/SKU system
- Inventory/stock basics
- Stock reservation
- Cart validation
- Order system
- Payment integration with Mercado Pago
- Guest order-status token
- Confirmation email trigger
- Admin authentication
- Admin authorization
- Upload handling
- Basic validations
- Fixed shipping cost calculation
- Pickup cost calculation

Required integrations:

- Mercado Pago
- Basic email sending provider

Not required in MVP:

- Correo Argentino API integration
- Advanced shipment tracking
- Email marketing provider
- Advanced analytics provider

---

## Excluded From MVP

### Advanced Ecommerce Features

- Reviews/ratings
- Wishlist/favorites
- Loyalty systems
- Coupons/promotions
- Gift cards
- Product recommendations
- AI recommendations
- Advanced search
- Advanced filtering
- Related products engine
- Bundles
- Subscriptions
- Dynamic pricing
- Product comparison
- Backorders/preorders
- Waitlists
- Back-in-stock notifications

### Customer Account Features

- Customer register/login/logout
- Customer account dashboard
- Authenticated cart persistence
- Cart merge
- Order history
- Guest-order claiming
- Social login
- OAuth
- Forgot password
- Complex profile management
- Advanced account settings
- Multiple addresses
- Saved payment methods
- Notification preferences

### Advanced Admin Features

- Analytics dashboards
- Sales reports
- Bulk editing
- Advanced inventory tools
- Staff roles/permissions
- Audit logs
- Refund management dashboard
- Cancellation workflow
- CMS/blog management
- Campaign management
- Advanced customer management

### Advanced Logistics

- Correo Argentino API integration
- Dynamic shipping calculation
- Real-time shipment tracking
- Multiple paid shipping methods
- Automated label generation
- Delivery time estimation engine
- Pickup point integration

### Technical Complexity

- Microservices
- Event-driven architecture
- Complex caching
- Realtime systems
- Advanced observability
- Multi-region deployments
- Premature scalability optimization
- Complex queue systems
- Over-abstracted service layers
- Custom payment orchestration beyond Mercado Pago needs
- External object storage for MVP image uploads

---

## Payment And Stock Rules

Order creation:

- Order is created before Mercado Pago redirect.
- Initial status is `pending_payment`.
- Stock is reserved at order creation.

Payment confirmation:

- Mercado Pago webhook/server-side verification is the source of truth.
- Return pages only display current known state.

Pending payment:

- Expires after 30 minutes.
- Releases reserved stock.
- Status becomes `expired`.

Payment failure:

- Status becomes `payment_failed`.
- Reserved stock is released immediately.
- Retrying payment creates a new order.

Late payment after expiration:

- Goes to manual admin review.
- Does not automatically become `paid`.

---

## MVP Priorities

### Highest Priority

- Strong mobile UX
- Clear product presentation
- Clothing-led premium/professional brand perception
- Smooth guest shopping flow
- Mercado Pago checkout
- Shipping/pickup clarity
- Trustworthy purchase confirmation
- Operationally usable admin
- Reliable stock reservation
- Fast and maintainable implementation

### Product Priority

The MVP should prove that:

- Users understand what Irruptivo sells.
- Clothing feels central to the brand.
- Supplements are easy to find without diluting the identity.
- The site feels professional enough for Instagram/ad traffic.
- Product pages are clear enough to support purchase intent.
- Checkout feels trustworthy and simple.
- Orders can be received and fulfilled manually.
- Guest order-status and email confirmation reduce post-payment uncertainty.

### Technical Priority

The MVP should be built in a way that is:

- Simple
- Maintainable
- Easy to iterate
- Compatible with AI-assisted development
- Suitable for a Next.js fullstack project
- Not prematurely overengineered

---

## MVP Success Criteria

The MVP is successful if:

- A new visitor can understand the brand and product offering quickly.
- A mobile user can browse products without friction.
- A user can search by product name.
- A user can add products with variants to cart.
- A user can complete guest checkout through Mercado Pago.
- A user can choose shipping or pickup.
- A user receives a clear success/failure/pending result.
- A user receives a confirmation email after verified payment.
- A guest user can access a secure order-status page.
- The admin can create/edit products without touching the database directly.
- The admin can manage variants/SKUs and stock.
- The admin can manage product images.
- The admin can see paid actionable orders and update fulfillment status.
- The owner can fulfill orders manually using collected customer/shipping/pickup data.
- The brand feels more professional than a WhatsApp-only selling flow.

---

## Important Principles

### Product Principle

The MVP should feel:

- Simple
- Focused
- Usable
- Professional
- Trustworthy
- Brand-aligned

It should not feel:

- Massive
- Overloaded
- Overengineered
- Generic
- Like a marketplace
- Like a rough prototype

### UX Principle

Essential ecommerce information must remain visible:

- Price
- Variant
- Availability
- Shipping/pickup cost
- Payment method
- Product images
- Add-to-cart action
- Checkout action
- Contact/support path

Minimalism should not hide information required for confident purchase decisions.

### Engineering Principle

Build only what supports the validated MVP flow.

Prefer:

- Clear domain model
- Simple data flow
- Explicit validations
- Small vertical slices
- Direct implementation
- Easy refactoring later

Avoid:

- Premature architecture
- Generic ecommerce platform thinking
- Over-flexible systems
- Complex admin capabilities before they are needed

---

## Remaining Non-Blocking Inputs

These should be specified during PRD, UI, or implementation but do not block PRD:

- Exact launch products
- Exact launch variants
- Exact product images/assets
- Exact WhatsApp/Instagram contact values
- Exact confirmation email provider/sender identity
- Exact VPS backup plan for uploaded images
- Exact image size and format limits
- Exact Correo Argentino address field constraints

---

## Output

This MVP scope produces:

- Clear implementation boundary
- Reduced complexity
- Updated product decisions
- Faster iteration speed
- Better focus during development
- Easier AI-assisted implementation
- Stronger product validation loop
- More realistic ecommerce foundation
- Clear separation between MVP and future product growth
