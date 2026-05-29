# Issue 015: Payment Result Pages

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Build customer-facing payment result pages that display the current known server-side order/payment state without mutating it.

## User Value

Customers returning from Mercado Pago understand whether payment is confirmed, failed, pending, or expired and what to do next.

## Scope

- Add success, failure, pending/confirming, and expired result pages or states.
- Look up order by safe identifier/token where appropriate.
- Display current known order/payment state only.
- Show order number when available, total, delivery/pickup summary, next steps, support/contact path, and guest order-status link when available.
- Explain that pending confirmation may take a moment.
- Explain that failed or expired payment requires a fresh checkout/order.
- Do not mark orders paid from return pages.

## Out of Scope

- Webhook reconciliation.
- Confirmation email.
- Payment retry automation.
- Customer account creation CTA.

## Vertical Slice

After this issue, Mercado Pago return URLs land on clear customer pages that reduce uncertainty without compromising payment integrity.

## Deep Modules

- Order status presenter: maps current order/payment state to customer-facing result copy and actions.
  - Public interface: `getPaymentResultView(order)`.
  - Testing implications: TDD-first for state-to-view behavior, especially no mutation.

## TDD Plan

- Test `paid` maps to success state.
- Test `payment_failed` maps to failure state.
- Test `pending_payment` maps to pending/confirming state.
- Test `expired` maps to expired state.
- Test result presenter never mutates order state.
- Test account creation CTA is absent.

## Acceptance Criteria

- [ ] Success page shows order number, total, delivery/pickup summary, next steps, contact path, and guest status link.
- [ ] Failure page explains retry requires a fresh checkout/order.
- [ ] Pending page explains webhook/server confirmation may still be processing.
- [ ] Expired page explains stock reservation has ended and checkout must restart.
- [ ] Return pages never mark an order as paid.
- [ ] No customer account CTA is shown.
- [ ] All payment-result copy, actions, status labels, and support text are Spanish (`es-AR`).
- [ ] Raw internal statuses such as `pending_payment`, `paid`, `payment_failed`, or `expired` are not rendered directly.

## Dependencies

- Issue 014: Mercado Pago Preference And Handoff.

## Risks

- Users may reach a success return before webhook confirmation; copy must handle pending truthfully.
- Order lookup must avoid exposing data without a safe token or identifier strategy.

## UX Notes

Payment states are required but not wireframed. Keep pages minimal, calm, and action-oriented with WhatsApp support visible.

## Future Extension Paths

- Polling for pending confirmation.
- Payment retry flow.
- Customer account order claiming.
