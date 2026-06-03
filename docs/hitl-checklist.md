# MVP HITL Checklist

> Source of truth: the HITL audit of the Irruptivo MVP. This document tracks every
> remaining Human-In-The-Loop item before demo and production. Update checkboxes as
> items are resolved. Documentation only — resolving these items may require code or
> config changes owned by the listed party.

## Current Status

- **MVP implementation:** Complete (issues 001–028).
- **Issue 028 (MVP Feedback State Pass):** Complete and committed.
- **Demo-ready:** ✅ Yes, technically. The app runs end-to-end with PostgreSQL seed data
  and the local dev email outbox; no external accounts required. Only business copy /
  contact links / product images need attention to make a demo credible.
- **Production-ready:** ❌ No. Persistence is implemented, including catalog/admin
  product data, orders, payment events, stock decrements on paid, and email-delivery
  records. Remaining blockers are Mercado Pago live setup, admin secrets, a production
  email provider, persistent media storage, and a deployment-target decision.

---

## Must Resolve Before Demo

These are business/content items. The app runs without them, but it will look unfinished.

- [X] **Real WhatsApp link**
  - Action: Set `NEXT_PUBLIC_WHATSAPP_URL` to the real business WhatsApp link.
  - Why it matters: Storefront, payment, and order-status contact paths point to a
    placeholder (`wa.me/5490000000000`).
  - Files/env: `NEXT_PUBLIC_WHATSAPP_URL`; consumed in `src/storefront/navigation.ts`,
    `src/payments/payment-result.ts`, `src/notifications/order-confirmation-email.ts`.
  - Owner: human
  - Blocking level: Demo (cosmetic, high visibility)

- [X] **Real Instagram link**
  - Action: Set `NEXT_PUBLIC_INSTAGRAM_URL` to the real account.
  - Why it matters: Trust/contact links use placeholder `instagram.com/irruptivo`.
  - Files/env: `NEXT_PUBLIC_INSTAGRAM_URL`; `src/storefront/navigation.ts`.
  - Owner: human
  - Blocking level: Demo (cosmetic)

- [X] **Pickup location copy confirmation**
  - Action: Confirm "Retiro en Benavidez/Zona Norte" is the real pickup area, or correct it.
  - Why it matters: Hardcoded customer-facing copy shown on trust pages and in the
    confirmation email.
  - Files/env: `src/storefront/trust-pages.ts`,
    `src/notifications/order-confirmation-email.ts` (delivery summary fallback).
  - Owner: human (decision) → agent (copy edit if it changes)
  - Blocking level: Demo

- [X] **Product images / placeholders**
  - Action: Upload real product images via admin, or accept the empty-state UI for demo.
  - Why it matters: The demo catalog references image renditions; without media on disk
    the storefront shows empty image states.
  - Files/env: `IRRUPTIVO_MEDIA_ROOT` (must be writable); admin product image upload.
  - Owner: human
  - Blocking level: Demo

- [ ] **Hardcoded WhatsApp bug in payment result page**
  - Action: Replace the hardcoded `wa.me/5490000000000` with the env-driven link so it
    matches `NEXT_PUBLIC_WHATSAPP_URL`.
  - Why it matters: This one spot ignores the env var and will show the placeholder even
    after the real link is configured.
  - Files/env: `src/storefront/components/payment-result-page.tsx:141`.
  - Owner: agent (small doc-adjacent fix; do on request)
  - Blocking level: Demo (will display wrong number)

---

## Must Resolve Before Production

- [x] **Persistence layer / database**
  - Status: Complete. PostgreSQL + Prisma now back catalog/admin product data, image
    metadata, orders, payment events, and email-delivery records. Demo catalog data is
    seed/test fixture data only.
  - Notes: There is no stock reservation/hold system. Cart validation checks available
    stock, and stock decrements when a Mercado Pago payment is approved.
  - Files/env: `DATABASE_URL`, `prisma/schema.prisma`, `src/db/client.ts`,
    `src/catalog/product-repository.ts`, `src/orders/order-store.ts`,
    `src/payments/payment-events.ts`, `src/notifications/order-confirmation-email.ts`.
  - Owner: agent
  - Blocking level: Resolved

