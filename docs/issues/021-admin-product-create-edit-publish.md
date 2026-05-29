# Issue 021: Admin Product Create Edit Publish

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Let admin create, edit, activate, and deactivate products without direct database edits.

## User Value

The owner can manage the public catalog independently and control which products appear in the store.

## Scope

- Add admin product list.
- Add create product form for name, description, product area, subcategory/type, base price, and active/inactive status.
- Generate globally unique slug on product creation.
- Keep slug immutable after creation.
- Add edit product form for allowed fields.
- Prevent active/published state when product has no variants/SKUs.
- Ensure inactive products are hidden from grids/search but direct URLs show unavailable state.
- Show success/error feedback.

## Out of Scope

- Variant/stock editor details.
- Image upload.
- Bulk editing.
- CMS/blog content.
- Product analytics.

## Vertical Slice

After this issue, admin can create a product shell and control public product visibility from the admin panel.

## Deep Modules

- Product management module: owns product create/edit rules, slug generation, slug immutability, and publish validation.
  - Public interface: `createProduct`, `updateProduct`, `setProductStatus`, `canPublishProduct`.
  - Testing implications: TDD-first for slug uniqueness/immutability and publish rules.
- Product visibility rules: shared with public catalog.
  - Public interface: public reads from Issue 002.
  - Testing implications: TDD-first for active/inactive behavior.

## TDD Plan

- Test product creation generates unique slug.
- Test slug cannot be changed by edit.
- Test product without variants cannot become active.
- Test inactive product is hidden from listing/search reads.
- Test inactive direct URL returns unavailable page model.
- Test valid product updates preserve existing slug.

## Acceptance Criteria

- [ ] Admin can list products.
- [ ] Admin can create product with MVP fields.
- [ ] Product slug is generated on creation, globally unique, and immutable.
- [ ] Admin can edit allowed product fields.
- [ ] Admin can activate/deactivate products.
- [ ] Product cannot be active without at least one variant/SKU.
- [ ] Public visibility rules update after status changes.
- [ ] Admin product list/form labels, status labels, and success/error feedback are Spanish (`es-AR`).

## Dependencies

- Issue 002: Product Catalog Read Path.
- Issue 020: Admin Auth And Protected Shell.

## Risks

- Slug generation must avoid collisions and accidental URL changes.
- Publish validation depends on variant management from the next slice; until then, products may remain inactive.

## UX Notes

Use simple forms, clear labels, and explicit publish errors. Admin should understand why a product cannot be active.

## Future Extension Paths

- Slug redirects.
- Bulk product editing.
- Rich product copy blocks.
- Merchandising order.
