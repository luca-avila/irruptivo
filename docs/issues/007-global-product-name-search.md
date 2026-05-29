# Issue 007: Global Product Name Search

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Build simple global product-name search across active clothing and supplement products.

## User Value

Returning visitors and direct-intent shoppers can find a product by name without browsing category grids.

## Scope

- Add search UI entry from the public navigation.
- Search active product names across clothing and supplements.
- Return simple result cards with product image, name, price, area/type context, availability label, and detail link.
- Hide inactive products from search.
- Include empty query, loading, error, and no-results states.
- Keep search simple: product name matching only.

## Out of Scope

- Typo tolerance.
- Ranking beyond simple name match ordering.
- Facets, sorting, analytics, autocomplete, or suggestions.
- Searching descriptions, supplement facts, or category metadata.

## Vertical Slice

After this issue, a user can enter a product name, see matching active products, and navigate to the correct detail page.

## Deep Modules

- Product catalog rules: active-only search and product result mapping.
  - Public interface: `searchActiveProductsByName(query)`.
  - Testing implications: TDD-first for active-only filtering and area-aware result URLs.

## TDD Plan

- Test blank query behavior.
- Test case-insensitive product-name matches.
- Test inactive products are excluded.
- Test clothing result URLs use `/coleccion/[slug]`.
- Test supplement result URLs use `/suplementos/[slug]`.
- Test no-results model.

## Acceptance Criteria

- [ ] Search is reachable from public navigation.
- [ ] Search matches active product names across both product areas.
- [ ] Inactive products never appear.
- [ ] Results show product area/type context.
- [ ] Results link to the correct category-contextual URL.
- [ ] No-results state offers paths back to collection and supplements.
- [ ] All visible search labels, results copy, loading/error states, and no-results copy are Spanish (`es-AR`).

## Dependencies

- Issue 002: Product Catalog Read Path.
- Issue 003: Mobile Storefront Navigation Shell.

## Risks

- Search UI is required but not wireframed; implement conservatively and keep it simple.
- Overbuilding search would distract from MVP checkout.

## UX Notes

Search should feel like a quick utility, not a marketplace search system. Mobile usability and empty state clarity matter more than advanced ranking.

## Future Extension Paths

- Autocomplete.
- Typo tolerance.
- Search analytics.
- Description and tag search.