- [ ] **Mercado Pago live credentials**
  - Action: Set `MERCADO_PAGO_ACCESS_TOKEN` (live, not `TEST-`) and
    `MERCADO_PAGO_WEBHOOK_SECRET`.
  - Why it matters: Real payments and webhook signature verification require live values.
  - Files/env: `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`;
    `src/payments/payment-preference.ts`, `src/payments/mercado-pago-webhook.ts`.
  - Owner: human
  - Blocking level: Production

- [ ] **Mercado Pago public webhook URL + return URLs**
  - Action: Register a publicly reachable HTTPS webhook in the MP dashboard, set
    `MERCADO_PAGO_NOTIFICATION_URL` to match, and set `IRRUPTIVO_APP_URL` to the real origin.
  - Why it matters: Payment confirmation only happens server-side via webhook; without a
    public URL it cannot complete.
  - Files/env: `MERCADO_PAGO_NOTIFICATION_URL`, `IRRUPTIVO_APP_URL`;
    `app/api/mercado-pago/webhook/route.ts`.
  - Owner: human
  - Blocking level: Production

- [X] **Admin credentials and session secret**
  - Action: Replace placeholders with a real admin username, strong password, and a random
    `ADMIN_SESSION_SECRET` of ≥32 chars.
  - Why it matters: `.env.example` ships `admin@example.com` / `change-me` /
    `replace-with-at-least-32-characters`.
  - Files/env: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`;
    `src/admin/session.ts`.
  - Owner: human
  - Blocking level: Production

- [X] **Email provider decision**
  - Action: Resend chosen and integrated as the production transactional email provider.
  - Why it matters: The adapter is provider-agnostic with a local outbox fallback; a real
    provider is required to send confirmation and admin notification emails in production.
  - Files/env: `IRRUPTIVO_EMAIL_PROVIDER=resend`, `IRRUPTIVO_EMAIL_PROVIDER_TOKEN`,
    `IRRUPTIVO_EMAIL_FROM_EMAIL`, `IRRUPTIVO_EMAIL_FROM_NAME`;
    `IRRUPTIVO_EMAIL_PROVIDER_URL` is not used in resend mode.
    `src/notifications/email-provider.ts`.
  - Owner: agent (integration done) → human (production credentials)
  - Blocking level: Production

- [ ] **Admin paid-order notification recipient**
  - Action: Set the recipient from `/admin/configuracion`, or configure
    `IRRUPTIVO_ADMIN_NOTIFICATION_EMAIL` as the fallback.
  - Why it matters: Paid orders still complete without this value, but the store operator
    will not receive internal purchase notifications.
  - Files/env: `IRRUPTIVO_ADMIN_NOTIFICATION_EMAIL`; `src/admin/settings.ts`,
    `src/notifications/admin-order-notification-email.ts`.
  - Owner: human
  - Blocking level: Production operations

- [ ] **Email sender-domain DNS verification**
  - Action: Verify the sending domain (SPF/DKIM) with the chosen provider. Start early —
    long lead time.
  - Why it matters: Without domain verification, confirmation emails land in spam or fail.
  - Files/env: `IRRUPTIVO_EMAIL_FROM_EMAIL` must be a verified domain.
  - Owner: human
  - Blocking level: Production (deliverability)

- [X] **Persistent media storage**
  - Action: Resolved for the Docker/VPS path — the `app` service mounts the named
    `media_data` volume at `/var/lib/irruptivo/media` (matching `IRRUPTIVO_MEDIA_ROOT`),
    so uploads persist across redeploys and the container `node` user owns the mount
    (no host chown or runtime sudo). Remaining human task: back up the `media_data`
    volume and monitor disk usage.
  - Why it matters: Default `/var/lib/irruptivo/media` must persist and be writable for
    uploads and rendition serving.
  - Files/env: `IRRUPTIVO_MEDIA_ROOT`; `docker-compose.yml` (`media_data` volume),
    `Dockerfile`; `src/media/product-media.ts`, `src/admin/product-image-processing.ts`.
  - Owner: human (backups/monitoring) → agent (volume wiring, done)
  - Blocking level: Production

- [X] **Deployment target decision: VPS vs serverless**
  - Action: Decide VPS or serverless; the choice now mainly gates media storage and
    deployment operations.
  - Why it matters: Code has `.vercel.app` URL handling (implies serverless), but issue 023
    mandates persistent filesystem media. VPS matches filesystem media; serverless needs
    external object storage.
  - Files/env: deployment config (none present yet); `src/payments/*`, `src/media/*`.
  - Owner: human
  - Blocking level: Production (gates media/deploy setup)

- [ ] **Production env vars set and verified**
  - Action: Populate every production-required variable (see audit checklist) in the
    deployment environment and run one end-to-end purchase to confirm webhook → `paid` →
    confirmation email.
  - Why it matters: Missing values fail closed but block the purchase flow.
  - Files/env: `.env` (production); `.env.example` documents the full set.
  - Owner: human
  - Blocking level: Production

---

## Deferred After MVP

Safe to leave for later; none block demo or production.

- [X] **Dynamic shipping rates** — fixed ARS 5.000 / pickup ARS 0 is an intentional MVP rule.
- [ ] **Address validation** — simple Argentina address fields are sufficient for MVP.
- [ ] **Media backup automation** — soft delete is implemented; backup/cleanup deferred.
- [ ] **Analytics instrumentation** — listed as a future path in issue 028.
- [ ] **Advanced email notifications** — shipment/pickup-ready emails out of scope (issue 019).
- [ ] **Marketing emails** — no marketing/opt-in behavior in MVP.

---

## Decisions Needed

| Decision | Options | Recommended default | Deadline | Blocks demo? | Blocks production? | Notes |
|---|---|---|---|---|---|---|
| Deployment target | VPS / Serverless (Vercel) | VPS | Before infra setup | No | Yes | Gates media and deploy operations. PostgreSQL persistence is implemented. |
| Persistence layer | PostgreSQL + Prisma implemented | Keep current DB path | Done | No | No | Business state persists across restart; no stock reservation/hold system remains. |
| Email provider | Resend chosen | Resend | Done | No | No | Resend mode implemented; production credentials still need to be set. |
| Media storage | VPS filesystem / object storage (S3/R2) | VPS filesystem | With deployment target | No | Yes | Filesystem requires VPS; serverless requires object storage. |
| Pickup location copy | Confirm Benavidez/Zona Norte / edit | Confirm as-is | Before demo | Yes | No | Hardcoded in trust pages + email. |
| MP credential mode for demo | Sandbox (`TEST-`) / skip MP | Sandbox `TEST-` | Before demo | No | No | Live token routes to production; `TEST-` auto-routes to sandbox. |

---

## Recommended Next Actions

In order:

1. **Demo polish (≈30 min, human + one small agent fix):** set real
   `NEXT_PUBLIC_WHATSAPP_URL` and `NEXT_PUBLIC_INSTAGRAM_URL`, confirm pickup copy, add
   placeholder/real product images, and fix the hardcoded WhatsApp number in
   `payment-result-page.tsx`.
2. **Make the deployment-target decision (VPS vs serverless).** This unblocks media and
   deploy operations.
3. **Start Resend sender-domain DNS verification** in parallel — it has the longest lead time.
4. **Mercado Pago production setup:** live credentials, webhook secret, public
   `MERCADO_PAGO_NOTIFICATION_URL`, real `IRRUPTIVO_APP_URL`; then run one end-to-end
   purchase test.
5. **Set and verify all production env vars**, including Resend credentials, sender, and
   `IRRUPTIVO_ADMIN_NOTIFICATION_EMAIL` or the DB setting in `/admin/configuracion`.
6. **Leave deferred items** (dynamic shipping, address validation, backups, analytics,
   advanced/marketing email) for post-MVP.
