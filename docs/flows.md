# 3) User Flows

## Goal

Define the main user journeys, decision points, required screens, and edge cases for Irruptivo's MVP ecommerce.

The ecommerce should support:

- Fast product discovery
- Product detail exploration
- Simple global product-name search
- LocalStorage cart
- Guest checkout
- Mercado Pago payment
- Argentina-only shipping and pickup
- Fixed ARS 5.000 Correo Argentino shipping
- Free local pickup coordinated by WhatsApp
- Stock reservation during payment
- Payment success/failure/pending states
- Secure guest order-status links
- Confirmation email
- Admin product/order management

Customer-facing authentication, customer accounts, authenticated carts, and order history are excluded from MVP.

---

## Flow Decisions

### Checkout

The system creates an order before redirecting the user to Mercado Pago.

Initial order status:

```txt
pending_payment
```

Mercado Pago webhook/server-side verification is the source of truth for payment confirmation.

### Delivery Methods

MVP delivery methods:

- `shipping`: Argentina nationwide through Correo Argentino, ARS 5.000
- `pickup`: free local pickup in Benavidez/Zona Norte, coordinated through WhatsApp after verified payment

Mercado Pago payment is required for both methods.

### Customer Accounts

No customer-facing authentication exists in MVP.

Customers can:

- Browse without login
- Search without login
- Add to cart without login
- Checkout as guests
- Access order status through secure guest link

### Order Statuses

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

`cancelled` is not part of the MVP order lifecycle.

### Stock Reservation

Stock is reserved when a `pending_payment` order is created.

Unpaid `pending_payment` orders expire after 30 minutes and release reserved stock.

Verified `payment_failed` orders release reserved stock immediately.

Late payment confirmation for an expired order goes to manual admin review, not automatic `paid`.

### Cart Persistence

Guest cart is stored in localStorage.

Cart items store:

- Variant/SKU reference
- Quantity
- Price snapshot
- Price snapshot timestamp

Add-to-cart price is honored for 24 hours. Increasing quantity refreshes that cart item to the current server price and restarts the 24-hour window. Expired price snapshots refresh to current server price with a user notice.

### Products And Variants

Every sellable product requires at least one variant/SKU.

Clothing:

- Stock is tracked by combined color/size SKU.
- Images are grouped by visual variant/color, not duplicated per size.

Supplements:

- Stock is tracked by combined flavor/weight/presentation SKU.
- Variant-specific images are used when packaging differs.

Variant-level price overrides are supported, with product base price as default.

### Product Status

Products can be:

- `active`
- `inactive`

Active out-of-stock products remain visible with `Sin stock`. Inactive products are hidden from listings/search but direct URLs show a soft unavailable page.

### Catalog And Search

MVP uses:

- `/coleccion`
- `/suplementos`

Product URLs:

- `/coleccion/[slug]`
- `/suplementos/[slug]`

Slugs are globally unique and immutable.

MVP search is simple global product-name search across active products.

---

## 1. Product Discovery Flow

### Goal

Allow users to quickly discover products, understand the catalog, and navigate naturally through the store.

### Happy Path

- Open Home
- View clothing-led hero
- Tap `Ver colección`
- Browse `/coleccion`
- Filter by clothing subcategory if needed
- Open product detail

Supplement path:

- Open Home or nav
- Open `/suplementos`
- Filter by supplement type if needed
- Open product detail

Search path:

- Tap search
- Enter product name
- View global results across active clothing and supplements
- Open product detail

### Important UX Priorities

- Fast scanning
- Large product imagery
- Minimal distractions
- Clear category separation
- Easy thumb navigation
- Simple filters
- Clear prices
- Clear availability labels

### Required States

Default clothing grid:

- Shows active clothing products.
- Supports subcategory filter only.

Default supplement grid:

- Shows active supplement products.
- Supports supplement type filter only.

Search results:

- Shows active products whose names match the query.
- Shows category/type context.
- Provides empty state when no results match.

Out-of-stock products:

- Remain visible if active.
- Show `Sin stock`.
- Do not allow add-to-cart.

Inactive products:

- Hidden from grids/search.
- Direct URLs show soft unavailable page.

### Edge Cases

Empty catalog:

- Show clear empty state.
- Provide next actions: return home, visit Instagram, contact WhatsApp.

Filters return no results:

- Show clear empty state.
- Offer clear filters action.

Search returns no results:

- Show no-results state.
- Offer return to `/coleccion` and `/suplementos`.

Slow image loading:

- Use placeholders.
- Avoid layout shift.

---

## 2. Product Detail Flow

### Goal

Allow users to understand the product and add it to cart with minimal friction.

The page should answer:

- What is this?
- What does it look like?
- How much does it cost?
- Is the selected variant available?
- Which variant should I choose?
- How does shipping or pickup work?
- What happens if I buy?

### Happy Path

- Open product detail
- View images
- Read essential product info
- Select variant/options
- Verify availability label
- Add to cart
- Receive add-to-cart feedback

### Required Product Information

- Product images
- Product name
- Price
- Description
- Category/type
- Variant selector
- Availability label
- Add-to-cart CTA
- Shipping/pickup information
- Exchange information
- Size guide when applicable
- WhatsApp/contact access

### Availability Labels

- `Disponible`: selected variant stock 4+
- `Últimas unidades`: selected variant stock 1-3
- `Sin stock`: selected variant stock 0

Exact stock counts are admin-only.

### Required States

No variant selected:

- Add-to-cart is disabled or shows clear selection feedback.

Variant available:

- Variant can be selected.
- Add-to-cart is enabled.

Variant out of stock:

- Option is disabled or clearly marked.
- Add-to-cart is disabled for that selection.

Product inactive:

- Show soft unavailable page.
- Prevent add-to-cart.
- Link back to relevant category.

Price snapshot:

- Price shown at add-to-cart is stored with cart item for 24 hours.

### Edge Cases

Stock changed after page load:

- Validate again on add-to-cart.
- Show updated availability if unavailable.

Product deactivated while open:

- Add-to-cart fails gracefully.
- User sees unavailable message.

Add-to-cart failure:

- Show error feedback.
- Allow retry when appropriate.

---

## 3. Cart Management Flow

### Goal

Allow users to review and adjust their purchase before checkout.

### Happy Path

- Open cart
- Review products and selected variants
- Modify quantity if needed
- Remove products if needed
- View subtotal
- Proceed to checkout

Shipping/pickup cost may be shown as an estimate before checkout and finalized after delivery method selection.

### Cart Data

LocalStorage stores:

- Variant/SKU reference
- Quantity
- Price snapshot
- Snapshot timestamp

Server refreshes:

- Product name
- Variant/options
- Images
- Availability
- Stock limits
- Price snapshot validity
- Current price when needed

### Cart Summary

Cart summary should show:

- Products subtotal
- Shipping/pickup cost when known
- Total
- Checkout CTA

### Required States

Empty cart:

- Show empty cart message.
- Provide actions to view `/coleccion` and `/suplementos`.

Valid cart:

- User can update quantity.
- User can remove items.
- User can proceed to checkout.

Invalid cart:

- Product inactive
- Variant unavailable
- Stock insufficient
- Price snapshot expired

### Edge Cases

Quantity exceeds stock:

- Cap quantity by available stock.
- Show stock limit feedback.

Price snapshot expired:

- Refresh item to latest server price.
- Show notice before checkout.

Quantity increase:

- Refresh item to latest server price.
- Restart 24-hour price window.

Cart state lost:

- Show empty cart state clearly.

---

## 4. Checkout Flow

### Goal

Allow users to complete the purchase with minimal friction and high trust.

### Happy Path: Shipping

- Open checkout
- Review order summary
- Enter contact information
- Select `Envio a domicilio`
- Enter shipping address
- Confirm ARS 5.000 shipping fee
- Submit checkout
- System validates cart, stock, and price snapshots
- System creates order as `pending_payment`
- System reserves stock
- System creates Mercado Pago preference
- User redirects to Mercado Pago
- Payment is verified server-side/webhook
- Order becomes `paid`
- User sees success/confirmation
- Confirmation email is sent

### Happy Path: Pickup

- Open checkout
- Review order summary
- Enter contact information
- Select `Retiro local`
- No shipping address required
- Confirm ARS 0 pickup cost
- Submit checkout
- System validates cart, stock, and price snapshots
- System creates order as `pending_payment`
- System reserves stock
- System creates Mercado Pago preference
- User redirects to Mercado Pago
- Payment is verified server-side/webhook
- Order becomes `paid`
- User sees success/confirmation with pickup coordination instructions
- Confirmation email is sent

### Checkout Form Data

Contact information:

- Full name
- Email
- Phone

Delivery method:

- Shipping
- Pickup

Shipping information, required only for shipping:

- Address
- City
- Province
- Postal code
- Additional delivery notes if needed

Pickup information:

- Optional notes if needed

Order information:

- Cart items
- Selected variants
- Quantities
- Subtotal
- Shipping/pickup cost
- Total

### Payment Behavior

Before redirecting to Mercado Pago:

- Validate checkout form
- Validate cart items
- Validate stock
- Validate price snapshots
- Calculate subtotal
- Add shipping/pickup cost
- Create order with status `pending_payment`
- Reserve stock
- Create Mercado Pago payment preference
- Redirect user to Mercado Pago

After payment:

- Verified payment success updates order to `paid`
- Verified payment failure updates order to `payment_failed` and releases stock
- No verified payment within 30 minutes updates order to `expired` and releases stock
- Late payment confirmation after expiration goes to manual review

### Required States

Form incomplete:

- Show inline validation.
- Do not create order.

Cart invalid:

- Prevent checkout.
- Send user back to cart with explanation.

Pending payment:

- Order exists and stock is reserved.
- Payment is not confirmed yet.

Payment success:

- Show success page.
- Show order number.
- Show delivery/pickup summary.
- Show next steps and WhatsApp contact.
- Provide guest order-status link.

Payment failure:

- Show failure page.
- Release stock.
- Allow user to return to cart and create a new order if retrying.

Payment pending/confirming:

- Explain payment is being confirmed.
- Provide support path.

Expired payment:

- Release stock.
- Require a fresh checkout to retry.

### Edge Cases

Network failure before order creation:

- Show retry.
- Do not create duplicate order.

Network failure after order creation:

- Preserve order state.
- Avoid duplicate order/payment preference when possible.

Mercado Pago return without webhook yet:

- Show pending/confirming state.

User closes Mercado Pago before returning:

- Order remains `pending_payment` until webhook success/failure or 30-minute expiration.

Stock changed during checkout:

- Prevent order creation.
- Ask user to update cart.

Late payment after expiration:

- Do not automatically mark paid.
- Put order into manual admin review.

---

## 5. Post-Purchase Flow

### Goal

Confirm purchase success and guide next steps clearly.

### Success Page Should Show

- Confirmation message
- Order number
- Payment status
- Order total
- Delivery or pickup summary
- Next steps
- WhatsApp/contact option
- Secure guest order-status link
- Return to store CTA

No account creation CTA is shown in MVP.

### Confirmation Email

After payment is verified as `paid`, send a basic confirmation email with:

- Order number
- Total
- Delivery or pickup summary
- Next steps
- WhatsApp/contact option
- Secure guest order-status link

### Guest Order Status

Guest order-status link:

- Uses an unguessable token.
- Is read-only.
- Shows order number, items, payment status, fulfillment status, total, delivery/pickup summary, and contact path.

### Edge Cases

Email delayed:

- Success page still shows confirmation and order link.

Webhook delay:

- Pending/confirming page explains that confirmation may take a moment.

Duplicate/uncertain payment state:

- Show current known state.
- Provide WhatsApp support path.

---

## 6. Admin Authentication Flow

### Goal

Allow administrators to securely access product/order management.

### Happy Path

- Admin opens admin login
- Enters credentials
- System verifies admin identity
- Admin accesses dashboard

### Edge Cases

Invalid credentials:

- Show clear feedback.
- Do not leak sensitive information.

Expired session:

- Redirect to admin login.

Unauthorized access:

- Block protected admin routes.

---

## 7. Product Management Flow

### Goal

Allow admins to manage products and inventory efficiently.

### Happy Path

- Admin login
- Open products
- Create/edit product
- Configure product category/type
- Upload/manage images
- Configure variants/SKUs
- Set stock per variant
- Set product base price and optional variant price overrides
- Set product active/inactive
- Save changes

### Product Form Should Support

- Product name
- Immutable globally unique slug generated on create
- Description
- Category/type
- Base price
- Active/inactive status
- Variants/SKUs
- Variant option values
- Variant stock
- Variant price override if needed
- Images/galleries

### Image Management

MVP image handling:

- Store uploaded files on persistent VPS filesystem outside app code/container.
- Store metadata/relative paths in PostgreSQL.
- Serve public images under controlled prefix such as `/media/products/...`.
- Generate thumbnail/grid, detail/mobile, and original/high-res variants.
- Strip metadata.
- Store dimensions.
- Support image ordering.
- Soft-delete image records before physical cleanup.

