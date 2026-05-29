---
name: to-issues
description: Convert a PRD, plan, or product specification into small vertical-slice implementation issues optimized for AI-assisted development, deep modules, and TDD-first workflows.
---

# To Issues

Convert the PRD and supporting docs into independently implementable vertical slices.

The goal is NOT to produce broad implementation phases.

The goal is to produce:
- small end-to-end slices
- testable increments
- demoable functionality
- AI-friendly scopes
- maintainable implementation sequencing

Do NOT create issue tracker tickets.

Instead, generate local markdown issues inside:

- docs/issues/

Each issue should be self-contained and understandable without reopening the full PRD constantly.

---

# Core Philosophy

Implementation should prioritize:

- vertical slices over horizontal layers
- deep modules over shallow orchestration
- TDD-first for domain logic
- small end-to-end deliverables
- operational simplicity
- UX coherence
- fast iteration
- deployable increments

Avoid:
- giant implementation phases
- “build backend first”
- “build frontend first”
- speculative abstractions
- premature scalability
- broad infrastructure work without immediate product value

---

# Process

## 1. Gather Context

Read and synthesize:

- docs/prd.md
- docs/problem.md
- docs/ux.md
- docs/flows.md
- docs/mvp-scope.md
- docs/decisions.md
- docs/domain-model.md (if present)

Inspect wireframes if available:

- docs/wireframes/

Use:
- project terminology
- domain language
- existing business rules
- UX principles
- implementation principles

as source of truth.

---

## 2. Identify Deep Modules

Before generating issues, identify domain areas that should become deep modules.

A deep module:
- encapsulates meaningful complexity
- exposes a small/stable interface
- is easy to test in isolation
- reduces cognitive load for the rest of the system

Potential deep modules may include:

- cart logic
- checkout validation
- payment reconciliation
- order state transitions
- stock validation
- product variant resolution
- shipping calculation
- image management
- auth/session handling

For each deep module:
- explain why it exists
- define its responsibility boundary
- define its likely public interface
- identify whether TDD-first is required

Do NOT over-abstract prematurely.

Only extract deep modules where domain complexity genuinely exists.

---

## 3. Create Vertical Slices

Break the PRD into thin tracer-bullet vertical slices.

Each slice should:
- cut through all required layers
- provide real user or operational value
- be demoable or verifiable alone
- be independently implementable
- be reasonably scoped for AI-assisted implementation

A slice may include:
- DB changes
- domain logic
- API/server actions
- UI
- validations
- tests
- loading/error states

if required for that workflow.

Do NOT separate work artificially into:
- backend phase
- frontend phase
- database phase

unless a small foundational slice is truly required.

---

# Slice Rules

## Good Slice

A completed slice should:
- unlock a user workflow
- unlock an admin workflow
- unlock a domain capability
- or unlock an operational capability

Examples:
- browse active products
- add product to cart
- complete guest checkout
- admin updates order status
- payment webhook updates order state

---

## Bad Slice

Avoid issues like:
- “create all schemas”
- “implement backend”
- “implement frontend”
- “setup entire auth system”
- “create reusable component library”
- “implement all APIs”

These are too broad and horizontally sliced.

---

# Foundational Slices

Small foundational slices are allowed ONLY when they unlock future vertical slices.

Examples:
- DB connection setup
- auth/session bootstrap
- image upload infrastructure
- admin route protection

But they must remain:
- minimal
- non-speculative
- immediately useful

Avoid creating infrastructure for hypothetical future complexity.

---

# TDD-First Rules

Use TDD-first whenever business/domain logic exists.

Prioritize tests for:
- cart behavior
- subtotal/total calculations
- fixed shipping calculation
- stock validation
- checkout validation
- order state transitions
- payment reconciliation
- Mercado Pago webhook handling
- webhook idempotency
- product visibility rules
- variant availability rules
- admin order transitions

Tests should:
- focus on external behavior
- avoid implementation details
- prefer deterministic pure-domain logic
- validate invariants and business rules

Strict TDD is NOT required for:
- visual styling
- layout polish
- spacing
- typography
- animations
- purely presentational components

These should instead be validated manually against wireframes and UX requirements.

---

# AI-Assisted Development Rules

