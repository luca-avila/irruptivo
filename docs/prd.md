# PRD: Irruptivo Ecommerce MVP

## 1. Overview

Irruptivo is a fitness/lifestyle ecommerce for an early-stage sportswear/streetwear brand in Argentina. The MVP must replace informal WhatsApp-first selling with a professional, mobile-first storefront that builds trust, presents products clearly, and supports real purchases through Mercado Pago.

Clothing/sportswear leads the brand identity. Supplements are part of the business as third-party products resold or curated by Irruptivo, but they should not make the store feel like a generic supplement marketplace.

The MVP purpose is to validate the core ecommerce experience: product discovery, product detail clarity, localStorage cart, guest checkout, Mercado Pago payment, fixed shipping or pickup, confirmation, secure guest order-status access, and an operational admin for products, stock, images, and orders.

### Confirmed Decisions

- MVP supports Argentina-only orders.
- Delivery methods are Correo Argentino nationwide shipping for ARS 5.000 and free local pickup in Benavidez/Zona Norte.
- Mercado Pago is required for both delivery methods.
- Orders are created before Mercado Pago redirect and start as `pending_payment`.
- Mercado Pago webhook/server-side verification is the source of truth for payment confirmation.
- Customer-facing authentication and account area are excluded from MVP.
- Admin authentication remains required.
- Guest buyers access order status through secure read-only links.
- Product images are stored on persistent VPS filesystem storage, with PostgreSQL storing metadata and relative paths.

### Reasonable Assumptions

- Most first users arrive from Instagram, ads, WhatsApp, word of mouth, or direct links.
- Most browsing and checkout happens on mobile.
- The launch catalog is small enough for simple filters and simple name search.
- The storefront should prioritize trust, brand perception, and operational reliability over mature ecommerce optimization.
- Missing screens can be implemented conservatively from this PRD and refined during the relevant vertical slice.

## 2. Problem Statement

Irruptivo currently sells mostly through informal WhatsApp and personal-contact workflows. This limits catalog clarity, weakens perceived professionalism, and makes it harder for new customers outside the founder's immediate network to trust the brand enough to buy.

Customers need a clear, fast, trustworthy way to understand what Irruptivo sells, inspect product images and variants, know prices and availability, understand shipping or pickup, pay securely, and know what happens after payment.

The business needs a structured ecommerce flow that supports real purchases and manual fulfillment without overbuilding a large ecommerce platform too early.

## 3. Goals

- Product: provide a complete MVP shopping flow from product discovery to post-payment status.
- UX: deliver a mobile-first, minimal, athletic, premium, and direct storefront.
- Business: give Instagram, ad, WhatsApp, and word-of-mouth traffic a credible destination.
- Brand: make clothing/sportswear the primary first impression while keeping supplements easy to find.
- Operational: let the owner manage products, variants, stock, images, and fulfillment without database edits.
- Payment: use Mercado Pago safely, with webhook/server-side verification as the source of truth.
- Fulfillment: support fixed-cost shipping and free local pickup with manual admin status updates.
- Technical: keep implementation simple, maintainable, and built through small vertical slices.

## 4. Non-Goals

- Customer-facing register, login, logout, accounts, order history, saved addresses, or authenticated carts.
- Dynamic shipping calculation or Correo Argentino API integration.
- Refund, cancellation, or exchange management workflows inside the app.
- Reviews, wishlist, loyalty, coupons, recommendations, subscriptions, bundles, or product comparisons.
- Advanced search, typo tolerance, ranking, faceted filtering, or marketplace-style category depth.
- Complex staff roles, analytics dashboards, sales reporting, audit logs, bulk editing, CMS, or blog.
- External object storage or CDN-specific image pipeline for MVP.
- International orders.
- A generic ecommerce platform beyond Irruptivo's validated MVP flow.

## 5. Target Users

### New Visitors

New visitors are likely mobile-heavy, Argentina-based, fitness-oriented young adults who arrive from Instagram, ads, WhatsApp, word of mouth, or direct links. They need to quickly understand the brand, product categories, price level, visual quality, and whether the store feels safe enough to buy from.

### Guest Customers

Guest customers browse, add products to cart, checkout, pay with Mercado Pago, receive confirmation after verified payment, and access status through a secure guest link. They do not create accounts in MVP.

### Authenticated Customers

