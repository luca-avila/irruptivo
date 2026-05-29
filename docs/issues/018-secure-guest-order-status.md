# Issue 018: Secure Guest Order Status

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Build a secure read-only guest order-status page accessed through an unguessable token.

## User Value

Guest customers can check order/payment and fulfillment status without creating an account.

## Scope

- Add guest order status route using secure token.
- Show order number, items, quantities, snapshotted product/variant details, total, payment/order status, delivery/pickup summary, and contact path.
- Ensure page is read-only.
- Ensure invalid/missing token does not expose order data.
- Show current state for pending, paid, failed, expired, preparing, shipped, delivered, ready for pickup, and picked up.
- Link from payment result pages where available.

## Out of Scope

- Customer login.
- Order history.
- Guest order claiming.
- Editing order data.
- Shipment tracking.

## Vertical Slice

After this issue, a paid or pending guest order can be reopened through a secure status link.

## Deep Modules

- Guest order access module: owns token lookup, read-only projection, and invalid access behavior.
  - Public interface: `getGuestOrderStatusByToken`.
  - Testing implications: TDD-first for valid token, invalid token, and no mutation behavior.
- Order status presenter: maps internal statuses to customer-readable labels and next steps.
  - Public interface: `getGuestOrderStatusView`.
  - Testing implications: TDD-first for status mapping.

## TDD Plan

- Test valid token returns only the intended order.
- Test invalid token returns not found or safe error.
- Test status page never allows mutation.
- Test each MVP status maps to a customer-readable label.
- Test financial and item snapshots are shown from order data, not current product price.

## Acceptance Criteria

- [ ] Guest status link uses an unguessable token.
- [ ] Valid token shows read-only order data.
- [ ] Invalid token exposes no order data.
- [ ] Page shows items, total, delivery/pickup summary, payment/order status, and contact path.
- [ ] No customer account is required or promoted.
- [ ] Payment result pages can link to guest status when token is available.
- [ ] All guest status page copy, next steps, and status labels are Spanish (`es-AR`).
- [ ] Raw internal statuses such as `ready_for_pickup` or `picked_up` are not rendered directly.

## Dependencies

- Issue 013: Pending Order Creation And Stock Reservation.
- Issue 015: Payment Result Pages.

## Risks

- Token leakage exposes read-only order details; keep URLs unguessable and avoid indexed pages.
- Status wording must distinguish pending payment from fulfillment progress.

## UX Notes

This page replaces customer account order history for MVP. Keep it calm, clear, and support-oriented.

## Future Extension Paths

- Token expiry policy.
- Customer account order claiming.
- Shipment tracking.
- Order support requests.