Issues should be optimized for:
- Cursor
- Codex
- GPT-assisted implementation
- incremental review
- rapid iteration

Therefore:
- prefer smaller scopes
- reduce cross-cutting ambiguity
- define acceptance criteria clearly
- avoid giant contexts
- avoid massive issue trees

A single issue should usually represent:
- one workflow
- one UX interaction
- one domain capability
- or one operational behavior

---

# Issue Granularity Rules

Prefer:
- many thin slices
- incremental extension
- progressive refinement

Over:
- large “complete system” slices

If uncertain:
- split further

Especially split when:
- multiple domain concepts are involved
- multiple UX flows are involved
- implementation risk is high
- many edge cases appear
- the issue would require very large AI context

---

# Issue Output Format

Create one markdown file per issue inside:

- docs/issues/

Naming format:

- 001-product-grid.md
- 002-product-detail.md
- 003-cart-domain-module.md

etc.

Each issue MUST use this structure:

---

# Issue XXX: Title

## Type

AFK or HITL

### AFK

Can be implemented without human clarification.

### HITL

Requires:
- UX review
- architectural decision
- business clarification
- design refinement
- or operational validation

Prefer AFK where possible.

---

## Goal

What this slice achieves.

---

## User Value

Describe the user/admin/business value unlocked.

Use:
- customer perspective
- admin perspective
- operational perspective
- or product perspective

where appropriate.

---

## Scope

Describe:
- behaviors
- workflows
- screens
- states
- validations
- integrations

included in this slice.

Focus on end-to-end behavior.

---

## Out of Scope

Explicitly list what this slice does NOT include.

Prevent scope creep.

---

## Vertical Slice

Describe:
- what becomes possible after this issue is completed
- what workflow is now usable/demoable

---

## Deep Modules

List any deep modules touched or introduced.

For each:
- responsibility
- public interface
- testing implications

If none:
- explicitly say “None”.

---

## TDD Plan

Describe:
- what should be tested first
- business invariants
- edge cases
- expected behavior

Focus on:
- domain logic
- state transitions
- validations
- calculations

Avoid implementation-detail tests.

---

## Acceptance Criteria

Use checkbox format:

- [ ] ...
- [ ] ...
- [ ] ...

Acceptance criteria should validate:
- behavior
- UX flow
- domain rules
- operational outcomes

NOT internal implementation details.

---

## Dependencies

List:
- required previous slices
- foundational blockers
- domain dependencies

If none:

“None — can start immediately.”

---

## Risks

List:
- implementation risks
- UX risks
- operational risks
- integration risks

Keep concise.

---

## UX Notes

Describe:
- wireframe references
- responsive expectations
- loading states
- empty states
- trust signals
- feedback behavior

if relevant.

---

## Future Extension Paths

Describe likely future expansion points WITHOUT implementing them now.

Examples:
- customer accounts
- discounts
- shipment tracking
- recommendations
- analytics

Keep future-oriented but conservative.

---

# Issue Sequencing

Generate issues in dependency order.

Prioritize:
1. foundational unlocks
2. product browsing
3. cart
4. checkout
5. payment
6. admin workflows
7. operational workflows
8. refinement/polish

Prefer early slices that:
- produce visible progress
- validate architecture
- validate UX assumptions
- reduce uncertainty quickly

---

# Important Constraints

Do NOT:
- overengineer
- introduce premature abstractions
- create microservices
- optimize for massive scale
- design for hypothetical future complexity

Prefer:
- simple architecture
- stable interfaces
- incremental refinement
- operational clarity
- maintainable domain boundaries

---

# Final Output

After generating all issue markdown files, also produce:

## 1. Deep Module Summary

Summarize:
- identified deep modules
- responsibilities
- testing priorities

---

## 2. Slice Dependency Graph

Show:
- recommended implementation order
- blockers
- parallelizable slices

---

## 3. MVP Critical Path

Identify:
- the minimum path to a deployable ecommerce MVP

---

## 4. Risk Review

Identify:
- highest-risk slices
- highest-ambiguity slices
- slices likely requiring human review

---

## 5. Architecture Pressure Points

Identify:
- areas likely to need refactoring later
- areas where future scaling pressure may appear

Do NOT solve them prematurely.