Authenticated customer accounts are not part of MVP. Any existing customer-auth wireframe is treated as future or non-MVP reference only. MVP must not require login to browse, add to cart, or buy.

### Admin / Business Owner

The admin/business owner needs protected admin access to manage the catalog, variants, stock, images, order details, and fulfillment statuses. The admin workflow should be table/form based, clear, and operationally focused.

## 6. Product Scope

### Included In MVP

- Home page with clothing-led hero and primary CTA to `/coleccion`.
- Separate catalog pages for `/coleccion` and `/suplementos`.
- Product detail pages at `/coleccion/[slug]` and `/suplementos/[slug]`.
- Simple global product-name search across active products.
- Basic clothing subcategory filters and supplement type filters.
- Product variants/SKUs with variant-level stock and optional price overrides.
- LocalStorage guest cart with price snapshots.
- Guest checkout.
- Shipping and pickup delivery methods.
- Mercado Pago preference creation and redirect.
- Payment result pages for success, failure, and pending/confirming.
- `pending_payment` stock reservation and 30-minute expiration.
- Secure guest order-status links.
- Basic confirmation email after verified payment.
- Admin auth.
- Admin product, image, variant, stock, order, and fulfillment management.

### Excluded From MVP

- Customer account area and customer authentication.
- Advanced ecommerce and marketing features.
- Dynamic logistics and automated shipping integrations.
- Refund/cancellation management.
- Advanced admin reporting and roles.
- International sales.

## 7. User Experience Requirements

### Mobile-First Requirements

- The primary customer experience must work cleanly on mobile.
- Navigation must support quick access to menu, search, cart, collection, supplements, trust pages, contact, and Instagram.
- Product images should carry most of the visual weight.
- Cart and checkout must be usable in short mobile sessions.
- Text, CTAs, variant selectors, and totals must remain legible and tappable.

### Brand Requirements

- The experience should feel minimal, premium, athletic, direct, and product-focused.
- Clothing must be the first-viewport identity signal on the homepage.
- Supplements should be accessible through navigation and later homepage sections without dominating brand perception.
- Copy should be concise, factual, confident, and not overly motivational.
- Supplement copy must avoid custom health or performance claims beyond factual product information.

### Trust Signals

- Real product photos.
- Visible WhatsApp/contact path.
- Visible Instagram.
- Clear Mercado Pago handoff.
- Confirmation email after verified payment.
- Secure guest order-status link.
- Clear shipping, pickup, and exchange information.
- Lean `Nosotros` and `Envíos y cambios` pages.
- Size guide for clothing where applicable.

### Product Discovery

- `/coleccion` shows active clothing products with basic subcategory filters.
- `/suplementos` shows active supplement products with basic type filters.
- Search matches active product names globally across clothing and supplements.
- Active out-of-stock products remain visible with `Sin stock`.
- Inactive products are hidden from listings and search.

### Product Detail Clarity

- Product detail pages must show images, name, price, description, category/type, variants, availability, delivery/pickup information, exchange information, size guide when applicable, and contact access.
- Add-to-cart requires a selected available variant.
- Availability labels are public; exact stock counts are admin-only.

### Checkout Clarity

- Checkout must feel like a real ecommerce checkout, not a WhatsApp order.
- Checkout collects contact information, delivery method, shipping address when needed, optional notes, and displays order summary.
- Shipping is ARS 5.000 for Argentina nationwide delivery through Correo Argentino.
- Pickup is free in Benavidez/Zona Norte and coordinated through WhatsApp after verified payment.
- Mercado Pago is the only payment path in MVP.

### Admin Usability

- Admin screens should use tables, forms, badges, simple filters, clear actions, and explicit success/error feedback.
- Default order queue should focus on actionable fulfillment statuses.
- Admin must be prevented from invalid order transitions and from editing paid order financial data.

### Required Screens / States

#### Designed In Wireframes

- Mobile hero/home first impression.
- Mobile navigation menu.
- Homepage clothing section.
- Homepage supplement section.
- Clothing product grid.
- Supplement product grid.
- Clothing product detail.
- Supplement product detail.
- Add-to-cart success feedback.
- Cart with items.
- Empty cart.
- Checkout form direction.
- Customer auth/register reference, treated as optional/future due Decision 007.

#### Required But Not Yet Designed

