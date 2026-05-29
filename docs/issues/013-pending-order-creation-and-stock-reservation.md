# Issue 013: Pending Order Creation And Stock Reservation

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Create an order from a valid guest checkout before payment, snapshot order data, and reserve stock while the order is `pending_payment`.

## User Value

Customers get a real payment handoff backed by a structured order, while the business avoids overselling scarce variants.

## Scope

- Revalidate cart and checkout input on the server.
- Create order with status `pending_payment`.
- Snapshot item names, selected variants/options, quantities, unit prices, line totals, subtotal, delivery cost, total, contact data, delivery/pickup data, and notes.
- Generate secure guest order access token.
- Reserve stock for each ordered variant.
- Prevent order creation when stock is unavailable or cart data is invalid.
- Avoid duplicate order creation for retry-safe form submission where practical.

## Out of Scope

- Mercado Pago preference creation.
- Webhook reconciliation.
- Confirmation email.
- Admin order UI.
- Cancellation/refund workflows.

## Vertical Slice

After this issue, a valid checkout submission creates a pending order and reserves stock, ready for payment preference creation.

## Deep Modules

- Order creation module: owns checkout-to-order transformation and immutable order snapshots.
  - Public interface: `createPendingOrderFromCheckout`.
  - Testing implications: TDD-first for snapshots, totals, and invalid input.
- Stock reservation module: owns reserve/release accounting for pending payment orders.
  - Public interface: `reserveStockForOrder`, `getAvailableStock`.
  - Testing implications: TDD-first for stock availability and oversell prevention.
- Guest access token module: owns unguessable token generation and storage.
  - Public interface: `createGuestOrderAccessToken`.
  - Testing implications: TDD-first for presence and uniqueness at the behavior level.

## TDD Plan

- Test valid checkout creates `pending_payment` order.
- Test order stores immutable item and price snapshots.
- Test shipping and pickup totals are snapshotted correctly.
- Test stock is reserved on order creation.
- Test insufficient stock prevents order creation.
- Test invalid cart prevents order creation.
- Test guest access token is created.

## Acceptance Criteria

- [ ] Server validates cart, stock, prices, and checkout data before order creation.
- [ ] Order starts as `pending_payment`.
- [ ] Order stores item, contact, delivery, subtotal, delivery cost, and total snapshots.
- [ ] Stock is reserved for each ordered variant.
- [ ] Insufficient stock blocks order creation without partial reservation.
- [ ] Guest order access token is generated.
- [ ] Checkout can hand off a pending order to the payment slice.
- [ ] Any order-creation failure surfaced to the customer is Spanish (`es-AR`) and does not expose internal status values.

## Dependencies

- Issue 012: Guest Checkout Form And Delivery Methods.

## Risks

- Stock reservation must be atomic enough to prevent oversell.
- Network failure after order creation may cause duplicate attempts if not handled carefully.

## UX Notes

If order creation fails, keep the user on checkout or cart with actionable feedback and no Mercado Pago redirect.

## Future Extension Paths

- Separate payment and fulfillment status models.
- Order retry recovery.
- Inventory audit history.
