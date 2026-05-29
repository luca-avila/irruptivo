# Issue 009: Add To Cart With Price Snapshot

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Allow a guest shopper to add a selected available variant to a localStorage cart with a 24-hour price snapshot.

## User Value

Shoppers can begin checkout without creating an account, and they receive clear feedback that the selected product was added.

## Scope

- Add localStorage cart item shape: variant/SKU reference, quantity, price snapshot, and snapshot timestamp.
- Validate selected product, product active status, variant existence, stock greater than zero, and current effective price on add-to-cart.
- Store add-to-cart price snapshot for 24 hours.
- Merge duplicate variant additions by increasing quantity within stock limits.
- Show add-to-cart success feedback.
- Update public cart count.
- Show graceful error feedback if stock/product status changes after page load.

## Out of Scope

- Full cart page.
- Checkout.
- Server-side cart persistence.
- Authenticated carts.
- Price snapshot expiration handling beyond storing the timestamp.

## Vertical Slice

After this issue, a user can add an available variant from a detail page and see the cart count/success state update.

## Deep Modules

- Cart domain: owns cart item shape, add operation, quantity merge behavior, and price snapshot timestamping.
  - Public interface: `addItem`, `getCartCount`, `serializeCart`, `hydrateCart`.
  - Testing implications: TDD-first for add, merge, stock cap, and price snapshot behavior.
- Product variant resolution: validates selected variant at add time.
  - Public interface: add-to-cart validation using product/variant read model.
  - Testing implications: TDD-first for inactive product, missing variant, and out-of-stock errors.

## TDD Plan

- Test adding a valid variant creates a cart item with quantity 1.
- Test adding the same variant merges quantities.
- Test quantity cannot exceed available stock.
- Test item stores variant reference, price snapshot, and timestamp.
- Test inactive product cannot be added.
- Test out-of-stock variant cannot be added.

## Acceptance Criteria

- [ ] Add-to-cart requires a selected available variant.
- [ ] Cart is stored in localStorage for guests.
- [ ] Cart item includes variant reference, quantity, price snapshot, and timestamp.
- [ ] Duplicate additions merge quantity without exceeding stock.
- [ ] Success feedback matches the direction of `docs/wireframes/product-added.png`.
- [ ] Failure feedback is clear and actionable.
- [ ] Add-to-cart success and failure feedback is Spanish (`es-AR`).
- [ ] Public cart count updates after successful add.

## Dependencies

- Issue 008: Product Detail With Variant Selection.

## Risks

- LocalStorage is user-controlled and must never be trusted at checkout.
- Add-to-cart must revalidate server-side to avoid stale stock decisions.

## UX Notes

Feedback should be quick and calm. Do not force account creation or interrupt the user with unnecessary steps.

## Future Extension Paths

- Cart drawer.
- Server-side cart for authenticated customers.
- Recently added item recommendations.