- Search UI, search results, and search empty state.
- Product unavailable page for inactive direct URLs.
- Product out-of-stock detail state.
- Variant unavailable or no variant selected states.
- Cart invalid states for stock, inactive product, unavailable variant, and expired price snapshot.
- Checkout validation errors.
- Delivery method selection adapted to fixed shipping and pickup.
- Mercado Pago redirect/handoff state.
- Payment success page.
- Payment failure page.
- Payment pending/confirming page.
- Expired payment/order state.
- Secure guest order-status page.
- Basic confirmation email template.
- `Nosotros` page.
- `Envíos y cambios` page.
- Admin login.
- Admin product list/create/edit.
- Admin variant/stock management.
- Admin image upload/gallery management.
- Admin order list/detail.
- Admin fulfillment transition controls.
- Admin manual review state for late payment after expiration.

#### Optional / Future

- Customer register/login/account area.
- Customer order history.
- Guest-order claiming.
- Saved addresses.
- Reviews, wishlist, coupons, recommendations, and advanced search/filtering.

## 8. Functional Requirements

### Public Ecommerce

- Provide a homepage that introduces the brand and routes users to products quickly.
- Use one primary hero CTA: `Ver colección` linking to `/coleccion`.
- Include featured clothing before supplements.
- Include trust/support links for contact, Instagram, `Nosotros`, and `Envíos y cambios`.
- Provide clear loading, empty, success, and error feedback across public flows.

### Product Catalog

- Support `/coleccion` for clothing and `/suplementos` for supplements.
- Show only active products in grids and search.
- Keep active out-of-stock products visible with `Sin stock`.
- Support clothing subcategory filters only.
- Support supplement type filters only.
- Support simple global product-name search across active products.
- Product cards should show image, name, price, category/type context where useful, and availability label.

### Product Detail

- Product detail URLs are `/coleccion/[slug]` and `/suplementos/[slug]`.
- Slugs are globally unique and immutable after creation.
- Show required product information and variant selectors.
- Clothing variants use combined color/size sellable SKUs.
- Supplement variants use combined flavor/weight/presentation sellable SKUs.
- Variant-level price overrides are supported, with product base price as default.
- Validate product active status, variant availability, stock, and current price on add-to-cart.

### Cart

- Store guest cart in localStorage.
- Cart item data includes variant/SKU reference, quantity, price snapshot, and snapshot timestamp.
- Server refreshes product name, variant/options, image, availability, stock limits, and price validity.
- Add-to-cart price is honored for 24 hours.
- Increasing quantity refreshes that cart item to current server price and restarts the 24-hour window.
- Expired price snapshots refresh to current server price with user notice.
- Cart quantities are capped by available stock.
- Cart must support quantity update, remove item, subtotal, shipping/pickup cost when known, total, and checkout CTA.

### Checkout

- Checkout is guest-only.
- Required contact fields: full name, email, and phone.
- Required delivery method: shipping or pickup.
- Shipping requires address, city, province, postal code, and optional delivery notes.
- Pickup requires no shipping address and may include optional notes.
- Validate cart, product status, variants, stock, price snapshots, and customer data before order creation.
- Create order before redirecting to Mercado Pago.
- Reserve stock when order is created as `pending_payment`.

### Mercado Pago Payment Flow

- Create Mercado Pago payment/preference after order creation.
- Redirect the user to Mercado Pago.
- Return pages display current known order/payment state only.
- Webhook/server-side verification updates payment and order state.
- Success, failure, pending/confirming, and expired states must be represented.
- Retrying after verified failure or expiration requires a fresh checkout/order.

### Customer Auth

- Customer-facing authentication is excluded from MVP.
- No public register, login, logout, password reset, OAuth, authenticated carts, or account dashboard.
- Guest checkout must be the primary and only customer purchase path.

### Account Area

- Customer account area is excluded from MVP.
- Guest order-status link provides read-only status access without an account.
- No account creation CTA should be shown after purchase.

### Admin Auth

- Provide admin login.
- Protect all admin routes.
- Handle invalid credentials, expired sessions, and unauthorized access.
- Complex staff roles and permissions are excluded; a simple admin permission model is sufficient.

### Product Management

