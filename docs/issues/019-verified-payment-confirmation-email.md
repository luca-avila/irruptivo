# Issue 019: Verified Payment Confirmation Email

## Type

HITL

### AFK

Most email content and trigger behavior can be implemented from the PRD.

### HITL

Requires confirmation of email provider, sender identity, and deployment credentials before production use.

## Goal

Send a basic confirmation email only after Mercado Pago payment is verified as `paid`.

## User Value

Customers receive proof of purchase, next steps, and a secure order-status link without needing an account.

## Scope

- Add email notification trigger after webhook/server-side payment verification transitions an order to `paid`.
- Include order number, total, delivery/pickup summary, next steps, WhatsApp/contact path, and secure guest order-status link.
- Ensure duplicate webhook events do not send duplicate emails.
- Store enough delivery/send state to prevent repeated sends.
- Provide a local/test adapter if production provider is not configured.

## Out of Scope

- Marketing email automation.
- Email preferences.
- Abandoned cart emails.
- Refund/cancellation emails.
- Complex template CMS.

## Vertical Slice

After this issue, a verified paid order produces one customer confirmation email with status access and fulfillment expectations.

## Deep Modules

- Notification trigger module: owns one-time email side effect after verified payment.
  - Public interface: `sendOrderConfirmationOnce`.
  - Testing implications: TDD-first for paid-only trigger and duplicate prevention.
- Email provider adapter: isolates provider-specific send mechanics.
  - Public interface: `sendEmail(message)`.
  - Testing implications: mock in domain tests; provider integration can be tested separately.

## TDD Plan

- Test unpaid orders do not trigger email.
- Test `paid` transition triggers one confirmation email.
- Test duplicate webhook/payment reconciliation does not send duplicate email.
- Test email payload includes order number, total, delivery/pickup summary, contact path, and guest status link.
- Test provider failure is recorded or surfaced without rolling back payment confirmation.

## Acceptance Criteria

- [ ] Confirmation email sends only after verified payment success.
- [ ] Email includes order number, total, delivery/pickup summary, next steps, contact path, and guest status link.
- [ ] Duplicate webhooks do not duplicate emails.
- [ ] Email provider is isolated behind a small adapter.
- [ ] Missing production provider config is surfaced clearly.
- [ ] No marketing subscription behavior is introduced.
- [ ] Customer email subject and body copy are Spanish (`es-AR`) and never expose raw internal statuses.

## Dependencies

- Issue 016: Mercado Pago Webhook Reconciliation.
- Issue 018: Secure Guest Order Status.

## Risks

- Provider deliverability and credentials are outside the PRD.
- Email failure after payment must not corrupt order status.

## UX Notes

Email copy should be concise, transactional, and aligned with manual fulfillment. Do not add account creation prompts.

## Future Extension Paths

- Shipment status emails.
- Pickup-ready emails.
- Marketing opt-in.
- Email template management.
