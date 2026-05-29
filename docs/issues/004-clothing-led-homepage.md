# Issue 004: Clothing-Led Homepage

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Build the mobile-first homepage that makes clothing/sportswear the first impression and routes users into the store.

## User Value

New visitors from Instagram, ads, WhatsApp, or direct links quickly understand Irruptivo as a professional clothing-led fitness/lifestyle brand.

## Scope

- Add clothing-led hero with one primary CTA: `Ver colección` linking to `/coleccion`.
- Show featured clothing before supplements.
- Show a supplements section below clothing without making supplements dominate the identity.
- Include concise trust/support signals for Mercado Pago, shipping/pickup, exchanges, contact, and Instagram.
- Use product read path for featured products where possible.
- Include loading and empty states that still preserve brand trust.

## Out of Scope

- Advanced merchandising.
- Campaign CMS.
- Product detail implementation.
- Trust page full content.
- Visual animation polish.

## Vertical Slice

After this issue, the public root page is a usable brand entry point with real routes into collection and supplements.

## Deep Modules

None directly. Uses Product catalog rules from Issue 002.

## TDD Plan

Strict TDD is not required for visual layout. Add tests only for data selection behavior if featured product selection contains logic.

## Acceptance Criteria

- [ ] Homepage first viewport is clothing-led.
- [ ] The only primary hero CTA is `Ver colección` and it links to `/coleccion`.
- [ ] Featured clothing appears before featured supplements.
- [ ] Supplements remain discoverable from homepage and navigation.
- [ ] Trust links for contact, Instagram, Nosotros, and Envíos y cambios are reachable.
- [ ] Empty product data does not produce a broken homepage.
- [ ] All visible page copy, CTAs, loading states, and empty states are Spanish (`es-AR`).
- [ ] Mobile layout follows the direction of `docs/wireframes/hero.png`, `docs/wireframes/cloth-section.png`, and `docs/wireframes/suplement-section.png`.

## Dependencies

- Issue 002: Product Catalog Read Path.
- Issue 003: Mobile Storefront Navigation Shell.

## Risks

- Weak photography will reduce the intended premium effect.
- Overloading the page with copy can dilute the direct brand tone.

## UX Notes

Keep product photos visually dominant. Copy should be minimal, factual, and confident. The page should not feel like a generic supplement marketplace.

## Future Extension Paths

- Featured drops.
- Campaign modules.
- Lookbook section.
- Personalized or manually curated merchandising.