- Admin can create, edit, activate, and deactivate products.
- Admin can set product name, description, category/type, base price, status, and variant price overrides.
- Admin can create globally unique immutable slug on product creation.
- Products cannot be active/sellable without at least one variant/SKU.

### Variant / Stock Management

- Admin can create and edit sellable variants/SKUs.
- Admin can set variant option values, stock, and optional price override.
- Exact stock counts are visible only to admin.
- Active products with all variants out of stock remain publicly visible as `Sin stock`.
- No backorders or preorders are supported.

### Image Management

- Admin can upload, order, and soft-delete product images.
- Clothing images are grouped by visual variant/color, not duplicated per size.
- Supplements may use variant-specific images when packaging differs.
- Uploaded files are stored on persistent VPS filesystem storage outside the app codebase/container.
- PostgreSQL stores image metadata and relative paths only.
- Public images are served under a controlled media URL prefix.
- Upload processing should create grid/card, product detail/mobile, and original/high-res renditions, strip metadata, and store dimensions.

### Order Management

- Admin can view order list and order detail.
- Default admin order queue shows `paid`, `preparing`, `ready_for_pickup`, and `shipped`.
- Filters/history expose `pending_payment`, `payment_failed`, `expired`, `delivered`, and `picked_up`.
- Order detail shows contact data, delivery/pickup data, items, snapshotted product/variant details, quantities, status, total, notes, and allowed status actions.
- Admin may edit fulfillment/contact fields after payment.
- Admin may add internal notes.
- Admin may not edit items, quantities, prices, totals, shipping cost, payment amount, or payment status.

### Fulfillment

- Fulfillment is manual through Correo Argentino for shipping orders.
- Pickup is coordinated manually through WhatsApp after verified payment.
- Shipping fulfillment path: `paid -> preparing -> shipped -> delivered`.
- Pickup fulfillment path: `paid -> preparing -> ready_for_pickup -> picked_up`.
- Admin cannot move orders backward, cross delivery-method paths, skip `preparing`, or cancel orders in MVP.

## 9. User Stories

1. As a new visitor, I want to understand what Irruptivo sells quickly, so that I can decide whether to explore the store.
2. As a new visitor, I want clothing to be visually prominent, so that I understand the brand identity.
3. As a new visitor, I want to access supplements without confusion, so that I can buy fitness products if that is my intent.
4. As a mobile visitor, I want simple navigation, so that I can move between collection, supplements, search, cart, and contact easily.
5. As a returning visitor, I want to search by product name, so that I can find a product directly.
6. As a shopper, I want to filter clothing by subcategory, so that I can scan a small catalog faster.
7. As a shopper, I want to filter supplements by type, so that I can find the kind of product I need.
8. As a shopper, I want to see product images, price, variants, and availability, so that I can evaluate the product.
9. As a clothing shopper, I want to select size and color when applicable, so that I buy the correct variant.
10. As a supplement shopper, I want to select flavor, weight, or presentation when applicable, so that I buy the correct variant.
11. As a shopper, I want out-of-stock items to be clearly labeled, so that I do not try to buy unavailable products.
12. As a shopper, I want to add products to cart without logging in, so that checkout stays low friction.
13. As a guest checkout user, I want to review cart items, quantities, subtotal, shipping/pickup cost, and total, so that I know what I am paying.
14. As a guest checkout user, I want stale cart prices or stock issues explained clearly, so that I can correct the cart.
15. As a guest checkout user, I want to enter contact and delivery information, so that Irruptivo can fulfill my order.
16. As a guest checkout user, I want to choose shipping or local pickup, so that I can receive the order in the way that fits me.
17. As a guest checkout user, I want to pay through Mercado Pago, so that I can use a familiar secure payment method.
18. As a guest checkout user, I want clear success, failure, and pending states after payment, so that I know what happened.
19. As a guest customer, I want a confirmation email after verified payment, so that I have proof and next steps.
20. As a guest customer, I want a secure order-status link, so that I can check status without creating an account.
21. As an authenticated customer, I do not want to be forced into account creation, so that buying remains simple in MVP.
22. As an admin user, I want to log in securely, so that product and order management is protected.
23. As an admin user, I want to create and edit products, so that I can manage the catalog without database edits.
24. As an admin user, I want to manage variants and stock, so that availability is accurate by sellable SKU.
25. As an admin user, I want to upload and order images, so that products are presented clearly.
26. As an admin user, I want to deactivate products, so that unavailable products stop appearing in public listings.
27. As an admin user, I want to view paid actionable orders first, so that I can focus on fulfillment.
28. As an admin user, I want allowed fulfillment status actions only, so that I do not create invalid order states.
29. As an admin user, I want to edit fulfillment/contact data after payment, so that I can correct operational details.
30. As a business owner, I want structured order, stock, payment, and fulfillment data, so that the store can operate beyond informal WhatsApp selling.