### Variant Requirements

Every sellable product must have at least one variant/SKU.

No variants:

- Prevent publishing as active.

Stock missing:

- Warn or prevent publishing depending on validation rule.

Active product with all variants out of stock:

- Public product remains visible as `Sin stock`.

### Edge Cases

Image upload failure:

- Retry upload.
- Preserve form state.

Invalid product data:

- Show inline validation.

Product deactivated while in cart:

- Cart/checkout detects product is no longer purchasable.

---

## 8. Order Management Flow

### Goal

Allow admins to track and update fulfillment for paid orders.

### Default Admin Queue

Default actionable order queue shows:

- `paid`
- `preparing`
- `ready_for_pickup`
- `shipped`

Payment/history filters expose:

- `pending_payment`
- `payment_failed`
- `expired`
- `delivered`
- `picked_up`

### Order List Should Show

- Order number
- Customer name
- Date
- Payment status/order status
- Delivery method
- Total
- Delivery city/province when shipping
- Quick status indication

### Order Detail Should Show

- Customer contact information
- Delivery or pickup information
- Items
- Snapshotted product/variant details
- Quantities
- Payment status/order status
- Total
- Notes
- Status update actions

### Fulfillment Transitions

Payment states are system-controlled.

Shipping orders:

- `paid -> preparing -> shipped -> delivered`

Pickup orders:

- `paid -> preparing -> ready_for_pickup -> picked_up`

Admin cannot move orders backward or across delivery-method paths.

Admin cannot cancel orders in MVP.

### Admin Edits After Payment

Admin may edit:

- Contact fields
- Delivery fulfillment fields
- Pickup notes/coordination notes
- Internal/admin note

Admin may not edit:

- Items
- Quantities
- Prices
- Totals
- Shipping cost
- Payment amount
- Payment status

### Edge Cases

Invalid status transition:

- Prevent invalid change.
- Explain why action is unavailable.

Network failure:

- Preserve update state.
- Allow retry.

Missing fulfillment information:

- Highlight missing fields.
- Prevent impossible fulfillment actions if needed.

Customer requests cancellation/refund:

- Handle manually outside the app.
- Do not change order status to `cancelled` in MVP.

Payment confirmed but order not updated yet:

- Surface pending sync/payment confirmation state where relevant.

Late payment after expiration:

- Surface manual review requirement.

---

## 9. System Feedback Requirements

Across all flows, the interface should provide clear feedback for:

- Loading
- Success
- Error
- Empty states
- Validation errors
- Network failures
- Payment pending
- Payment failed
- Payment expired
- Stock unavailable
- Price snapshot expired
- Unauthorized access
- Saved changes
- Add-to-cart confirmation

Feedback should be:

- Clear
- Short
- Calm
- Actionable
- Consistent with the brand tone

---

## 10. MVP Flow Boundaries

Included in MVP:

- Product discovery
- Separate `/coleccion` and `/suplementos`
- Simple global product-name search
- Basic category/type filtering
- Product detail
- Generic combined variants/SKUs
- LocalStorage cart
- Guest checkout
- Mercado Pago payment
- Fixed ARS 5.000 shipping
- Free local pickup
- Order creation before payment
- Stock reservation at pending payment
- 30-minute pending payment expiration
- Payment success/failure/pending/expired states
- Secure guest order-status link
- Confirmation email
- Admin login
- Product management
- Image management
- Stock/variant management
- Order management
- Manual fulfillment support

Excluded from MVP:

- Customer-facing authentication
- Customer account area
- Authenticated cart
- Order history
- Guest-order claiming
- Advanced search
- Complex filtering
- Wishlist
- Reviews
- Discounts/coupons
- Loyalty system
- OAuth
- Forgot password
- Saved addresses
- Dynamic shipping calculation
- Correo Argentino API integration
- Shipment tracking
- Refund/cancellation management
- Advanced analytics
- Complex admin roles
- Multi-store support
- CMS/blog
- Product recommendations

---

## 11. Remaining Non-Blocking Inputs

These should be specified during PRD, UI, or implementation but do not block PRD:

- Exact launch products
- Exact product variants
- Exact product photos
- Exact WhatsApp/Instagram contact values
- Exact email provider/sender identity
- Exact VPS backup plan for uploaded images
- Exact image size and format limits
- Exact Correo Argentino address field constraints
