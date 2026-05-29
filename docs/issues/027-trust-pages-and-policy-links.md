# Issue 027: Trust Pages And Policy Links

## Type

AFK

### AFK

Can be implemented from PRD decisions with concise placeholder-final copy.

### HITL

Content review may be useful before launch but does not block implementation.

## Goal

Add lean `Nosotros` and `Envíos y cambios` pages connected from public navigation and checkout/product trust areas.

## User Value

New visitors get enough legitimacy, delivery, pickup, exchange, and support clarity to trust the store.

## Scope

- Add `Nosotros` page with concise brand legitimacy copy, contact path, and Instagram link.
- Add `Envíos y cambios` page with shipping, pickup, exchange, and support policy summary.
- Include ARS 5.000 Correo Argentino shipping and free Benavidez/Zona Norte pickup.
- Include exchange policy: contact within 7 days, unused/original condition, customer pays voluntary exchange shipping, Irruptivo covers wrong/defective item cases, refunds only when legally required or owner-approved.
- Link pages from navigation, footer, product detail, and checkout where useful.
- Keep copy factual and direct.

## Out of Scope

- CMS.
- Blog.
- Legal policy automation.
- Rich brand storytelling.
- Refund/cancellation management workflow.

## Vertical Slice

After this issue, customers can find trust and policy information before purchasing.

## Deep Modules

None.

## TDD Plan

Strict TDD is not required for static content. Add route smoke tests if existing test patterns make this cheap.

## Acceptance Criteria

- [ ] `Nosotros` page exists and is reachable from public navigation.
- [ ] `Envíos y cambios` page exists and is reachable from public navigation.
- [ ] Shipping copy states Correo Argentino nationwide shipping for ARS 5.000.
- [ ] Pickup copy states free pickup in Benavidez/Zona Norte coordinated after verified payment.
- [ ] Exchange policy reflects Decision 021.
- [ ] Product detail and checkout link to trust/policy information where useful.
- [ ] Copy avoids exaggerated supplement or performance claims.
- [ ] Trust-page headings, policy copy, CTAs, metadata, and link labels are Spanish (`es-AR`).

## Dependencies

- Issue 003: Mobile Storefront Navigation Shell.
- Issue 004: Clothing-Led Homepage.

## Risks

- Copy may need owner/legal review before launch.
- Overlong policy copy could hurt mobile readability.

## UX Notes

Trust should come from clarity, not overexplaining. Keep pages lean, direct, and mobile-readable.

## Future Extension Paths

- Rich brand story page.
- FAQ.
- Legal policy pages.
- CMS-managed content.