## 10. Business Rules

### Product Visibility

- Active products appear in public grids and search.
- Active out-of-stock products remain visible and show `Sin stock`.
- Inactive products are hidden from grids and search.
- Direct inactive product URLs show a soft unavailable page with no purchase action.

### Active / Inactive Products

- Admin controls product active/inactive status.
- Products without at least one variant/SKU cannot be published as active.
- Product slugs are generated on creation, globally unique, and immutable.

### Variants

- Every sellable product requires at least one sellable variant/SKU.
- Clothing stock is tracked by combined color/size variant.
- Supplement stock is tracked by combined flavor/weight/presentation variant.
- Variant price override is allowed; otherwise product base price applies.

### Stock

- Add-to-cart requires selected variant stock greater than zero.
- Public stock labels are `Disponible` for 4 or more units, `Últimas unidades` for 1 to 3 units, and `Sin stock` for 0 units.
- Exact stock counts are admin-only.
- No backorders, preorders, or waitlists are supported.
- Stock is reserved when a `pending_payment` order is created.
- Unpaid `pending_payment` orders expire after 30 minutes and release reserved stock.

### Cart Validation

- Cart data from localStorage is never trusted as final.
- Server validates product active status, variant existence, stock, quantity, and price snapshot eligibility.
- Expired price snapshots refresh to current price with user notice.
- Product inactivity, unavailable variants, insufficient stock, or invalid prices prevent checkout until resolved.

### Checkout Validation

- Full name, email, phone, delivery method, and applicable address fields are required.
- Shipping is Argentina-only and requires address, city, province, and postal code.
- Pickup does not require shipping address.
- Cart must be valid before order creation.

### Order Creation

- Order is created before redirecting to Mercado Pago.
- Initial order status is `pending_payment`.
- Order stores snapshotted item names, selected variants, quantities, prices, subtotal, shipping/pickup cost, total, contact data, delivery/pickup data, and payment reference data.
- Creating the order reserves stock.

### Mercado Pago Payment Confirmation

- Return pages do not mark orders paid.
- Webhook/server-side verification is the source of truth.
- Verified success moves order to `paid`.
- Verified failure moves order to `payment_failed` and releases reserved stock.
- Retrying after failure requires a fresh checkout/order.

### Payment Webhooks

- Webhooks must be idempotent.
- Duplicate webhook events must not double-transition order state or double-send side effects.
- Delayed webhooks must be handled safely.
- Late payment confirmation for an expired order requires manual admin review and does not automatically become `paid`.

### Order Statuses

- MVP statuses are `pending_payment`, `paid`, `payment_failed`, `expired`, `preparing`, `shipped`, `delivered`, `ready_for_pickup`, and `picked_up`.
- `cancelled` is excluded from MVP.
- Payment states are system-controlled.
- Fulfillment states are admin-controlled through allowed transitions only.

### Fixed Shipping Cost

- Shipping through Correo Argentino costs ARS 5.000.
- Local pickup costs ARS 0.
- Shipping/pickup cost is included in order total before Mercado Pago payment.

### Guest Checkout

- Guest checkout is the only customer purchase path in MVP.
- No customer login is required or available.
- Guest order status is accessed through a secure unguessable read-only token.

### Customer Accounts

- Customer accounts, account dashboard, order history, saved addresses, authenticated carts, and guest-order claiming are out of scope.

### Admin Permissions

- Admin routes require authentication.
- Simple admin permissions are sufficient for MVP.
- Admin cannot cancel orders, edit financial order data, edit payment status, or perform invalid fulfillment transitions.

### Image Storage

- Product images are stored on persistent VPS filesystem storage outside app code/container.
- PostgreSQL stores image metadata and relative paths, not image blobs.
- Image records are soft-deleted before physical cleanup.
- Physical cleanup happens only after files are unreferenced.

## 11. Data / Domain Concepts

