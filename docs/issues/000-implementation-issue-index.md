# Irruptivo MVP Implementation Issue Index

This directory converts the current PRD and supporting docs into vertical-slice implementation issues for the Irruptivo ecommerce MVP. The sequence favors tracer bullets, small demoable increments, deep modules where domain complexity exists, and TDD-first coverage for business rules.

## Issue Ordering

1. [Issue 001: MVP Domain Rules Kernel](001-mvp-domain-rules-kernel.md)
2. [Issue 002: Product Catalog Read Path](002-product-catalog-read-path.md)
3. [Issue 003: Mobile Storefront Navigation Shell](003-mobile-storefront-navigation-shell.md)
4. [Issue 004: Clothing-Led Homepage](004-clothing-led-homepage.md)
5. [Issue 005: Clothing Collection Grid And Filters](005-clothing-collection-grid-and-filters.md)
6. [Issue 006: Supplements Grid And Filters](006-supplements-grid-and-filters.md)
7. [Issue 007: Global Product Name Search](007-global-product-name-search.md)
8. [Issue 008: Product Detail With Variant Selection](008-product-detail-with-variant-selection.md)
9. [Issue 009: Add To Cart With Price Snapshot](009-add-to-cart-with-price-snapshot.md)
10. [Issue 010: Cart Review And Totals](010-cart-review-and-totals.md)
11. [Issue 011: Cart Invalid State Resolution](011-cart-invalid-state-resolution.md)
12. [Issue 012: Guest Checkout Form And Delivery Methods](012-guest-checkout-form-and-delivery-methods.md)
13. [Issue 013: Pending Order Creation And Stock Reservation](013-pending-order-creation-and-stock-reservation.md)
14. [Issue 014: Mercado Pago Preference And Handoff](014-mercado-pago-preference-and-handoff.md)
15. [Issue 015: Payment Result Pages](015-payment-result-pages.md)
16. [Issue 016: Mercado Pago Webhook Reconciliation](016-mercado-pago-webhook-reconciliation.md)
17. [Issue 017: Pending Payment Expiration](017-pending-payment-expiration.md)
18. [Issue 018: Secure Guest Order Status](018-secure-guest-order-status.md)
19. [Issue 019: Verified Payment Confirmation Email](019-verified-payment-confirmation-email.md)
20. [Issue 020: Admin Auth And Protected Shell](020-admin-auth-and-protected-shell.md)
21. [Issue 021: Admin Product Create Edit Publish](021-admin-product-create-edit-publish.md)
22. [Issue 022: Admin Variant And Stock Management](022-admin-variant-and-stock-management.md)
23. [Issue 023: Admin Image Upload And Gallery Management](023-admin-image-upload-and-gallery-management.md)
24. [Issue 024: Admin Order Queue And Detail](024-admin-order-queue-and-detail.md)
25. [Issue 025: Admin Fulfillment Transitions](025-admin-fulfillment-transitions.md)
26. [Issue 026: Admin Fulfillment Contact Edits](026-admin-fulfillment-contact-edits.md)
27. [Issue 027: Trust Pages And Policy Links](027-trust-pages-and-policy-links.md)
28. [Issue 028: MVP Feedback State Pass](028-mvp-feedback-state-pass.md)

## Deep Module Summary

- Product catalog rules: product visibility, active/inactive behavior, public availability labels, variant price resolution, and immutable slug constraints. TDD-first for visibility and variant availability rules.
- Cart domain: localStorage item shape, quantity operations, subtotal calculation, price snapshot validity, stock caps, and invalid item classification. TDD-first.
- Checkout validation: contact fields, Argentina shipping fields, pickup rules, delivery fee, cart validity, and order total calculation. TDD-first.
- Stock reservation: reserve on `pending_payment`, release on failure/expiration, and prevent oversell. TDD-first.
- Order lifecycle: allowed system and admin transitions across payment and fulfillment states. TDD-first.
- Payment reconciliation: Mercado Pago verification, idempotent webhook handling, duplicate event protection, late payment handling, and side-effect guards. TDD-first.
- Shipping calculation: fixed ARS 5.000 shipping and ARS 0 pickup as a tiny but explicit module. TDD-first.
- Guest order access: unguessable read-only token lookup with no customer account dependency. TDD-first for access behavior.
- Image management: filesystem-backed upload processing, rendition metadata, ordering, and soft delete. TDD-first where metadata and deletion rules are pure; visual processing can use integration tests.
- Admin order transition controls: delivery-method-specific fulfillment paths and immutable financial fields. TDD-first.

