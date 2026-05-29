# Issue 022: Admin Variant And Stock Management

## Type

AFK

### AFK

Can be implemented without human clarification.

### HITL

Not applicable.

## Goal

Let admin create and edit sellable variants/SKUs, stock counts, and optional price overrides.

## User Value

The owner can keep availability accurate at the sellable SKU level for clothing and supplements.

## Scope

- Add variant/SKU management inside product admin.
- Clothing variants support combined color/size option values.
- Supplement variants support flavor/weight/presentation option values.
- Admin can set exact stock count.
- Admin can set optional variant price override.
- Admin can activate/deactivate variants if supported by the chosen product model.
- Public users see availability labels, not exact stock counts.
- Product with at least one valid variant can be activated.

## Out of Scope

- Bulk variant generation.
- Backorders, preorders, or waitlists.
- Size/color grid filters.
- Advanced inventory audit logs.
- Image grouping per color; image management is next slice.

## Vertical Slice

After this issue, admin can make products sellable by defining variants and stock, and public availability updates from admin changes.

## Deep Modules

- Variant availability module: owns sellable variant rules, effective price, exact admin stock, and public labels.
  - Public interface: `createVariant`, `updateVariant`, `getVariantAvailability`, `resolveUnitPrice`.
  - Testing implications: TDD-first for stock thresholds, price override, and publish eligibility.
- Stock validation module: owns admin stock updates and public stock availability.
  - Public interface: `setVariantStock`, `getAvailableStock`.
  - Testing implications: TDD-first for stock changes affecting cart/detail behavior.

## TDD Plan

- Test variant with stock 0 maps to `Sin stock`.
- Test stock 1-3 maps to `Últimas unidades`.
- Test stock 4+ maps to `Disponible`.
- Test variant price override beats product base price.
- Test product publish eligibility changes when a valid variant exists.
- Test exact stock is exposed to admin but not public view models.

## Acceptance Criteria

- [ ] Admin can add/edit clothing variant option values.
- [ ] Admin can add/edit supplement variant option values.
- [ ] Admin can set stock per variant/SKU.
- [ ] Admin can set optional variant price override.
- [ ] Public detail/cart availability reflects stock changes.
- [ ] Exact stock counts are admin-only.
- [ ] Product activation is possible once at least one variant exists.
- [ ] Admin variant/stock labels and public availability labels are Spanish (`es-AR`).

## Dependencies

- Issue 021: Admin Product Create Edit Publish.

## Risks

- Variant form can become unwieldy if it tries to solve bulk tooling too early.
- Changing stock while carts exist must be handled by cart/checkout validation, not trusted client state.

## UX Notes

Keep the editor explicit and table-like. Admin should see exact stock counts and effective prices.

## Future Extension Paths

- Bulk variant creation.
- SKU codes.
- Inventory movement history.
- Low-stock alerts.
