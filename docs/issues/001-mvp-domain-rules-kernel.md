# Issue 001: MVP Domain Rules Kernel

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Create the smallest shared domain rules kernel needed to keep product, cart, checkout, payment, and fulfillment behavior consistent across later slices.

## User Value

Customers and admins see consistent prices, availability labels, delivery costs, and order statuses instead of each workflow inventing its own rules.

## Scope

- Define MVP order statuses: `pending_payment`, `paid`, `payment_failed`, `expired`, `preparing`, `shipped`, `delivered`, `ready_for_pickup`, `picked_up`.
- Define delivery methods: shipping and pickup.
- Define Spanish (`es-AR`) UI label maps/helpers for order statuses and delivery methods while keeping internal values in English.
- Define fixed delivery costs: ARS 5.000 shipping, ARS 0 pickup.
- Define public stock labels: `Disponible`, `Últimas unidades`, `Sin stock`.
- Define pure helpers for price resolution, line totals, subtotal, delivery cost, and total.
- Define pure helpers for public availability labels from available stock.
- Define fulfillment transition maps for shipping and pickup without wiring admin UI yet.

## Out of Scope

- Database schema design beyond what this slice needs.
- Mercado Pago integration.
- Admin UI.
- Product pages, cart UI, or checkout UI.
- Architecture documentation.

## Vertical Slice

After this issue, later slices can import a tested, stable vocabulary and calculation layer instead of duplicating business rules.

## Deep Modules

- Domain rules kernel: owns MVP constants and pure business helpers.
  - Public interface: status constants, delivery method constants, Spanish label helpers, `getDeliveryCost`, `getAvailabilityLabel`, `resolveUnitPrice`, `calculateLineTotal`, `calculateSubtotal`, `calculateOrderTotal`, `getAllowedFulfillmentTransitions`.
  - Testing implications: TDD-first required because these rules are reused across cart, checkout, payment, and admin workflows.

## TDD Plan

- Write tests for fixed shipping and pickup cost.
- Write tests for Spanish order-status and delivery-method labels.
- Write tests for stock label thresholds: 0, 1-3, 4+.
- Write tests for product base price versus variant override.
- Write tests for subtotal and total calculations.
- Write tests for allowed shipping and pickup fulfillment transitions.
- Write tests proving backward, skipped, and cross-path transitions are rejected.

## Acceptance Criteria

- [ ] Shared constants exist for MVP statuses and delivery methods.
- [ ] Shared Spanish UI labels exist for MVP statuses and delivery methods.
- [ ] Raw internal status and delivery-method values are not required for UI rendering.
- [ ] Fixed shipping returns ARS 5.000 and pickup returns ARS 0.
- [ ] Availability labels match the PRD thresholds.
- [ ] Variant price override takes precedence over product base price.
- [ ] Subtotal and total helpers produce deterministic integer ARS totals.
- [ ] Fulfillment transition helpers distinguish shipping and pickup paths.
- [ ] Tests cover all business rules in this slice before integration work starts.

## Dependencies

None - can start immediately.

## Risks

- Over-expanding this into a full architecture layer would slow early delivery.
- Money handling must avoid floating-point behavior.

## UX Notes

No direct UI is required, but labels and totals from this module must match all later customer and admin screens. Internal identifiers can stay English; visible labels must be Spanish for Argentina (`es-AR`).

## Future Extension Paths

- Separate payment and fulfillment state models.
- Dynamic shipping calculators.
- Discounts, coupons, or promotions.
- Multi-currency handling.