- User: generic identity concept. In MVP, user authentication is only needed for admin access.
- Customer: guest buyer contact identity captured during checkout, including name, email, and phone. No customer account is created.
- Admin: authenticated operator who can manage products, variants, stock, images, orders, and fulfillment.
- Product: public catalog item with name, immutable slug, category area, type/subcategory, description, base price, status, and images.
- ProductImage: image metadata and relative paths for uploaded product images, including ordering, dimensions, renditions, optional variant/color association, and soft-delete state.
- ProductVariant: sellable SKU record with option values, stock, optional price override, and active/sellable data.
- Cart: localStorage customer-side collection of intended purchases, validated by server before checkout.
- CartItem: variant reference, quantity, price snapshot, and snapshot timestamp.
- Order: server-side purchase record created before payment, with snapshotted items, contact/delivery data, totals, status, guest access token, and payment relationship.
- OrderItem: immutable purchased item snapshot including product, variant, quantity, unit price, and line total.
- Payment: Mercado Pago payment/preference relationship and normalized payment state used to reconcile order status.
- PaymentEvent: webhook/server-side event record used for idempotency, auditability, and delayed/duplicate event handling.
- ShippingAddress: delivery fields required for Correo Argentino shipping, tied to the order.

## 12. Payment Requirements

- Order is created before redirecting to Mercado Pago.
- Order starts as `pending_payment`.
- Stock is reserved when the pending order is created.
- Mercado Pago payment/preference is created for the order total.
- User is redirected to Mercado Pago to pay.
- Return pages are user-facing only and display the current known state.
- Webhook/server-side verification is the source of truth for marking orders paid or failed.
- Payment success moves the order to `paid`.
- Payment failure moves the order to `payment_failed` and releases reserved stock.
- Payment pending/confirming must show a clear user-facing state.
- Pending orders with no verified payment expire after 30 minutes, move to `expired`, and release reserved stock.
- Duplicate webhooks must be safe and idempotent.
- Delayed webhooks must be safe.
- Late payment confirmation after expiration must not automatically mark the order paid and must be surfaced for manual admin review.
- Confirmation email is sent only after payment is verified as `paid`.

## 13. Shipping / Fulfillment Requirements

- MVP uses fixed-cost shipping only.
- Shipping method: nationwide Argentina delivery through Correo Argentino for ARS 5.000.
- Pickup method: free local pickup in Benavidez/Zona Norte.
- Customer delivery/contact data is collected during checkout.
- Shipping address is required only for shipping orders.
- Pickup orders require contact data and may include optional notes.
- Fulfillment is manual.
- Admin updates order status manually after payment is verified.
- Shipping path is `paid -> preparing -> shipped -> delivered`.
- Pickup path is `paid -> preparing -> ready_for_pickup -> picked_up`.
- No Correo Argentino API, automated labels, dynamic rates, pickup point integration, or real-time tracking in MVP.

## 14. Admin Requirements

### Admin Authentication

- Admin can log in to protected admin screens.
- Invalid login, expired session, and unauthorized access must be handled clearly.

### Product Management

- Admin can create, edit, activate, and deactivate products.
- Admin can manage product category/type, description, base price, and slug generation.
- Admin cannot modify slugs after creation in MVP.

### Variant Management

- Admin can create and edit variants/SKUs for clothing and supplements.
- Admin can configure option values and variant-specific price overrides.
- Products must have at least one variant/SKU before being active.

### Stock Management

- Admin can update stock by variant/SKU.
- Admin sees exact stock counts.
- Public users see only availability labels.

### Image Upload / Management

- Admin can upload product images.
- Admin can reorder galleries.
- Admin can associate clothing images with visual variant/color when needed.
- Admin can use variant-specific supplement images when packaging differs.
- Failed uploads must preserve form state and allow retry.

### Order Management

- Admin can view actionable orders by default.
- Admin can filter/history payment and completed states.
- Admin can view order detail with customer, delivery/pickup, items, totals, payment/order status, and notes.
- Admin can edit fulfillment/contact fields after payment.
- Admin cannot edit order financial data or payment state.

### Fulfillment Workflow

- Admin can move shipping orders through the shipping fulfillment path.
- Admin can move pickup orders through the pickup fulfillment path.
- Invalid transitions are blocked.
- Manual cancellation/refund cases are handled outside the MVP system.

