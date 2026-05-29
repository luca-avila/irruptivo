# Agent Rules

## Stack

- Next.js fullstack
- TypeScript
- PostgreSQL
- Prisma
- Tailwind
- React Server Components where appropriate
- Server Actions preferred over unnecessary API routes
- Zod for validation
- Vitest for domain tests
- Playwright later for e2e

---

## Architecture Principles

- Prefer vertical slices.
- Prefer simple architecture.
- Avoid premature abstractions.
- Do not introduce microservices.
- Do not create generic framework-like systems.
- Keep domain logic inside deep modules when complexity exists.
- Keep UI components dumb when possible.
- Prefer composition over large inheritance/config systems.

---

## TDD Rules

Use TDD-first for:
- cart logic
- checkout validation
- stock validation
- order transitions
- payment reconciliation
- webhook idempotency

Do not over-test visual components.

---

## Scope Rules

- Only implement the assigned issue.
- Do not refactor unrelated systems.
- Do not add future features.
- Respect Out of Scope sections strictly.

---

## UX Rules

- Mobile-first
- Low visual density
- Strong product hierarchy
- Clothing-first brand emphasis
- Clear loading/error/empty states
- Preserve trust signals during checkout
- All customer-facing and admin-facing UI copy must be Spanish for Argentina (`es-AR`), including labels, buttons, headings, errors, loading/empty/success states, email copy, metadata descriptions, and status text.
- Documentation, internal identifiers, enum values, route names, tests, and code symbols may stay English.
- Never render raw internal enum/status values such as `pending_payment`, `paid`, `ready_for_pickup`, `shipping`, or `pickup` to ordinary customers or admins. Map them through shared label/presenter helpers before they reach UI or email content.

---

## Code Rules

- Prefer explicit code over clever abstractions.
- Avoid giant files.
- Prefer feature-based organization.
- Keep public interfaces small and stable.
- Avoid unnecessary global state.
- Use server-side logic for sensitive operations.

---

## Required Outputs

For each completed issue:
- implementation
- tests
- acceptance criteria verification
- brief implementation summary
- risks/blockers if any
