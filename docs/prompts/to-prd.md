---
name: to-prd
description: Turn the current product documentation, decisions, and wireframes into a local PRD. Use when the user wants to create a PRD from existing docs after Grill Me.
---

Create a PRD from the existing project documentation.

Do NOT interview the user.

Do NOT ask questions.

Do NOT publish to an issue tracker.

Do NOT create implementation tickets yet.

Do NOT generate architecture yet.

Do NOT modify code.

Use the existing documentation and decisions as source of truth.

Read:

- docs/problem.md
- docs/ux.md
- docs/flows.md
- docs/mvp-scope.md
- docs/decisions.md

Inspect wireframes in:

- docs/wireframes/

Produce:

- docs/prd.md

The PRD should synthesize what is already known and clearly separate confirmed decisions from open questions.

Use the project vocabulary consistently.

Project context:

- Irruptivo is a fitness/lifestyle ecommerce.
- Clothing/sportswear leads the brand identity.
- Supplements are also part of the business.
- The app is a fullstack Next.js ecommerce.
- MVP includes product discovery, product details, cart, guest checkout, optional customer auth, Mercado Pago, fixed-cost shipping, admin product management, admin stock/variant management, and admin order management.
- Fulfillment is manual through Correo Argentino.
- Webhook/server-side Mercado Pago verification is the source of truth for marking orders as paid.
- Images are stored locally on the VPS for MVP, with PostgreSQL storing image metadata/URLs only.

PRD template:

# PRD: Irruptivo Ecommerce MVP

## 1. Overview

Summarize the product, business context, and purpose of the MVP.

## 2. Problem Statement

Describe the problem from the business and customer perspective.

## 3. Goals

List the primary product, UX, business, and technical goals.

## 4. Non-Goals

List what this MVP explicitly will not solve.

## 5. Target Users

Describe customer users and admin users.

## 6. Product Scope

Describe what is included in the MVP.

## 7. User Experience Requirements

Describe UX principles, mobile-first requirements, brand requirements, trust signals, and core screens.

## 8. Functional Requirements

Organize requirements by area:

- Public ecommerce
- Product catalog
- Product detail
- Cart
- Checkout
- Mercado Pago payment flow
- Customer auth
- Account area
- Admin auth
- Product management
- Variant/stock management
- Image management
- Order management
- Fulfillment

## 9. User Stories

Write an extensive numbered list of user stories.

Each user story should use:

“As a <actor>, I want <feature>, so that <benefit>.”

Cover:

- New visitors
- Returning customers
- Guest checkout users
- Authenticated customers
- Admin users
- Business owner

## 10. Business Rules

Include rules for:

- Product visibility
- Active/inactive products
- Variants
- Stock
- Cart validation
- Checkout validation
- Order creation
- Payment confirmation
- Order statuses
- Shipping cost
- Guest checkout
- Customer accounts
- Admin permissions

## 11. Data / Domain Concepts

Describe the main domain concepts without writing a full database schema.

Include:

- User
- Customer
- Admin
- Product
- ProductImage
- ProductVariant
- Cart
- CartItem
- Order
- OrderItem
- Payment
- PaymentEvent
- ShippingAddress

## 12. Payment Requirements

Describe Mercado Pago flow:

- Order created before payment
- Order starts as pending_payment
- Payment/preference created
- User redirects to Mercado Pago
- Return pages are user-facing only
- Webhook/server-side verification is source of truth
- Payment success/failure/pending states

## 13. Shipping / Fulfillment Requirements

Describe fixed-cost shipping and manual fulfillment through Correo Argentino.

## 14. Admin Requirements

Describe admin workflows and required capabilities.

## 15. Edge Cases

List important edge cases:

- Out of stock
- Variant unavailable
- Price changed
- Cart invalid
- Payment failed
- Payment pending
- Webhook delayed
- Duplicate webhook
- User closes Mercado Pago
- Guest order tracking
- Image upload failure
- Admin edits stock while item is in cart

## 16. Success Criteria

Define what makes the MVP successful.

## 17. Open Questions

List only questions that remain genuinely unresolved.

## 18. Out of Scope

Repeat excluded features clearly.

## 19. Implementation Notes

Include high-level implementation implications only.

Do not include file paths or code snippets.

Do not over-specify architecture.

## 20. Testing Considerations

Describe what should be tested externally:

- Product browsing
- Variant selection
- Cart behavior
- Checkout validation
- Mercado Pago payment state handling
- Webhook idempotency
- Admin product management
- Admin order status changes