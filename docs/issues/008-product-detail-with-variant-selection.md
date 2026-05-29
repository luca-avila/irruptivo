# Issue 008: Product Detail With Variant Selection

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Build product detail pages for clothing and supplements with image galleries, variant selection, availability labels, and disabled purchase states.

## User Value

Shoppers can inspect product photos, understand price and options, select the right variant, and know whether the item can be added to cart.

## Scope

- Implement `/coleccion/[slug]` and `/suplementos/[slug]`.
- Show product images, name, price, description, category/type, delivery/pickup info, exchange info, size guide when applicable, and contact access.
- Render clothing variant selectors for combined color/size SKUs.
- Render supplement variant selectors for flavor/weight/presentation SKUs.
- Use variant price override when selected; otherwise show base price.
- Show public availability labels for selected variants.
- Disable or block add-to-cart when no variant is selected or selected variant has no stock.
- Show soft unavailable page for inactive direct URLs.

## Out of Scope

- Cart persistence.
- Checkout.
- Admin product editing.
- Rich size-guide CMS.
- Reviews, recommendations, or related products.

## Vertical Slice

After this issue, users can open a real product detail page, select a valid sellable variant, and see clear purchase readiness.

## Deep Modules

- Product variant resolution: maps selected option values to sellable SKU, effective price, and availability.
  - Public interface: `resolveSelectedVariant(product, selectedOptions)`, `getVariantAvailability`.
  - Testing implications: TDD-first for no selection, unavailable selection, out-of-stock variant, and price override cases.
- Product visibility rules: direct inactive URL behavior.
  - Public interface: detail page lookup that can return active detail or unavailable detail.
  - Testing implications: TDD-first for inactive direct URL page behavior.

## TDD Plan

- Test no selected variant blocks add-to-cart.
- Test selected in-stock variant enables add-to-cart.
- Test selected out-of-stock variant disables add-to-cart.
- Test variant price override changes displayed unit price.
- Test inactive product direct URL returns unavailable page model.
- Test exact stock counts are not exposed publicly.

## Acceptance Criteria

- [ ] Clothing detail page renders at `/coleccion/[slug]`.
- [ ] Supplement detail page renders at `/suplementos/[slug]`.
- [ ] Product details include images, price, description, variants, availability, shipping/pickup, exchanges, and contact access.
- [ ] Add-to-cart cannot proceed without a selected available variant.
- [ ] Public users see labels, not exact stock counts.
- [ ] Inactive direct URLs show a soft unavailable page with no purchase action.
- [ ] All visible detail-page copy, selectors, CTA states, unavailable states, and availability labels are Spanish (`es-AR`).
- [ ] UI follows `docs/wireframes/cloth-detail.png` and `docs/wireframes/supplement-detail.png`.

## Dependencies

- Issue 002: Product Catalog Read Path.
- Issue 005: Clothing Collection Grid And Filters.
- Issue 006: Supplements Grid And Filters.

## Risks

- Variant option UI can grow complex if product data is inconsistent.
- Inactive product handling must avoid accidental add-to-cart availability.

## UX Notes

Product images should carry most visual weight. Keep buying information visible: price, variant, availability, and CTA.

## Future Extension Paths

- Rich size guide.
- Variant-specific galleries.
- Related products.
- Back-in-stock notifications.
