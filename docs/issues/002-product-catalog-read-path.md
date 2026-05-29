# Issue 002: Product Catalog Read Path

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Create the minimal product, variant, image metadata, and public read path needed to display active catalog products.

## User Value

Visitors can see real products from structured data instead of static placeholders, and later slices can build product grids, search, and detail pages on the same source of truth.

## Scope

- Add the minimal persistence model for products, variants/SKUs, and product image metadata/paths.
- Support product areas: clothing collection and supplements.
- Support clothing subcategory and supplement type values as simple MVP fields.
- Support product active/inactive status.
- Support globally unique slug creation data shape, while admin creation comes later.
- Support variant stock and optional variant price override.
- Support product image ordering and public relative paths.
- Provide public read functions for active products, active products by area, and active product by slug.
- Include enough seeded or fixture data to demo the read path locally.

## Out of Scope

- Admin product forms.
- Image upload and processing.
- Cart, checkout, or payment behavior.
- Advanced filtering, sorting, search ranking, or CMS features.

## Vertical Slice

After this issue, the app can render product data from the database/read model and later pages can query active clothing and supplement products.

## Deep Modules

- Product catalog rules: owns active/inactive visibility, public product shape, variant price resolution, image ordering, and active product lookup.
  - Public interface: `listActiveProducts`, `listActiveProductsByArea`, `getPublicProductBySlug`, `getProductCardView`, `getProductDetailView`.
  - Testing implications: TDD-first for visibility, price resolution, and out-of-stock visibility rules.

## TDD Plan

- Test active products are returned for public listings.
- Test inactive products are excluded from listings.
- Test active out-of-stock products remain returned.
- Test slug lookup distinguishes active and inactive direct URL behavior.
- Test image ordering is stable.
- Test effective price uses variant override when present.

## Acceptance Criteria

- [ ] Product records can represent clothing and supplement products.
- [ ] Every sellable product can have one or more sellable variants/SKUs.
- [ ] Variant records include stock and optional price override.
- [ ] Public product card data includes image, name, price, area/type context, slug, and availability label.
- [ ] Active out-of-stock products are visible in public reads with `Sin stock`.
- [ ] Inactive products are hidden from public listing reads.
- [ ] Public view models expose Spanish (`es-AR`) labels for availability and area/type context where labels are present.
- [ ] Tests cover product visibility and variant availability behavior.

## Dependencies

- Issue 001: MVP Domain Rules Kernel.

## Risks

- Modeling too much future catalog flexibility could slow MVP delivery.
- Slug immutability must be protected once admin creation exists.

## UX Notes

The read path must provide enough data for mobile product cards in `docs/wireframes/cloth-grid.png` and `docs/wireframes/supplement-grid.png`.

## Future Extension Paths

- Richer category taxonomy.
- Product sorting and merchandising.
- Variant-specific gallery expansion.
- Search indexing if catalog size grows.
