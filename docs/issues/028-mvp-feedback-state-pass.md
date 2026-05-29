# Issue 028: MVP Feedback State Pass

## Type

AFK

### AFK

Can be implemented without human clarification once the core slices exist.

### HITL

Not applicable.

## Goal

Make a final MVP pass over loading, empty, success, validation, error, and network-failure states for the implemented customer and admin workflows.

## User Value

Customers and admin users receive clear feedback when something is loading, empty, saved, invalid, failed, pending, or unavailable.

## Scope

- Review public product browsing feedback states.
- Review search empty/error states.
- Review product detail unavailable/no-variant/out-of-stock states.
- Review add-to-cart success/error states.
- Review cart invalid, empty, and quantity-limit states.
- Review checkout validation and submission failure states.
- Review payment pending/failure/expired states.
- Review admin login, save, upload, order transition, and unauthorized states.
- Ensure feedback copy is short, calm, actionable, and brand-aligned.
- Ensure mobile text does not overlap or become untappable.

## Out of Scope

- New features.
- Major visual redesign.
- Animation polish.
- Architecture refactors.
- Advanced observability.

## Vertical Slice

After this issue, the MVP workflows are more reliable and demoable under realistic error and empty-state conditions.

## Deep Modules

None introduced. This slice verifies that existing deep modules surface actionable errors instead of leaking implementation details.

## TDD Plan

Strict TDD is not required for visual polish. Add focused tests only where an error state depends on business rules, such as cart blocking, checkout validation, payment status mapping, and admin transition rejection.

## Acceptance Criteria

- [ ] Product grids have loading and empty states.
- [ ] Search has empty query, loading, error, and no-results states.
- [ ] Product detail handles inactive, out-of-stock, unavailable variant, and no-selection states.
- [ ] Cart explains invalid items and blocks checkout when needed.
- [ ] Checkout validation errors are inline and no order is created for invalid submissions.
- [ ] Payment result pages clearly distinguish success, failure, pending, and expired.
- [ ] Admin screens show saved, failed, unauthorized, and invalid-transition feedback.
- [ ] Mobile UI remains legible and tappable across feedback states.
- [ ] Final QA finds no visible English placeholders, generic technical wording, or raw internal enum/status values in customer/admin UI.
- [ ] All customer/admin loading, empty, success, validation, error, and network-failure states are Spanish (`es-AR`).

## Dependencies

- Issue 003: Mobile Storefront Navigation Shell.
- Issue 005: Clothing Collection Grid And Filters.
- Issue 006: Supplements Grid And Filters.
- Issue 007: Global Product Name Search.
- Issue 008: Product Detail With Variant Selection.
- Issue 009: Add To Cart With Price Snapshot.
- Issue 011: Cart Invalid State Resolution.
- Issue 012: Guest Checkout Form And Delivery Methods.
- Issue 015: Payment Result Pages.
- Issue 020: Admin Auth And Protected Shell.
- Issue 023: Admin Image Upload And Gallery Management.
- Issue 025: Admin Fulfillment Transitions.

## Risks

- This can become a broad polish bucket; keep it limited to feedback states required by existing MVP workflows.
- Copy inconsistencies can make the brand feel less professional.

## UX Notes

Feedback should be clear, short, calm, and actionable. Avoid visible instructional clutter or overly generic ecommerce language.

## Future Extension Paths

- Design QA checklist.
- Accessibility audit.
- Analytics instrumentation.
- Automated visual regression tests.
