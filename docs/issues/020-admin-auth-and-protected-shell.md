# Issue 020: Admin Auth And Protected Shell

## Type

AFK

### AFK

Can be implemented without human clarification using a simple MVP admin permission model.

### HITL

Not applicable unless production credential provisioning is unavailable during implementation.

## Goal

Protect admin routes with admin-only authentication and provide a minimal operational admin shell.

## User Value

The owner can safely access management screens without exposing product, stock, or order operations publicly.

## Scope

- Add admin login route.
- Verify admin credentials using the project-appropriate auth mechanism.
- Protect all `/admin` routes.
- Handle invalid credentials, expired sessions, and unauthorized access.
- Add minimal admin shell/navigation for products and orders.
- Ensure no customer-facing auth/register/account flow is introduced.

## Out of Scope

- Customer authentication.
- Complex staff roles and permissions.
- Forgot password/OAuth.
- Admin product/order implementations.
- Audit logs.

## Vertical Slice

After this issue, admin-only pages can be safely added behind authentication.

## Deep Modules

- Admin session boundary: owns admin login, session validation, route protection, and unauthorized behavior.
  - Public interface: `requireAdmin`, `getCurrentAdmin`, admin login/logout actions as appropriate.
  - Testing implications: test route protection and invalid/expired session behavior where the app framework supports it.

## TDD Plan

- Test invalid credentials do not create admin session.
- Test protected admin route redirects or blocks unauthenticated access.
- Test valid admin session can access protected shell.
- Test public customer routes do not require login.

## Acceptance Criteria

- [ ] Admin login exists.
- [ ] Invalid login shows clear feedback without leaking sensitive details.
- [ ] Admin routes are protected.
- [ ] Expired or missing session cannot access admin pages.
- [ ] Admin shell exposes products and orders navigation.
- [ ] No public customer auth routes or CTAs are added.
- [ ] Admin login, navigation, unauthorized, expired-session, and validation feedback copy is Spanish (`es-AR`).

## Dependencies

- Issue 001: MVP Domain Rules Kernel.

## Risks

- Scope creep into customer auth would violate MVP decisions.
- Credential provisioning must be handled safely for deployment.

## UX Notes

Admin UI should be table/form oriented and operational, not brand-heavy. The auth wireframe is customer-auth reference only and should not drive MVP public UX.

## Future Extension Paths

- Staff roles.
- Password reset.
- Audit logs.
- Two-factor authentication.