## Cross-Cutting Language Requirement

- Documentation and internal implementation vocabulary may stay English.
- Every customer-facing and admin-facing string introduced by an issue must be Spanish for Argentina (`es-AR`), including headings, labels, CTAs, validation messages, loading/empty/error/success states, metadata descriptions, and email copy.
- Raw internal status or method values such as `pending_payment`, `paid`, `ready_for_pickup`, `shipping`, and `pickup` must never be rendered directly to ordinary customers or admins. Use shared label/presenter helpers from the domain layer before values reach UI or email content.
- Issue verification should include a quick scan for visible English placeholders or raw enum values whenever the issue changes UI, emails, status badges, or feedback states.

## Slice Dependency Graph

```txt
001
  -> 002
      -> 003 -> 004 -> 027
      -> 005 -> 008
      -> 006 -> 008
      -> 007 -> 008
      -> 020 -> 021 -> 022 -> 023
008 -> 009 -> 010 -> 011 -> 012 -> 013 -> 014 -> 015
                                      013 -> 016 -> 017
                                      013 -> 018 -> 019
020 -> 024 -> 025
020 -> 024 -> 026
016 -> 024
017 -> 024
003..027 -> 028
```

## MVP Critical Path

The shortest real purchase path is: `001 -> 002 -> 003 -> 005 -> 008 -> 009 -> 010 -> 011 -> 012 -> 013 -> 014 -> 015 -> 016 -> 018`.

Admin launch readiness adds: `020 -> 021 -> 022 -> 023 -> 024 -> 025 -> 026`.

Operational trust adds: `017 -> 019 -> 027 -> 028`.

## Highest-Risk Slices

- Issue 013: stock reservation and order creation must be atomic enough to prevent oversell.
- Issue 016: webhook reconciliation must be idempotent and must not trust return URLs.
- Issue 017: expiration and late payment handling can create edge cases between stock, payment, and admin review.
- Issue 023: local VPS image storage needs careful upload limits, persistent paths, and cleanup behavior.
- Issue 025: admin fulfillment transitions must prevent invalid state changes without blocking valid operations.

## Highest-Ambiguity Slices

- Issue 019 is HITL because the email provider, sender identity, and delivery mechanics are deferred.
- Issue 023 is HITL because exact upload limits, rendition dimensions, image format policy, filesystem path, and backup policy are deferred.
- Issue 027 may need content review, but it can start AFK from the PRD decisions and be refined later.
- Issue 012 may need later address-field refinements for Correo Argentino, but MVP rules are sufficient to begin.

## Areas Likely To Require Refactoring Later

- Single order status model may split into separate payment and fulfillment statuses after MVP volume grows.
- Product variant editing may need bulk tooling as catalog size grows.
- Local image storage may migrate to object storage/CDN.
- Guest cart may move server-side if customer accounts or authenticated carts are added.
- Search may need ranking, filters, or typo tolerance if catalog size grows.
- Admin auth may need roles, audit logs, or staff permissions after owner-only operations.
- Shipping may need dynamic Correo Argentino rates, labels, and tracking.

## Recommended Implementation Starting Point

Start with Issue 001, then Issue 002, then immediately build the public customer tracer bullet through Issue 005 and Issue 008. That validates the product model, mobile product presentation, variant availability rules, and the first end-to-end shopping interaction before admin and payment complexity expands the surface area.
