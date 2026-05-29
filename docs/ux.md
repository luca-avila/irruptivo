# 2) UX Thinking

## Goal

Design the user experience before designing the system.

The ecommerce should create a professional, mobile-first shopping experience for Irruptivo: a fitness/lifestyle brand that sells clothing/sportswear as the identity driver and third-party supplements as a supporting commercial category.

The experience should feel:

- Clean
- Fast
- Trustworthy
- Visually consistent
- Premium
- Direct
- Athletic
- Minimal
- Easy to navigate
- Professional without feeling distant

The ecommerce should prioritize:

- Quick product discovery
- Strong brand perception
- Clothing-led positioning
- Low-friction mobile navigation
- Clear product detail pages
- Real guest checkout
- Clear Mercado Pago handoff
- Transparent shipping and pickup expectations
- Trust for new customers
- Operationally simple admin workflows

---

## Product Context

Irruptivo has two product realities:

1. Clothing/sportswear is becoming the central brand direction for the ecommerce experience.
2. Supplements are already part of the business, but they are third-party products resold/curated by Irruptivo.

The UX should support both categories, but clothing should lead the brand perception. Supplements should be available and easy to buy without making the site feel like a generic supplement store.

---

## UX Strategy

The UX should balance three priorities:

1. **Brand-building**

- Make Irruptivo feel premium, professional, and legitimate.
- Communicate a strong visual identity from the first impression.
- Make clothing/sportswear the primary first-viewport signal.

2. **Product discovery**

- Help users quickly understand what the brand sells.
- Keep `/coleccion` and `/suplementos` separate and easy to reach.
- Keep filters basic because the launch catalog is expected to be small.

3. **Simple purchase flow**

- Allow users to buy as guests.
- Use Mercado Pago for payment.
- Collect contact and delivery/pickup data internally.
- Keep fulfillment manual through Correo Argentino or WhatsApp-coordinated pickup.
- Provide confirmation email and secure guest order-status access after verified payment.

---

## Users / Roles

## Customers

Primary audience hypothesis:

- Young adults, roughly 20-35
- Fitness-oriented users
- Argentina-based
- Local audience initially around Benavidez/Zona Norte plus nationwide shipping
- Mostly mobile-heavy users
- Likely middle and middle-low income users in Argentina
- Users discovering the brand through Instagram, ads, word of mouth, WhatsApp, or direct links

This audience definition is still an assumption and should be validated over time.

Customers likely value:

- Speed
- Simplicity
- Trust
- Product visuals
- Clear prices
- Easy navigation
- Visible sizes/variants
- Clear availability labels
- Payment clarity
- Delivery/pickup clarity
- Low-friction checkout
- Confidence that the brand is real and reliable

### Customer Needs

Customers need to quickly understand:

- What Irruptivo is
- What products are available
- Whether clothing or supplements fit their intent
- Whether the brand feels trustworthy
- Product price
- Product images
- Sizes and variants
- Availability
- Payment method
- Shipping/pickup expectations
- Exchange expectations
- How to complete the purchase
- How to contact the brand

## Admin

The admin experience is part of the MVP.

Admin needs to:

- Log in through protected admin auth
- Create and edit products
- Activate/deactivate products
- Upload/manage images
- Reorder image galleries
- Manage variants/SKUs
- Manage stock by variant
- Review orders
- Filter payment/history states
- Update fulfillment status through allowed transitions
- See customer/order information needed for fulfillment
- Edit contact/delivery fulfillment fields after payment when needed

Admin does not need customer-account management in MVP.

Admin experience should prioritize:

- Clarity
- Speed
- Low operational friction
- Simple tables/forms
- Minimal visual complexity
- Reliable feedback after actions
- Mistake prevention

---

## Customer Authentication

Customer-facing authentication is excluded from MVP.

Customers can:

- Browse without login
- Search products
- Add to cart without login
- Checkout as guests
- Receive confirmation email after verified payment
- Access order status through a secure guest link

