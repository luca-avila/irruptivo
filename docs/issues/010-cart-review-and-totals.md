# Issue 010: Cart Review And Totals

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Build the cart page for reviewing guest cart items, changing quantities, removing items, and seeing subtotal/total information before checkout.

## User Value

Shoppers can confirm exactly what they intend to buy before entering checkout.

## Scope

- Render cart items from localStorage.
- Refresh item display data from the server: product name, variant/options, image, current availability, stock limit, and current price where needed.
- Show selected variants/options, unit price, quantity controls, line total, subtotal, and checkout CTA.
- Support quantity increase/decrease and remove item.
- Cap quantity by available stock.
- Show empty cart state with paths to `/coleccion` and `/suplementos`.
- Show shipping/pickup cost as unknown or estimated until checkout delivery method is selected.

## Out of Scope

- Checkout form.
- Order creation.
- Payment integration.
- Invalid cart blocking beyond basic stock caps; detailed invalid resolution is next slice.
- Server-side carts.

## Vertical Slice

After this issue, a guest shopper can review and edit their cart from `/cart` or equivalent cart route.

## Deep Modules

- Cart domain: owns quantity changes, removal, line totals, subtotal, and stock caps.
  - Public interface: `updateQuantity`, `removeItem`, `calculateCartSubtotal`, `getLineTotal`, `getCartSummary`.
  - Testing implications: TDD-first for quantity and total behavior.
- Shipping calculation: exposes delivery cost only when a delivery method is known.
  - Public interface: `getDeliveryCost`.
  - Testing implications: covered by Issue 001 and reused here.

## TDD Plan

- Test quantity update changes line total and subtotal.
- Test quantity cannot exceed available stock.
- Test remove item updates cart count and subtotal.
- Test empty cart summary returns zero subtotal.
- Test shipping cost is not forced before delivery method selection.

## Acceptance Criteria

- [ ] Cart renders items from localStorage using refreshed server data.
- [ ] Cart shows image, product name, selected variant/options, unit price, quantity, and line total.
- [ ] Quantity updates are persisted locally and capped by stock.
- [ ] Item removal works.
- [ ] Subtotal is calculated from cart line totals.
- [ ] Empty cart state matches `docs/wireframes/cart-empty.png`.
- [ ] All visible cart labels, totals, CTAs, and empty-state copy are Spanish (`es-AR`).
- [ ] Filled cart state follows `docs/wireframes/cart.png`.

## Dependencies

- Issue 009: Add To Cart With Price Snapshot.

## Risks

- Server refresh must not trust client-provided product names or prices.
- Quantity controls can become confusing if stock changes between refreshes.

## UX Notes

Keep totals and checkout CTA visible and legible on mobile. Empty cart should provide clear actions back to product browsing.

## Future Extension Paths

- Cart drawer.
- Saved carts.
- Shipping estimator.
- Discount code entry.
