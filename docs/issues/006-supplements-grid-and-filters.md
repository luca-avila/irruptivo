# Issue 006: Supplements Grid And Filters

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Build `/suplementos` as a mobile-first supplement product grid with basic supplement type filters.

## User Value

Supplement shoppers can find products quickly while the site still preserves clothing as the primary brand identity.

## Scope

- Render active supplement products only.
- Show active out-of-stock supplements with `Sin stock`.
- Hide inactive supplements from the grid.
- Add simple type filters such as `Todo`, `Proteína`, `Creatina`, and `Pre-entreno` using available data.
- Render product cards with image, name, price, type context, availability label, and link to `/suplementos/[slug]`.
- Include empty state for no products and no filter matches.
- Avoid supplement-specific health or performance claims beyond factual product information.

## Out of Scope

- Flavor/weight/presentation filters.
- Advanced supplement taxonomy.
- Product comparisons.
- Health/performance claims.
- Add-to-cart from grid.

## Vertical Slice

After this issue, users can browse supplements from a real URL and navigate to supplement detail URLs.

## Deep Modules

- Product catalog rules: active product filtering, area filtering, type filtering, and availability labels.
  - Public interface: supplement listing query and product card view model.
  - Testing implications: TDD-first for visibility and filter behavior.

## TDD Plan

- Test only active supplements appear.
- Test inactive supplements are excluded.
- Test active out-of-stock supplements appear with `Sin stock`.
- Test type filters include matching products and exclude non-matches.
- Test empty filter results produce an empty-state model.

## Acceptance Criteria

- [ ] `/suplementos` lists active supplement products.
- [ ] Supplement type filters work.
- [ ] Product cards link to `/suplementos/[slug]`.
- [ ] Out-of-stock active products show `Sin stock`.
- [ ] Inactive products do not appear.
- [ ] Empty catalog and empty filter states are clear and actionable.
- [ ] All visible grid, filter, card, and empty-state copy is Spanish (`es-AR`).
- [ ] Mobile UI follows `docs/wireframes/supplement-grid.png`.

## Dependencies

- Issue 002: Product Catalog Read Path.
- Issue 003: Mobile Storefront Navigation Shell.

## Risks

- Supplement content can accidentally imply unsupported claims.
- Product type naming may need business review later.

## UX Notes

Use the darker supplement grid direction from the wireframe where it supports the brand, but do not let supplements overtake the clothing-led positioning.

## Future Extension Paths

- Brand/manufacturer filters.
- Flavor/weight filters.
- Supplement disclaimers.
- Richer nutritional facts content.
