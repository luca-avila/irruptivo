# Issue 023: Admin Image Upload And Gallery Management

## Type

HITL

### AFK

Can implement the product workflow and metadata behavior from the PRD.

### HITL

Requires operational validation for exact filesystem path, upload size limits, rendition dimensions/formats, and VPS backup policy.

## Goal

Let admin upload, order, associate, and soft-delete product images stored on persistent VPS filesystem storage.

## User Value

Products can be presented with real photos, which is critical to brand trust and purchase confidence.

## Scope

- Add product image upload in admin.
- Store uploaded files on persistent filesystem storage outside app code/container.
- Store PostgreSQL metadata and relative paths only.
- Serve public images under a controlled media URL prefix.
- Generate grid/card, product detail/mobile, and original/high-res renditions.
- Strip metadata and store dimensions.
- Support manual gallery ordering.
- Support clothing image association with visual variant/color.
- Support supplement variant-specific images when packaging differs.
- Support soft delete before physical cleanup.
- Preserve form state on upload failure.

## Out of Scope

- External object storage.
- CDN-specific image pipeline.
- Automated media lifecycle management.
- Lookbook/CMS media.
- Full backup automation implementation if deployment policy is not decided.

## Vertical Slice

After this issue, admin can attach real product images and public catalog/detail pages can render them from controlled media paths.

## Deep Modules

- Image management module: owns upload metadata, rendition paths, ordering, association, and soft-delete rules.
  - Public interface: `uploadProductImage`, `reorderProductImages`, `softDeleteProductImage`, `getPublicImageSet`.
  - Testing implications: TDD-first for metadata/order/delete rules; integration tests for processing and filesystem behavior.
- Product catalog image projection: maps stored renditions to card and detail image URLs.
  - Public interface: product card/detail view model image fields.
  - Testing implications: verify deleted images are not shown and ordering is stable.

## TDD Plan

- Test uploaded image metadata includes relative paths, dimensions, order, and product association.
- Test image ordering changes public image order.
- Test soft-deleted images are excluded from public views.
- Test physical deletion is not required immediately after soft delete.
- Test upload failure preserves product form state.
- Test variant/color association can be represented without duplicating per size.

## Acceptance Criteria

- [ ] Admin can upload product images.
- [ ] Files are stored outside app code/container and metadata stores relative paths only.
- [ ] Public media is served through a controlled URL prefix.
- [ ] Upload creates grid/card, detail/mobile, and original/high-res renditions.
- [ ] Metadata is stripped and dimensions are stored.
- [ ] Admin can reorder gallery images.
- [ ] Admin can soft-delete image records.
- [ ] Public product views use non-deleted images in admin-defined order.
- [ ] Admin upload, ordering, delete, success, and failure copy is Spanish (`es-AR`).

## Dependencies

- Issue 021: Admin Product Create Edit Publish.
- Issue 022: Admin Variant And Stock Management.

## Risks

- Missing upload limits can create storage/performance problems.
- VPS persistence and backups are operationally critical.
- Image processing failures must not corrupt product records.

## UX Notes

Images are central to the premium mobile experience. Failed uploads should be recoverable without losing unsaved product form work.

## Future Extension Paths

- Object storage/CDN migration.
- Automated cleanup jobs.
- Rich per-variant galleries.
- Image focal point/cropping controls.
