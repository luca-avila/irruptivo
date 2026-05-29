# Issue 025: Admin Fulfillment Transitions

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Allow admin to move paid orders through valid fulfillment statuses only.

## User Value

The owner can track manual shipping and pickup fulfillment while avoiding invalid order states.

## Scope

- Add allowed status actions on admin order detail.
- Shipping path: `paid -> preparing -> shipped -> delivered`.
- Pickup path: `paid -> preparing -> ready_for_pickup -> picked_up`.
- Prevent backward transitions.
- Prevent skipping `preparing`.
- Prevent cross-path transitions, such as shipping a pickup order.
- Prevent admin mutation of payment-controlled states.
- Show success/error feedback after transition.

## Out of Scope

- Cancellation/refund status.
- Shipment tracking.
- Correo Argentino API.
- Customer notification emails for fulfillment changes.
- Editing order data.

## Vertical Slice

After this issue, admin can progress paid orders through the correct manual fulfillment path.

## Deep Modules

- Admin order transition module: owns delivery-method-specific fulfillment transitions.
  - Public interface: `getAllowedAdminTransitions`, `transitionOrderFulfillmentStatus`.
  - Testing implications: TDD-first for every valid and invalid transition.
- Order lifecycle module: protects payment-controlled statuses from admin changes.
  - Public interface: status guard used by admin actions.
  - Testing implications: TDD-first for blocked payment-state mutations.

## TDD Plan

- Test shipping valid path in order.
- Test pickup valid path in order.
- Test skipping `preparing` is rejected.
- Test backward transition is rejected.
- Test cross delivery-method transition is rejected.
- Test pending/failed/expired payment statuses cannot be moved by admin.
- Test delivered/picked-up terminal statuses have no forward MVP actions.

## Acceptance Criteria

- [ ] Admin detail shows only valid next actions.
- [ ] Shipping orders can move through `paid -> preparing -> shipped -> delivered`.
- [ ] Pickup orders can move through `paid -> preparing -> ready_for_pickup -> picked_up`.
- [ ] Invalid transitions are blocked server-side.
- [ ] Admin cannot change payment status.
- [ ] Transition feedback is clear.
- [ ] Order queue updates after status changes.
- [ ] Admin transition buttons, status labels, disabled reasons, and success/error feedback are Spanish (`es-AR`).
- [ ] Raw internal statuses such as `shipped`, `delivered`, or `picked_up` are not rendered directly.

## Dependencies

- Issue 001: MVP Domain Rules Kernel.
- Issue 024: Admin Order Queue And Detail.

## Risks

- UI-only guards are insufficient; transitions must be validated server-side.
- Strict transitions may feel click-heavy but reduce operational ambiguity.

## UX Notes

Use badges and explicit buttons for the next allowed step. Disabled actions should explain why unavailable only when useful.

## Future Extension Paths

- Controlled correction workflow.
- Shipment tracking fields.
- Fulfillment notification emails.
- Refund/cancellation workflow.
