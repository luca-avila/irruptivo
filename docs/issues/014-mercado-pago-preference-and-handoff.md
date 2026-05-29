# Issue 014: Mercado Pago Preference And Handoff

## Type

AFK

### AFK

Can be implemented without human clarification if Mercado Pago credentials are provided through environment variables.

### HITL

Not applicable unless credentials, app URLs, or Mercado Pago account access are unavailable during implementation.

## Goal

Create a Mercado Pago payment preference for a pending order and redirect the customer to payment.

## User Value

Customers can pay through a familiar and trusted Argentina payment provider after completing checkout.

## Scope

- Create Mercado Pago preference for the pending order total.
- Include order reference metadata needed for webhook reconciliation.
- Configure return URLs for success, failure, and pending/confirming pages.
- Show a clear handoff/loading state before redirect.
- Store payment/preference reference against the order.
- Ensure Mercado Pago is the only MVP payment path.
- Avoid marking the order as paid from the redirect flow.

## Out of Scope

- Webhook verification and order payment transitions.
- Confirmation email.
- Retrying failed payments.
- Multiple payment providers.

## Vertical Slice

After this issue, checkout can create a pending order, create a Mercado Pago preference, and send the customer to Mercado Pago.

## Deep Modules

- Payment preference adapter: isolates Mercado Pago preference creation behind a small interface.
  - Public interface: `createPaymentPreferenceForOrder(order)`.
  - Testing implications: TDD-first for request payload mapping with a mocked provider; integration tests can be added separately.

## TDD Plan

- Test preference payload uses order total and snapshotted item data.
- Test order reference metadata is included.
- Test return URLs map to success, failure, and pending states.
- Test preference reference is persisted.
- Test failed preference creation leaves order pending and returns retryable error.

## Acceptance Criteria

- [ ] Pending order can create a Mercado Pago preference.
- [ ] Preference amount matches the server-calculated order total.
- [ ] Mercado Pago metadata includes the internal order reference.
- [ ] Order stores the Mercado Pago preference/payment reference.
- [ ] Customer sees a handoff state before redirect.
- [ ] Handoff/loading and retryable error copy is Spanish (`es-AR`).
- [ ] Return URLs do not directly mark the order as paid.

## Dependencies

- Issue 013: Pending Order Creation And Stock Reservation.

## Risks

- Mercado Pago SDK/API behavior may require live account validation.
- Environment URL configuration can break return/webhook behavior.

## UX Notes

Make the handoff state explicit: the customer is leaving to Mercado Pago to pay securely.

## Future Extension Paths

- Retry preference creation from an existing pending order.
- Payment method display.
- Additional payment providers.