The public MVP should not include customer register, login, account dashboard, authenticated cart persistence, saved addresses, order history, or guest-order claiming.

Admin authentication remains required for product and order management.

---

## Context of Use

The ecommerce will mostly be used:

- On mobile devices
- During short browsing sessions
- Through Instagram/social traffic
- Through WhatsApp/direct links
- By users already somewhat interested in fitness, training, supplements, or sportswear
- By users who may not know the brand yet
- By users who need quick trust signals before buying

The product catalog is expected to be relatively small at first.

Because the catalog is small, the UX should avoid marketplace-style complexity.

---

## Information Architecture

## Customer-Facing Areas

Initial IA:

- Home
- Colección
- Suplementos
- Product details
- Search results
- Cart
- Checkout
- Payment result
- Success
- Failure
- Pending/confirming
- Guest order status
- Nosotros
- Envíos y cambios
- Contact / WhatsApp

There is no customer account area in MVP.

## Admin Areas

Initial admin IA:

- Admin login
- Admin dashboard
- Products
- Product list
- Create product
- Edit product
- Variants/SKUs
- Stock
- Images
- Orders
- Order list
- Order detail
- Status update
- Payment/history filters

---

## Navigation Priorities

## Primary Customer Goals

1. Understand the brand.
2. Explore clothing-led collection.
3. Explore supplements if relevant.
4. Search by product name.
5. View product details.
6. Select variant/size/flavor/presentation.
7. Add to cart.
8. Choose shipping or pickup.
9. Pay through Mercado Pago.
10. Receive confirmation and next steps.

## Secondary Customer Goals

- Check shipping and pickup information.
- Check exchange rules.
- View size guide.
- Contact through WhatsApp.
- Visit Instagram.
- Reopen order status through secure guest link.

## Admin Goals

1. Add/update products.
2. Manage images and gallery order.
3. Manage variants/SKUs.
4. Manage stock.
5. Review actionable orders.
6. Update fulfillment status.
7. Access customer delivery/pickup information.

---

## Product Catalog Direction

## Main Product Areas

MVP customer-facing pages:

- `/coleccion`
- `/suplementos`

Product detail URLs:

- `/coleccion/[slug]`
- `/suplementos/[slug]`

Slugs are globally unique and immutable after creation.

## Homepage

The homepage should lead with clothing.

Hero direction:

- One primary CTA: `Ver colección` linking to `/coleccion`
- Clothing/sportswear as the main first impression
- Supplements appear after the clothing-led section and in navigation

## Clothing

Clothing should feel central to the brand identity.

Important UX needs:

- Strong product photography
- Image galleries grouped by visual variant/color
- Clear product detail pages
- Size selection
- Color selection when applicable
- Variant availability labels
- Fit/material information
- Size guide
- Clear add-to-cart CTA

Clothing filters in MVP:

- Product subcategory only, such as Todo, Remeras, Shorts

No size/color grid filters in MVP.

## Supplements

Supplements should be easy to find and buy, but they should not dominate the identity.

Supplements are third-party products resold/curated by Irruptivo.

Important UX needs:

- Clear product name
- Third-party brand/manufacturer when relevant
- Product type/category
- Flavor/weight/presentation variant selection
- Variant image when packaging differs
- Availability label
- Price
- Factual product information only
- Clear add-to-cart CTA

Supplement filters in MVP:

- Product type only, such as Todo, Proteina, Creatina, Pre-entreno

No flavor/weight/presentation grid filters in MVP.

## Search

MVP includes simple global product-name search.

Search should:

- Search active products across clothing and supplements
- Match product names only
- Show simple result cards
- Show product area/type clearly
- Link to product detail
- Show an empty state when no results match

No advanced search, typo tolerance, ranking, sorting, or faceted filtering in MVP.

---

## Product Detail UX

Product detail pages should answer:

