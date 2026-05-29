# Issue 016: Mercado Pago Webhook Reconciliation

## Type

AFK

### AFK

Can be implemented without human clarification if Mercado Pago webhook credentials/configuration are available as environment variables.

### HITL

Not applicable unless Mercado Pago account access or webhook secret/configuration is unavailable during implementation.

## Goal

Verify Mercado Pago payment events server-side and reconcile orders idempotently.

## User Value

Customers and admins can trust that payment confirmation is based on verified provider data, not spoofable browser redirects.

## Scope

- Receive Mercado Pago webhook events.
- Verify event authenticity/server-side payment status according to Mercado Pago requirements.
- Persist payment events for idempotency and auditability.
- Map verified success to order status `paid`.
- Map verified failure to `payment_failed` and release reserved stock.
- Ignore or safely no-op duplicate events.
- Prevent duplicate side effects such as repeated stock release or repeated email trigger.
- Leave expired orders in manual review behavior when late success arrives; detailed expiration slice follows.

## Out of Scope

- Email provider implementation.
- Admin manual review UI.
- Pending payment expiration scheduler.
- Refund/cancellation handling.

## Vertical Slice

After this issue, real payment webhooks can update pending orders safely and duplicate events do not corrupt order or stock state.

## Deep Modules

- Payment reconciliation module: owns verified provider status mapping, order transitions, and side-effect guards.
  - Public interface: `reconcileMercadoPagoEvent`.
  - Testing implications: TDD-first for success, failure, duplicate, unknown, and expired-order cases.
- Webhook idempotency module: owns event identity, duplicate detection, and one-time side effects.
  - Public interface: `recordPaymentEventOnce`, `hasProcessedPaymentEvent`.
  - Testing implications: TDD-first required.
- Stock reservation module: releases stock on verified failure.
  - Public interface: `releaseReservedStockForOrder`.
  - Testing implications: TDD-first for one-time release.

## TDD Plan

- Test verified success moves `pending_payment` to `paid`.
- Test verified failure moves `pending_payment` to `payment_failed`.
- Test failure releases reserved stock once.
- Test duplicate success event does not transition twice.
- Test duplicate failure event does not release stock twice.
- Test unverified or unknown events do not mark orders paid.
- Test late success for expired order does not automatically become `paid`.

## Acceptance Criteria

- [ ] Webhook handler verifies payment status server-side before order mutation.
- [ ] Payment events are persisted or otherwise recorded for idempotency.
- [ ] Verified success transitions pending order to `paid`.
- [ ] Verified failure transitions pending order to `payment_failed` and releases stock.
- [ ] Duplicate events do not repeat transitions or side effects.
- [ ] Return URLs remain non-authoritative.
- [ ] Late success after expiration is not auto-paid.
- [ ] Any reconciliation result projected into UI or email content uses Spanish label/presenter helpers instead of raw internal statuses.

## Dependencies

- Issue 013: Pending Order Creation And Stock Reservation.
- Issue 014: Mercado Pago Preference And Handoff.

## Risks

- Mercado Pago webhook semantics can be subtle and must be checked against current provider docs during implementation.
- Incorrect idempotency can oversell or send duplicate confirmation emails.

## UX Notes

This is mostly backend behavior, but it powers truthful success/pending/failure states and admin order queues.

## Future Extension Paths

- Separate payment events dashboard.
- Retry queues.
- Provider-agnostic payment adapters.
- Refund reconciliation.
