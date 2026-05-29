# Issue 003: Mobile Storefront Navigation Shell

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Build the mobile-first public navigation shell that exposes the main MVP routes without customer authentication.

## User Value

Visitors can move between collection, supplements, search, cart, trust pages, contact, and Instagram quickly from a phone.

## Scope

- Add a public mobile header with menu, search entry, brand wordmark, and cart entry.
- Add the mobile menu with links to `Colección`, `Suplementos`, `Nosotros`, contact/WhatsApp, and Instagram.
- Ensure no customer login/register/account CTA appears in MVP navigation.
- Include cart item count integration when cart exists.
- Provide responsive behavior for mobile first and acceptable desktop fallback.
- Include active route or clear selected-state affordances where useful.

## Out of Scope

- Search results implementation.
- Cart page implementation.
- Trust page content.
- Customer auth.
- Admin navigation.

## Vertical Slice

After this issue, a visitor can navigate the storefront skeleton from mobile and reach placeholder or existing pages for every primary public route.

## Deep Modules

None.

## TDD Plan

Strict TDD is not required for presentational navigation. Add lightweight component or route tests only if the existing app test pattern supports them cheaply.

## Acceptance Criteria

- [ ] Mobile header contains menu, search, brand, and cart access.
- [ ] Menu exposes collection, supplements, Nosotros, contact/WhatsApp, and Instagram.
- [ ] No customer account/auth action is shown in public navigation.
- [ ] Cart count appears when local cart state has items.
- [ ] Navigation is tappable and legible on mobile.
- [ ] All visible navigation copy and accessibility labels are Spanish (`es-AR`).
- [ ] Menu behavior matches the direction of `docs/wireframes/nav-menu.png`.

## Dependencies

- Issue 002: Product Catalog Read Path.

## Risks

- Existing auth wireframe may tempt implementation of non-MVP customer auth.
- Contact and Instagram exact URLs may be missing; use configurable placeholders if needed.

## UX Notes

Reference `docs/wireframes/nav-menu.png`. Keep the shell minimal, direct, and product-focused. Avoid making the navigation feel like a generic marketplace.

## Future Extension Paths

- Customer account links.
- Saved order lookup entry.
- Desktop mega navigation.
- Campaign-specific navigation links.
