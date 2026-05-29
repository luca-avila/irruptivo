# Issue 024: Admin Order Queue And Detail

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Build admin order list and detail pages focused on actionable manual fulfillment.

## User Value

The owner can see paid orders that need work and inspect the customer, delivery, item, payment, and status information needed to fulfill them.

## Scope

- Add default admin order queue for `paid`, `preparing`, `ready_for_pickup`, and `shipped`.
- Add filters/history for `pending_payment`, `payment_failed`, `expired`, `delivered`, and `picked_up`.
- Order list shows order number, customer name, date, status, delivery method, total, and shipping city/province when relevant.
- Order detail shows contact data, delivery/pickup data, items, snapshotted product/variant details, quantities, payment/order status, total, notes, and manual review indicator when relevant.
- Make financial data read-only.
- Include loading, empty, and error states.

## Out of Scope

- Status transition actions; next slice.
- Editing contact/fulfillment fields; separate slice.
- Refunds/cancellations.
- Sales reporting or analytics.

## Vertical Slice

After this issue, admin can view the operational order queue and inspect order details without touching the database.

## Deep Modules

- Admin order projection: maps order records into actionable queue and detail views.
  - Public interface: `listAdminOrders`, `getAdminOrderDetail`.
  - Testing implications: TDD-first for default queue filtering and immutable snapshot display.
- Payment/manual review projection: surfaces expired-late-payment review state.
  - Public interface: order detail view flags.
  - Testing implications: verify review indicators appear without changing payment state.

## TDD Plan

- Test default queue includes only actionable statuses.
- Test history filters expose non-actionable statuses.
- Test order detail uses snapshotted item data.
- Test financial fields are read-only in view model.
- Test late payment/manual review flag appears when present.

## Acceptance Criteria

- [ ] Admin order list is protected by admin auth.
- [ ] Default queue shows `paid`, `preparing`, `ready_for_pickup`, and `shipped`.
- [ ] Filters expose pending, failed, expired, delivered, and picked-up orders.
- [ ] Order detail shows all required customer, delivery, item, status, total, and note information.
- [ ] Paid order financial data is displayed read-only.
- [ ] Manual review requirement is visible when late payment after expiration is detected.
- [ ] Admin order tables, filters, badges, empty/error states, and detail labels are Spanish (`es-AR`).
- [ ] Raw internal statuses such as `paid`, `ready_for_pickup`, or `payment_failed` are not rendered directly.

## Dependencies

- Issue 013: Pending Order Creation And Stock Reservation.
- Issue 016: Mercado Pago Webhook Reconciliation.
- Issue 017: Pending Payment Expiration.
- Issue 020: Admin Auth And Protected Shell.

## Risks

- If payment and fulfillment share one status, admin labels must be clear.
- Sensitive customer data must stay behind admin auth.

## UX Notes

Use tables, badges, filters, and concise status labels. Default view should prioritize work that needs action.

## Future Extension Paths

- Sales reports.
- Bulk fulfillment actions.
- Audit logs.
- Export orders.
