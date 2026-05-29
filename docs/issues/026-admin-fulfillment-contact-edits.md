# Issue 026: Admin Fulfillment Contact Edits

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Allow admin to edit fulfillment/contact fields and internal notes after payment while preserving immutable financial order data.

## User Value

The owner can correct practical fulfillment details without corrupting what the customer paid for.

## Scope

- Add edit controls for customer contact fields needed for fulfillment.
- Add edit controls for delivery address/notes on shipping orders.
- Add edit controls for pickup notes/coordination notes on pickup orders.
- Add internal/admin note field.
- Block edits to items, quantities, unit prices, totals, shipping cost, payment amount, payment status, and order financial snapshots.
- Show clear save success/error feedback.

## Out of Scope

- Item changes.
- Refunds, cancellations, exchanges, or payment adjustments.
- Audit logs.
- Customer self-service edits.

## Vertical Slice

After this issue, admin can correct operational fields on paid orders without compromising financial integrity.

## Deep Modules

- Admin order edit guard: owns allowed mutable fields and immutable financial fields.
  - Public interface: `updateOrderFulfillmentFields`, `canEditOrderField`.
  - Testing implications: TDD-first for allowed and rejected field edits.

## TDD Plan

- Test contact field edits are allowed.
- Test shipping address/notes edits are allowed for shipping orders.
- Test pickup notes edits are allowed for pickup orders.
- Test item/quantity/price/total/payment edits are rejected.
- Test internal notes can be added or updated.
- Test rejected edits do not partially mutate order.

## Acceptance Criteria

- [ ] Admin can edit fulfillment contact fields.
- [ ] Admin can edit shipping fulfillment fields for shipping orders.
- [ ] Admin can edit pickup coordination notes for pickup orders.
- [ ] Admin can add internal/admin notes.
- [ ] Financial and payment fields are immutable from admin UI and server actions.
- [ ] Save feedback is clear.
- [ ] Admin edit labels, read-only labels, save feedback, and validation errors are Spanish (`es-AR`).

## Dependencies

- Issue 024: Admin Order Queue And Detail.

## Risks

- Allowing too many fields could corrupt order records.
- Without audit logs, operational edits should remain intentionally narrow.

## UX Notes

Group editable fulfillment fields separately from read-only order financials. Make immutable sections visually clear.

## Future Extension Paths

- Audit logs.
- Customer support notes.
- Controlled order adjustment workflow.
- Refund/exchange workflow.