## 15. Edge Cases

- Out of stock: active product remains visible with `Sin stock`; add-to-cart is disabled.
- Variant unavailable: option is disabled or clearly marked; selected unavailable variant cannot be added.
- Price changed: cart honors add-to-cart price for 24 hours; expired snapshots refresh with notice.
- Cart invalid: checkout is blocked and the user is sent back to cart with actionable explanation.
- Payment failed: order becomes `payment_failed`, reserved stock is released, and retry requires fresh checkout.
- Payment pending: user sees pending/confirming state and support path.
- Webhook delayed: return page may show pending until server-side verification arrives.
- Duplicate webhook: event handling is idempotent and does not repeat side effects.
- User closes Mercado Pago: order remains `pending_payment` until webhook success/failure or 30-minute expiration.
- Guest order tracking: secure unguessable token allows read-only access without account.
- Image upload failure: admin can retry without losing product form progress.
- Admin edits stock while item is in cart: cart/add-to-cart/checkout validations refresh availability and prevent oversell.
- Product becomes inactive while in cart: cart/checkout detects it and blocks purchase with explanation.
- Late payment after expiration: order requires manual admin review and is not automatically paid.
- Network failure before order creation: show retry and avoid creating an order.
- Network failure after order creation: preserve known order state and avoid duplicate orders/preferences where possible.

## 16. Required But Not Yet Designed

- Search UI and results: required because MVP includes simple global product-name search. Minimum behavior is query input, result cards, product area context, and empty state. Can be refined during implementation.
- Product inactive direct URL page: required because inactive products hide from listings but direct URLs must show soft unavailable page. Minimum behavior is unavailable message and category return link. Can be refined during implementation.
- Out-of-stock and unavailable variant states: required to prevent invalid purchases. Minimum behavior is visible `Sin stock`, disabled add-to-cart, and clear selection feedback. Can be refined during implementation.
- Cart invalid states: required because stock, product status, variants, and price snapshots are validated server-side. Minimum behavior is actionable item-level notices and checkout blocked until resolved. Can be refined during implementation.
- Checkout validation states: required to prevent incomplete or invalid order creation. Minimum behavior is inline field errors and no order creation. Can be refined during implementation.
- Fixed shipping/pickup checkout selection: required because current checkout wireframe is generic and does not fully reflect MVP delivery rules. Minimum behavior is two delivery options with conditional address fields and costs. Can be refined during implementation.
- Mercado Pago handoff state: required because users leave the site to pay. Minimum behavior is a clear redirect/loading state. Can be refined during implementation.
- Payment success/failure/pending/expired pages: required for post-payment clarity. Minimum behavior is order number where available, known state, next steps, contact path, and retry guidance where applicable. Can be refined during implementation.
- Secure guest order-status page: required because there are no customer accounts. Minimum behavior is read-only order items, total, payment status, fulfillment status, delivery/pickup summary, and contact path. Can be refined during implementation.
- Confirmation email: required after verified payment. Minimum behavior is order number, total, delivery/pickup summary, next steps, WhatsApp/contact path, and secure status link. Can be refined during implementation.
- `Nosotros` page: required trust page. Minimum behavior is lean brand legitimacy copy and contact/Instagram links. Can be refined during implementation.
- `Envíos y cambios` page: required trust page. Minimum behavior is shipping, pickup, exchange, and support policy summary. Can be refined during implementation.
- Admin login: required for protected admin. Minimum behavior is credential form, invalid feedback, expired session handling, and route protection. Can be refined during implementation.
- Admin product/variant/stock/image screens: required for catalog operations. Minimum behavior is forms/tables for creating, editing, publishing, stock updates, image upload, ordering, and soft delete. Can be refined during implementation.
- Admin order list/detail and fulfillment controls: required for manual fulfillment. Minimum behavior is actionable queue, filters/history, order detail, allowed status transitions, editable fulfillment/contact fields, and internal notes. Can be refined during implementation.
- Admin manual payment review state: required for late payment after expiration. Minimum behavior is a visible review indicator and no automatic fulfillment transition. Can be refined during implementation.

## 17. Success Criteria

