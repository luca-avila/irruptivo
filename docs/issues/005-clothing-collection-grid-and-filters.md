# Issue 005: Clothing Collection Grid And Filters

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Build `/coleccion` as a mobile-first clothing product grid with basic subcategory filters and public availability labels.

## User Value

Shoppers can scan clothing products, understand price and availability, and open a product detail page.

## Scope

- Render active clothing products only.
- Show active out-of-stock clothing products with `Sin stock`.
- Hide inactive products from the grid.
- Add simple clothing subcategory filters such as `Todo`, `Remeras`, and `Shorts` using available data.
- Render product cards with image, name, price, context, availability label, and link to `/coleccion/[slug]`.
- Include empty state for no products and no filter matches.
- Keep the layout mobile-first and scannable.

## Out of Scope

- Size/color filters.
- Sorting complexity.
- Product detail behavior.
- Add-to-cart from grid.
- Admin product creation.

## Vertical Slice

After this issue, users can browse the clothing catalog from a real URL and navigate to clothing product detail URLs.

## Deep Modules

- Product catalog rules: active product filtering, area filtering, subcategory filtering, and availability labels.
  - Public interface: product listing query and product card view model.
  - Testing implications: TDD-first for visibility and filter behavior.

## TDD Plan

- Test only active clothing products appear.
- Test inactive clothing products are excluded.
- Test active out-of-stock products appear with `Sin stock`.
- Test subcategory filters include matching products and exclude non-matches.
- Test empty filter results produce an empty-state model.

## Acceptance Criteria

- [ ] `/coleccion` lists active clothing products.
- [ ] Clothing subcategory filters work without full page breakage.
- [ ] Product cards link to `/coleccion/[slug]`.
- [ ] Out-of-stock active products show `Sin stock`.
- [ ] Inactive products do not appear.
- [ ] Empty catalog and empty filter states are clear and actionable.
- [ ] All visible grid, filter, card, and empty-state copy is Spanish (`es-AR`).
- [ ] Mobile UI follows `docs/wireframes/cloth-grid.png`.

## Dependencies

- Issue 002: Product Catalog Read Path.
- Issue 003: Mobile Storefront Navigation Shell.

## Risks

- Launch subcategory values may change; keep the filter data-driven.
- Product images must have stable dimensions to avoid layout shift.

## UX Notes

Keep filters simple and thumb-friendly. No size/color filtering in MVP.

## Future Extension Paths

- Sorting.
- Size/color filters.
- Product badges.
- Merchandising order controls.
