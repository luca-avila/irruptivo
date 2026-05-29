# Issue 012: Guest Checkout Form And Delivery Methods

## Type

AFK

### AFK

Can be implemented without human clarification using MVP address fields from the PRD.

### HITL

Not applicable for MVP issue generation.

## Goal

Build guest checkout form validation and delivery method selection for shipping and pickup.

## User Value

Customers can enter the information Irruptivo needs to fulfill an order without creating an account.

## Scope

- Render guest checkout only; no login/register requirement.
- Collect required contact fields: full name, email, and phone.
- Let customer choose shipping or pickup.
- Shipping requires address, city, province, postal code, and optional delivery notes.
- Pickup requires no shipping address and may include optional notes.
- Show order summary with subtotal, delivery cost, and total.
- Apply ARS 5.000 shipping and ARS 0 pickup.
- Show clear validation errors.
- Prevent order creation when form or cart is invalid.

## Out of Scope

- Mercado Pago preference creation.
- Order persistence.
- Dynamic Correo Argentino rates or address validation.
- Customer accounts or saved addresses.
- Final visual polish beyond usable mobile layout.

## Vertical Slice

After this issue, a guest shopper can complete a valid checkout form and see the correct total for shipping or pickup before order creation.

## Deep Modules

- Checkout validation module: validates contact fields, delivery method, delivery-specific fields, and cart validity.
  - Public interface: `validateCheckoutInput`, `buildCheckoutSummary`.
  - Testing implications: TDD-first for required fields and delivery-specific validation.
- Shipping calculation: fixed fee module reused from Issue 001.
  - Public interface: `getDeliveryCost`, `calculateOrderTotal`.
  - Testing implications: TDD-first for delivery method totals.

## TDD Plan

- Test full name, email, phone, and delivery method are required.
- Test shipping requires address, city, province, and postal code.
- Test pickup does not require shipping address.
- Test shipping total includes ARS 5.000.
- Test pickup total includes ARS 0.
- Test invalid cart blocks checkout submission.
- Test valid shipping and valid pickup payloads pass validation.

## Acceptance Criteria

- [ ] Checkout is guest-only.
- [ ] Contact fields are validated before submission.
- [ ] Delivery method selection controls conditional fields.
- [ ] Shipping total includes ARS 5.000.
- [ ] Pickup total includes ARS 0.
- [ ] Order summary updates when delivery method changes.
- [ ] Invalid form data does not create an order.
- [ ] All checkout labels, validation messages, delivery-method labels, and order-summary copy are Spanish (`es-AR`).
- [ ] Raw delivery-method values such as `shipping` and `pickup` are not rendered directly.
- [ ] Mobile layout follows the direction of `docs/wireframes/checkout.png` while adapting to MVP shipping/pickup rules.

## Dependencies

- Issue 011: Cart Invalid State Resolution.

## Risks

- Exact Correo Argentino address constraints are deferred; MVP should use simple Argentina address fields.
- Checkout can feel informal if pickup instructions are unclear.

## UX Notes

Checkout should feel like ecommerce, not WhatsApp ordering. Explain that pickup is coordinated through WhatsApp after verified payment.

## Future Extension Paths

- Saved addresses.
- Dynamic shipping rates.
- Pickup scheduling.
- Address validation.