- What is this?
- What does it look like?
- How much does it cost?
- Is the selected variant available?
- Which variant should I choose?
- How does shipping or pickup work?
- What happens if I buy?
- How can I contact the brand?

Required product information:

- Product images
- Product name
- Price
- Description
- Category/type
- Variant selector
- Availability label
- Add to cart CTA
- Shipping/pickup information
- Exchange information
- Size guide when applicable
- WhatsApp/contact access

Public stock labels:

- `Disponible`: 4+ units
- `Últimas unidades`: 1-3 units
- `Sin stock`: 0 units

Exact stock counts are admin-only.

Active out-of-stock products remain visible with `Sin stock`; add-to-cart is disabled. Inactive products are hidden from listings/search but direct links show a soft unavailable page.

---

## Cart UX

Cart should show:

- Product image
- Product name
- Selected variant/options
- Unit price
- Quantity
- Line total
- Remove/update actions
- Subtotal
- Shipping or pickup cost when known
- Total
- Checkout CTA
- Clear feedback for stock or price issues

Cart behavior:

- Guest cart is stored in localStorage.
- Add-to-cart price is honored for 24 hours.
- Quantity increase refreshes the item to current server price.
- Expired price snapshots refresh with a clear notice.
- Cart quantities are capped by available stock.
- Server validates product, variant, stock, price snapshot, and availability before order creation.

---

## Checkout UX

Checkout should feel like a real ecommerce checkout, not an informal WhatsApp order.

Checkout should include:

- Contact information
- Delivery method selection
- Shipping address fields only when home shipping is selected
- Optional notes
- Order summary
- Mercado Pago handoff
- Clear validation errors
- Explanation of next steps after payment

Delivery methods:

- `Envio a domicilio`: Argentina nationwide through Correo Argentino, ARS 5.000
- `Retiro local`: free pickup in Benavidez/Zona Norte, coordinated by WhatsApp after verified payment

Payment:

- Mercado Pago is required for both delivery methods.
- The app creates an order before redirecting to Mercado Pago.
- Webhook/server-side verification is the source of truth.
- Return pages display the current known state: success, failed, or pending/confirming.

---

## Post-Purchase UX

After payment, the user should receive:

- Clear result page
- Order number
- Payment status
- Order total
- Delivery or pickup summary
- Next steps
- WhatsApp/contact option
- Secure guest order-status link
- Confirmation email after payment is verified as paid

No account creation CTA is shown in MVP.

Manual fulfillment should still feel professional and predictable.

---

## Trust UX

Trust should come from clarity, not overexplaining.

Important trust signals:

- Real product photos
- Visible Instagram
- Visible WhatsApp/contact option
- Clear Mercado Pago handoff
- Confirmation email
- Secure guest order-status link
- Clear shipping and pickup information
- Clear exchange information
- Size guide
- Product materials/details
- Lean Nosotros page/section
- Dedicated Envíos y cambios page
- Consistent visual identity
- Smooth interactions

---

## Admin UX

Admin screens should emphasize:

- Tables
- Forms
- Status badges
- Clear actions
- Confirmation feedback
- Error prevention
- Simple filtering
- Operational focus

Default order queue should show only actionable fulfillment orders:

- `paid`
- `preparing`
- `ready_for_pickup`
- `shipped`

Payment/history filters should expose:

- `pending_payment`
- `payment_failed`
- `expired`
- `delivered`
- `picked_up`

Fulfillment status transitions are constrained by delivery method.

Shipping:

- `paid -> preparing -> shipped -> delivered`

Pickup:

- `paid -> preparing -> ready_for_pickup -> picked_up`

Admin cannot cancel orders in MVP. Exceptional cancellations/refunds are handled manually outside the app.

After payment, admin may edit fulfillment/contact fields only. Admin may not edit items, quantities, prices, totals, shipping cost, payment amount, or payment status.

---

## UI Direction

### Visual Characteristics

The UI should use:

- Neutral/minimal base
- Strong whitespace
- Dark accents for contrast
- Athletic/premium visual feel
- Large product photography
- Direct copy
- Minimal visual noise
- Clear typography hierarchy
- Strong but controlled brand elements

The tone should be:

- Minimal
- Direct
- Premium
- Athletic
- Confident
- Clean

It should avoid feeling:

- Corporate
- Cold
- Flashy
- Overdesigned
- Cheap
- Generic
- Like a supplement marketplace

### Visual Reference Direction

Closest reference direction:

- Gymshark-style modern fitness ecommerce
- Minimal/direct athletic presentation
- Strong product imagery
- Mobile-first product discovery
- Premium but accessible tone

This is a reference direction, not a copy target.

### Copy Direction

The copy should be:

- Minimal
- Direct
- Confident
- Premium but not pretentious
- Athletic without exaggerated claims

Avoid:

- Excessive motivational language
- Custom health/performance claims for supplements
- Generic ecommerce phrases
- Too much text
- Corporate language

Final copy should be refined later during UI exploration.

---

## Reusable UX Patterns

Potential reusable patterns:

- Product cards
- Category sections
- Product image gallery
- Variant selector
- Size selector
- Quantity selector
- Add-to-cart button
- Cart drawer/page
- Checkout form fields
- Delivery method selector
- Order summary
- Payment status messages
- Guest order-status page
- Admin login
- Admin tables
- Admin forms
- Image upload/gallery management
- Stock/status badges
- Loading states
- Empty states
- Error states

---

## UX Principles

### Core Principles

- Mobile-first
- Low cognitive load
- Clear hierarchy
- Fast product discovery
- Fast task completion
- Minimal visual noise
- Large/high-quality product visuals
- Clear system feedback
- Predictable navigation
- Trust-oriented UI
- Minimal but strong branding
- Functionality before decoration

### Ecommerce-Specific Principles

- Price, variant, availability, and CTA must be clear.
- Product images should carry most of the visual weight.
- Users should not need an account to buy.
- Checkout should clearly explain what happens next.
- Shipping, pickup, and manual fulfillment should be transparent.
- Mercado Pago should feel integrated and trustworthy.
- Admin workflows should be simple and reliable.

### Brand-Specific Principles

- Clothing should lead the brand perception.
- Supplements should support the business without diluting the identity.
- The experience should feel athletic, minimal, premium, and direct.
- The UI should avoid generic ecommerce/template aesthetics.
- Trust should be built through clarity, consistency, and real information.

---

## Success Metrics

Because the brand is early-stage, success should not be measured only by conversion rate.

### Early UX / Product Success

- Users understand what Irruptivo sells quickly.
- Users perceive the brand as professional and trustworthy.
- Users can browse from mobile without confusion.
- Users can find clothing and supplements easily.
- Users can understand product price, stock labels, and variants.
- Users can complete guest checkout without unnecessary friction.
- Users understand shipping and pickup options before payment.
- Users receive clear confirmation and order-status access after purchase.
- Admin can manage products and orders without confusion.

### Business-Oriented Signals

- Instagram/ad visitors have a credible destination.
- People outside the founder's close network can understand and trust the brand.
- Product pages can be shared directly.
- Orders can be received in a structured way.
- Manual fulfillment is supported by clear order data.
- The brand can start learning from real traffic and purchase behavior.

---

## Remaining UX Inputs For Later Stages

These do not block PRD, but should be specified during design/content/implementation:

- Exact launch products
- Exact product variants
- Exact product photography/assets
- Exact final brand copy
- Exact WhatsApp and Instagram contact values
- Exact email copy and sender identity
- Exact checkout field labels

---

## Outputs

This UX stage produces:

- UX insights
- Information architecture
- User flow direction
- Wireframe direction
- Visual identity direction
- Checkout UX direction
- Admin UX direction
- Design system foundations
- Product and trust constraints for PRD
