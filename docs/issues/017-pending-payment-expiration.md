# Issue 017: Pending Payment Expiration

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Expire unpaid `pending_payment` orders after 30 minutes, release reserved stock, and protect late payment confirmations from automatic fulfillment.

## User Value

Customers do not encounter inventory locked forever by abandoned checkouts, and the business gets a safe manual review path for late provider events.

## Scope

- Identify `pending_payment` orders older than 30 minutes.
- Move expired orders to `expired`.
- Release reserved stock once.
- Ensure expired orders cannot be paid automatically by a late webhook success.
- Mark or expose late payment after expiration as manual admin review required.
- Represent expired state in payment result/status views.

## Out of Scope

- Refund handling for late payments.
- Admin manual resolution workflow beyond surfacing review need.
- Complex queue infrastructure.
- Customer payment retry on same order.

## Vertical Slice

After this issue, abandoned Mercado Pago checkouts release stock, and late confirmations are prevented from entering normal fulfillment automatically.

## Deep Modules

- Order expiration module: owns pending age calculation, expiration transition, and one-time stock release.
  - Public interface: `expirePendingPaymentOrders`.
  - Testing implications: TDD-first for 30-minute threshold and idempotent release.
- Payment reconciliation module: owns late success behavior for expired orders.
  - Public interface: late payment classification in reconciliation result.
  - Testing implications: TDD-first for manual review state.

## TDD Plan

- Test pending order younger than 30 minutes remains pending.
- Test pending order older than 30 minutes becomes expired.
- Test expiration releases reserved stock once.
- Test running expiration twice is safe.
- Test late verified success after expiration does not mark order paid.
- Test late success is visible as manual review required.

## Acceptance Criteria

- [ ] Pending unpaid orders expire after 30 minutes.
- [ ] Expiration releases reserved stock.
- [ ] Expiration is idempotent.
- [ ] Expired orders show expired customer-facing state.
- [ ] Late success after expiration is not auto-paid.
- [ ] Manual review need is available to admin order views.
- [ ] Expired customer copy and admin manual-review labels are Spanish (`es-AR`) and do not expose raw internal statuses.

## Dependencies

- Issue 013: Pending Order Creation And Stock Reservation.
- Issue 016: Mercado Pago Webhook Reconciliation.

## Risks

- Scheduler/runtime choice can be deployment-specific; keep the operation callable and simple.
- Late payment review semantics can require owner policy later.

## UX Notes

Expired customer state should explain that checkout must restart. Avoid promising automatic retry or refund behavior.

## Future Extension Paths

- Admin late-payment resolution workflow.
- Customer notification on expiration.
- Queue-backed scheduled jobs.
