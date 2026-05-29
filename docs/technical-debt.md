Summarize the last implemented issues for later review in Notion.

Goal:
I am prioritizing fast shipping, but I want to keep a clear technical learning/debt log so I can review the code later.

Use git history, recent commits, changed files, and docs/issues/ to identify the last implemented issues.

If the issue range is ambiguous, infer the most recent completed issues from the current branch and mention the assumption.

Do not modify code.
Do not refactor.
Do not ask questions unless you cannot identify any recently implemented issue.

Output in this format:

# Implementation Review Summary

## Issue Range Reviewed

- Issues:
- Assumption used to identify them:

## Executive Summary

Short 3–6 bullet summary of what changed and why it matters.

## New / Changed Modules

For each important file, include:
- file path
- what it does
- why it matters
- whether it is temporary, stable, or likely to change

Format:

- `path/to/file.ts`
  - Role:
  - Important behavior:
  - Stability:

## New Database / Persistence Changes

Include:
- new entities
- changed entities
- migrations
- seed/demo data
- localStorage/session/cookie persistence
- no-op if none

## New Domain Rules

List any business rules, invariants, calculations, state transitions, validations, or assumptions introduced.

For each rule, include the file where it lives.

## Important Next.js Concepts Used

Explain any relevant Next.js concepts used in these issues, with file references.

Examples:
- App Router
- layouts
- server components
- client components
- server actions
- route handlers
- metadata
- dynamic routes
- loading/error states
- env vars
- image handling

## Important TypeScript Concepts Used

Explain relevant TypeScript patterns used, with file references.

Examples:
- union types
- `as const`
- discriminated unions
- type guards
- generic types
- readonly arrays
- Zod schemas
- inferred types
- type-only imports

## Tests Added / Changed

Include:
- test file paths
- what behavior they cover
- missing tests worth adding later

## Verification

Report whether these pass:

- package install status if relevant
- typecheck
- lint
- tests
- build if run

If something was not run, say clearly: “Not run”.

## Risks / Technical Debt

List technical debt accumulated during these issues.

For each item include:
- area
- concern
- risk
- suggested later review/fix
- related files

## Questions For Later Review

List things I should ask about or study later to understand the implementation.

Focus on:
- Next.js concepts
- TypeScript concepts
- domain decisions
- architecture decisions
- testing approach
- possible refactors

## Files Worth Reading First

Give me a prioritized reading list.

For each file:
- why I should read it
- what I should try to understand

## Suggested Notion Tags

Suggest tags like:
- Next.js
- TypeScript
- Domain Logic
- Tech Debt
- Testing
- UX
- Prisma
- Auth
- Payments
- Admin
- Refactor Later

Keep the summary concise but useful.
Prioritize the most important files and decisions.
Do not include huge code snippets.