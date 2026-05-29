# Issue 011: Cart Invalid State Resolution

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Detect and explain invalid cart states before checkout, including stale prices, inactive products, unavailable variants, and insufficient stock.

## User Value

Shoppers understand what changed and can fix the cart before payment, avoiding failed checkout surprises.

## Scope

- Validate localStorage cart items against server product/variant data.
- Detect inactive products.
- Detect missing or unavailable variants.
- Detect insufficient stock and cap or require quantity adjustment.
- Detect expired 24-hour price snapshots.
- Refresh expired price snapshots to current server price with user notice.
- Block checkout until blocking cart issues are resolved.
- Keep non-blocking notices visible and actionable.

## Out of Scope

- Checkout form validation.
- Order creation.
- Payment failure handling.
- Admin product editing.

## Vertical Slice

After this issue, a user with a stale or invalid cart receives item-level explanations and cannot proceed until the cart is valid.

## Deep Modules

- Cart validation module: classifies cart items as valid, refreshed, capped, or blocked.
  - Public interface: `validateCart`, `refreshExpiredPriceSnapshot`, `classifyCartIssue`.
  - Testing implications: TDD-first for every invalid state and blocking rule.
- Product visibility and variant availability rules: reused to classify inactive products and unavailable variants.
  - Public interface: product/variant validation functions from prior slices.
  - Testing implications: TDD-first where cart behavior depends on these rules.

## TDD Plan

- Test inactive product blocks checkout.
- Test missing variant blocks checkout.
- Test out-of-stock variant blocks checkout.
- Test insufficient stock caps quantity or requires correction.
- Test expired price snapshot refreshes to current price and produces a notice.
- Test unexpired price snapshot remains honored.
- Test checkout eligibility is false while blocking issues remain.

## Acceptance Criteria

- [ ] Cart validation runs before checkout CTA can proceed.
- [ ] Product inactivity is shown as an item-level blocking issue.
- [ ] Unavailable or missing variants are shown as blocking issues.
- [ ] Insufficient stock is explained and quantity is corrected or blocked.
- [ ] Expired price snapshots refresh to current server price with notice.
- [ ] Valid carts can proceed to checkout.
- [ ] Client-provided prices are never trusted as final without server validation.
- [ ] All cart issue notices and blocking messages are Spanish (`es-AR`).

## Dependencies

- Issue 010: Cart Review And Totals.

## Risks

- Confusing issue messages could make checkout feel broken.
- Race conditions remain possible until order creation validates again.

## UX Notes

Notices should be short, item-level, and actionable. Use calm language such as price updated, stock changed, or product unavailable.

## Future Extension Paths

- Save-for-later.
- Back-in-stock notifications.
- Cart recovery emails if customer accounts exist later.