- A new mobile visitor quickly understands what Irruptivo sells.
- Clothing feels central to the brand identity.
- Supplements are easy to find without diluting the clothing-led positioning.
- Product grids are easy to scan.
- Product detail pages clearly show price, images, variants, availability, delivery/pickup, exchange information, and add-to-cart.
- Users can search products by name.
- Users can add available variants to cart without login.
- Cart validates stale price and stock conditions clearly.
- Users can complete guest checkout through Mercado Pago.
- Users can choose fixed shipping or free pickup.
- Payment success, failure, pending, and expired states are clear.
- Confirmation email is sent after verified payment.
- Guest order-status link works without customer account.
- Admin can manage products, variants, stock, images, and orders without direct database edits.
- Admin can fulfill paid orders manually using collected data.
- The site feels more professional than a WhatsApp-only selling flow.

## 18. Open Questions

- What are the exact launch products, variants, prices, descriptions, and product images?
- What are the exact WhatsApp and Instagram contact values?
- Which email provider and sender identity will be used for confirmation email?
- What image upload limits, rendition dimensions, accepted formats, and backup strategy will be used for VPS media storage?
- What exact Correo Argentino address field constraints should be enforced?
- How should manual admin review for late payment after expiration be represented in admin UI and notifications?

## 19. Out of Scope

- Customer-facing authentication and account area.
- Authenticated carts, cart merge, order history, saved addresses, and guest-order claiming.
- OAuth, social login, forgot password, and profile settings.
- Reviews, wishlist, loyalty, coupons, gift cards, bundles, subscriptions, recommendations, product comparison, and related-products engine.
- Advanced search, suggestions, typo tolerance, ranking, sorting complexity, and faceted filters.
- Backorders, preorders, waitlists, and back-in-stock notifications.
- Dynamic shipping, multiple paid shipping methods, Correo Argentino API integration, automated labels, pickup point integration, and shipment tracking.
- Refund/cancellation workflow in the app.
- Admin analytics, sales reports, bulk editing, staff roles, audit logs, CMS, blog, campaign management, and advanced customer management.
- External object storage, CDN image pipeline, microservices, event-driven architecture, realtime systems, multi-region deployment, and premature scalability work.

## 20. Implementation Principles

- Implementation should be organized around vertical slices, not horizontal layers.
- Domain-critical logic should be extracted into deep, testable modules.
- TDD-first should be used for cart logic, checkout calculation, stock validation, order state transitions, payment reconciliation, webhook idempotency, and admin order transitions.
- UI styling and visual polish do not require strict TDD, but should be manually verified against wireframes and UX requirements.
- Missing screens should be implemented conservatively from PRD requirements and refined during the relevant vertical slice.
- Avoid broad implementation issues like "build backend" or "build frontend" later.
- Prefer small, end-to-end, testable slices.

## 21. Testing Considerations

- Product browsing: test home CTAs, `/coleccion`, `/suplementos`, filters, active/inactive visibility, out-of-stock labels, and empty states.
- Variant selection: test required selection, availability labels, disabled unavailable variants, clothing color/size SKUs, supplement flavor/weight/presentation SKUs, and variant price overrides.
- Cart behavior: test localStorage item shape, quantity updates, remove, stock caps, inactive product handling, unavailable variant handling, 24-hour price snapshot validity, expired price refresh, and checkout blocking.
- Checkout validation: test required contact fields, delivery method selection, shipping address requirements, pickup without address, invalid cart handling, order total calculation, and no duplicate order on retry failures.
- Fixed shipping calculation: test ARS 5.000 shipping, ARS 0 pickup, subtotal plus delivery cost total, and order snapshot values.
- Mercado Pago payment state handling: test order creation before redirect, `pending_payment` initial status, preference creation, return page display-only behavior, success, failure, pending, and expired states.
- Webhook idempotency: test duplicate events, delayed events, unknown events, successful payment, failed payment, and late payment after expiration.
- Order status transitions: test `pending_payment -> paid`, `pending_payment -> payment_failed`, `pending_payment -> expired`, stock release rules, and blocked invalid transitions.
- Admin product management: test create/edit product, active/inactive behavior, immutable slug, required variants before active status, image upload metadata, image ordering, soft delete, variant stock, and price overrides.
- Admin order status changes: test default actionable queue, filters/history, shipping transition path, pickup transition path, blocked backward/cross-path/skip transitions, editable fulfillment/contact fields, and protected financial/payment fields.
