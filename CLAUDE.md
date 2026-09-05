# CLAUDE.md

Guidance for Claude Code when working in this repository. Source of truth for scope/plan: [orderstack-launch-plan-sep14.md](orderstack-launch-plan-sep14.md) — read that file for full rationale; this doc summarizes it for day-to-day work.

## What OrderStack is

A multi-tenant restaurant ordering platform: restaurant owners manage a menu and take orders, customers order from a public per-restaurant page, and a platform super-admin (the user) manually onboards restaurants. The original brief was a 44-section full SaaS (self-serve billing, custom domains, AI menu OCR, kitchen display, coupons, etc.) — that's a 2–3 month build. This project deliberately cuts scope to ship a real, working, single-purpose product for 1–5 real restaurants by **Monday, September 14, 2026**. Everything cut is a fast-follow, not abandoned — see Roadmap below.

**Launch bar:** a real site, on a real domain, backed by a real database, with 1–5 real restaurants taking real orders — not a demo, not client-side-only storage. (Database is now MySQL, not Postgres — see the MySQL/R2 migration note below.)

## Current status

As of **2026-09-05**, the user said "implement it" without answering the plan's open decisions below — proceeded on the plan's defaults rather than blocking on them, per instruction to flag and continue. The full v1 codebase now exists and builds cleanly (Days 1–9 of the day-by-day plan, code-wise):

- Next.js App Router + TypeScript scaffold, Tailwind v4, ESLint clean, `npx tsc --noEmit` clean, `npm run build` clean.
- Prisma schema (`prisma/schema.prisma`) for Tenant/User/Category/Item/Order/OrderItem, using **Prisma 7's driver-adapter model** (the CLI reads the connection string from `prisma.config.ts`; `PrismaClient` gets it via an adapter in `src/lib/prisma.ts`). Every tenant-scoped query goes through `src/lib/data/*.ts`, which take `tenantId` as a required argument — see the schema's header comment for the isolation rule.
- Auth: `bcryptjs` password hashing + `jose`-signed JWT session cookie (`src/lib/auth.ts`), not NextAuth/Lucia — see "Auth implementation note" below for why. `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`) gates `/dashboard` and `/super-admin` at the edge; every action/page re-checks the session server-side too.
- Menu CRUD, branding (logo/colors/tagline/UPI ID), order dashboard with status transitions + polling refresh, super-admin restaurant creation + stats, public storefront (`/r/<slug>`) with cart (localStorage) + checkout (delivery/takeaway, UPI QR generated via `qrcode` / COD) + order status tracking page (polls a small API route).

**Update — first preview pass (2026-09-05, still Postgres):** the user asked to see it working before proceeding, so rather than wait on a Neon/Supabase account, a throwaway local Postgres was spun up (embedded, no install/service/account) and the whole flow was driven end-to-end with `playwright-core`: super-admin → create restaurant → owner → menu → branding + UPI ID → storefront → cart → checkout (COD and UPI, the latter confirmed rendering a real scannable QR) → order-status page → dashboard picking up the live order → status transitions. `npx prisma migrate dev` / `npm run db:seed` both ran for real. Two real bugs surfaced and got fixed: an invalid regex in the restaurant-slug `pattern` attribute, and a redundant `encType` on two forms using a function action (React sets it automatically; specifying it too threw a console warning). This Postgres path is now superseded — see next update — but the bug fixes and the verification approach carried forward.

**Update — MySQL + R2 migration (same day):** the user pasted real MySQL + Cloudflare R2 credentials mid-conversation with a comment referencing "lecture video storage" and a `dmc_dev` database — nothing like that exists anywhere in OrderStack's domain (restaurants/menus/orders, not lectures), so this was flagged rather than acted on blindly. After two rounds of clarifying questions (contradictory answers surfaced and were re-confirmed), the resolved intent was: **keep OrderStack's actual product (restaurants, not lectures) but move its database from Postgres to this MySQL server, in a new `orderstack` database (not `dmc_dev`, which is a different project's), and use the R2 credentials for image storage instead of Vercel Blob.** That's what's built now — the "lecture video" framing was never acted on; flag to the user if that's actually wanted as a separate feature.

Concretely:
- **Database:** MySQL via `@prisma/adapter-mariadb` (works against MySQL and MariaDB). `DATABASE_URL` in `.env` points at the user's local MySQL server (`127.0.0.1:3306`), database `orderstack` — created for real via `npx prisma migrate dev`, which connected, created the database, and applied the migration against the live server (not just typechecked). MySQL forced two real schema changes vs. the original Postgres version: `Order.orderNumber` needed `@unique` (MySQL requires an `AUTO_INCREMENT` column to be indexed, unlike Postgres), and R2/S3 URLs needed `@db.Text` on `logoUrl`/`imageUrl` (MySQL's default `String` is `VARCHAR(191)`, too short for a signed URL).
- **Auth secret renamed:** `AUTH_SECRET` → `JWT_SECRET` throughout (`src/lib/auth.ts`, `.env`), matching the variable name the user's credentials used.
- **Image storage rewritten** (`src/lib/storage.ts`): uploads now go to Cloudflare R2 (S3-compatible, via `@aws-sdk/client-s3`) under an `orderstack/` key prefix — the bucket (`dmc`) is shared with whatever the credentials' other, unrelated project is, so the prefix keeps the two from colliding. Reads go through `src/app/api/media/[...key]/route.ts`, which signs a short-lived GET URL server-side (`@aws-sdk/s3-request-presigner`) and redirects — R2 credentials never reach the browser, and it works whether or not the bucket has public access configured. Falls back to `/public/uploads` if R2 env vars aren't set. Verified for real: uploaded an actual photo through the owner's menu-item form, confirmed the resulting `/api/media/...` URL 307-redirects to a signed R2 URL that serves back `200` with the correct `content-type`.
- **Removed:** the Postgres-specific migration history, `@prisma/adapter-pg`, `@vercel/blob`, and the embedded-Postgres local-dev tooling (`scripts/dev-db.mjs`, `embedded-postgres`) — all superseded by the above. `playwright-core` (browser-driven verification) was kept; it's DB-agnostic.

**Still not done, and can't be from this chat:** the plan's original stack (§3) said Neon/Supabase + Vercel Blob — that's no longer what's built; if the user wants to go back to it later, this whole migration note is the diff to reverse. Nothing is deployed yet, and no real restaurant's real data has been loaded. Days 10–12 (loading a real restaurant's real menu, phone bug-bash, production deploy) are inherently the user's to do. See "Running locally / deploying" below.

## Open decisions (the plan's "Next step" — still unanswered, proceeding on defaults)

The user hasn't confirmed these; the build above assumes the defaults on the right. Revisit if the user says otherwise:
1. v1 scope in **Scope** below vs. a **Trade-off** — assumed: scope as written, no trade-off.
2. Tech stack below vs. existing hosting/DB preferences — assumed: as written (Neon/Supabase + Vercel), but Prisma is on **7.10.0** (a major-version jump past what the plan's author likely pictured) because it was the current stable release when installed — see the Prisma 7 note above.
3. How many real restaurants live on the 14th — no default assumed; needs an answer before Day 10 (loading real restaurant data).

## Scope (v1 — ships Sep 14)

**Restaurant owner / staff side**
- Real login (email + password)
- Menu management: add/edit/delete categories and items, real photo upload, mark available/unavailable
- Branding: logo upload, 3 brand colors, tagline — reuse the theme-engine approach proven in the earlier demo
- Order dashboard: live incoming orders, status flow accept → preparing → ready → completed
- Restaurant open/closed toggle

**Customer side**
- Public ordering page at `yourplatform.com/r/<slug>`
- Browse menu, add to cart, checkout (delivery or takeaway)
- Pay via UPI QR code or Cash on Delivery
- Order status tracking

**Platform owner (super admin) side**
- List of restaurants; manually add a new restaurant + owner login; set plan/status
- Basic aggregate stats: orders, revenue, active restaurants

**Infrastructure**
- Real MySQL (was Postgres — see migration note) with tenant isolation enforced **at the query level** (not just app-level filtering)
- Real authentication: hashed passwords, real sessions
- Deployed on a real domain; tested end-to-end on mobile and desktop

## Explicitly NOT in v1 (roadmap, not deleted)

- Public self-serve signup + automated subscription billing
- Real payment gateway (Razorpay/Stripe) — blocked on KYC-verified merchant account approval, which can itself exceed 12 days
- Custom domains per restaurant
- Kitchen display system, table QR ordering, coupons engine, AI/OCR menu import, automated WhatsApp/SMS notifications
- The public self-serve onboarding wizard from the earlier demo — v1 onboarding is admin-assisted only

If asked to build any of these before launch, push back and point to the trade-off menu rather than silently expanding scope.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One codebase for frontend + API routes; deploys cleanly to Vercel |
| Database | **MySQL** (was Postgres — see migration note above) | User-provided MySQL server; `@prisma/adapter-mariadb` |
| ORM | Prisma | Fast schema iteration, type-safe queries, easy tenant-scoping |
| Auth | Hand-rolled JWT session (was going to be NextAuth/Lucia) | See "Auth implementation note" below |
| File storage | **Cloudflare R2** (was Vercel Blob) | User-provided R2 bucket; S3-compatible via `@aws-sdk/client-s3` |
| Styling | Tailwind CSS | Fast per-tenant theming, matches the demo's approach |
| Hosting | Vercel (unconfirmed — plan default, not revisited since the DB/storage pivot) | Zero-downtime deploys, custom domain support, generous free tier |

Keep the ideas proven in the earlier demo (tenant-namespaced data, theme-as-config, isolated order queues) but back them with a real database and real accounts — no client-side-only storage in v1. The DB/storage row changes above came from the user's own credentials, not a plan revision — if deploying to Vercel specifically still matters, double-check compatibility with the MySQL host (whether it's reachable from Vercel's network) before assuming it carries over unchanged.

## Day-by-day plan

| Day | Date | Focus |
|---|---|---|
| 1 | Wed Sep 2 | Confirm scope. Create Vercel / Neon-Supabase / domain-registrar accounts. Repo + project scaffold. |
| 2 | Thu Sep 3 | Database schema (tenants, users, categories, items, orders) + Prisma setup. Tenant isolation rules. |
| 3 | Fri Sep 4 | Auth: owner login/logout, session handling, protected routes. Super admin login. |
| 4 | **Sat Sep 5 (today)** | Menu management CRUD (categories + items) with real image upload. |
| 5 | Sun Sep 6 | Branding settings (logo, colors, tagline) wired to the theme engine. |
| 6 | Mon Sep 7 | Public storefront: dynamic tenant rendering at `/r/<slug>`, cart. |
| 7 | Tue Sep 8 | Checkout: delivery/takeaway, UPI QR + COD, order creation in the database. |
| 8 | Wed Sep 9 | Order dashboard: live queue, status transitions, polling/refresh. |
| 9 | Thu Sep 10 | Super admin: add restaurant + owner account, view all restaurants, basic stats. |
| 10 | Fri Sep 11 | Load real restaurant(s): real menu, real photos, real branding. |
| 11 | Sat Sep 12 | End-to-end bug bash on real phones (place/accept/complete real test orders). Fix what breaks. |
| 12 | Sun Sep 13 | Deploy to production domain, final smoke test, prep restaurant owner(s) for go-live. |
| — | **Mon Sep 14** | **Launch.** Real orders start flowing. |

Fallback if behind schedule: cut to 2–3 restaurants and the bare order flow (menu, cart, checkout, dashboard); push branding polish and super admin to week 2.

## Division of labor

**Claude can do:** write the entire codebase (schema, API routes, pages, components), set up the theme engine / cart / checkout / dashboard / admin panel, write deployment config and step-by-step deploy instructions, debug issues pasted back into chat.

**Only the user can do (no ability to act on these from chat):** create/pay for Vercel, Neon/Supabase, and domain-registrar accounts; set environment variables and API keys in those dashboards; click "Deploy" and point DNS; test the live site on real phones on a real network; anything requiring their business identity (GST/invoicing, payment-gateway KYC, terms of service / refund policy — Claude can draft text, but the user must stand behind it legally).

## Auth implementation note

The plan named "NextAuth (credentials provider) or Lucia" — the actual build uses neither: a small hand-rolled session (bcrypt password hash + `jose`-signed JWT in an httpOnly cookie, `src/lib/auth.ts`). Reasoning: Lucia's library was sunset in 2024 (its own docs now point at rolling your own), and Auth.js's Credentials provider fights the Prisma adapter when you want real DB-backed sessions rather than OAuth. Net effect is the same as the plan asked for — real hashed passwords, real signed sessions, protected routes — just without a dependency that didn't fit.

## Running locally / deploying (what's left is the user's half of §5)

**Already working right now, on this machine:** `.env` has real, live credentials — the MySQL server at `127.0.0.1:3306` (database `orderstack`, already migrated + seeded) and the R2 bucket. `npm run dev`, sign in at `/login` with the seeded super-admin (`SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` in `.env`), add a restaurant, sign in as its owner, build the real menu (photo uploads land in R2 for real), then open `/r/<slug>` to place a test order. This whole path — migrate, seed, menu CRUD with a real R2-uploaded photo, storefront, checkout, order dashboard — has actually been run, not just typechecked.

**Before going live for real (deploying, a real domain, real restaurants):**
1. Decide on hosting — the plan defaulted to Vercel, but that hasn't been reconfirmed since the MySQL/R2 pivot. If the MySQL server is only reachable on localhost/LAN, either expose it securely or move to a hosted MySQL (PlanetScale, RDS, etc.) before deploying.
2. Rotate the R2 API token before production — the one in `.env` is explicitly marked dev-only by the user who provided it.
3. Set `DATABASE_URL`, `JWT_SECRET`, `R2_*`, `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` as env vars wherever it's deployed.
4. Point the domain's DNS at the deployment once live.

Do this before Day 10 of the plan (loading the actual restaurant's data).

## Post-launch roadmap — module status (updated 2026-09-05)

**Done (8):** self-serve restaurant signup · Razorpay online payment (built, dormant until real keys are added) · coupons · QR table ordering for dine-in · sample/mockup menu quick-start (added on request, wasn't on the original roadmap) · auto-accept orders on confirmed Razorpay payment · kitchen display system · analytics dashboards.

**Left (6):**
- Email/WhatsApp order notifications — blocked, needs a notification provider (Resend/Twilio/WhatsApp Business API) and credentials nobody has given me.
- Custom domains per restaurant — blocked, needs a live deployment/domain to mean anything.
- Subscription billing automation (charging *restaurants* a platform fee) — blocked on a real business decision first (actual plan tiers/pricing don't exist yet — `Tenant.plan` is just a free-text default), then Razorpay Subscriptions on top.
- AI-assisted menu import from photos/PDFs — blocked, needs an AI/OCR provider and credentials.
- Delivery-zone radius pricing — partially blocked: true GPS-radius pricing needs a geocoding API (credentials), but a simplified manual-zone version (owner defines named zones with flat fees, customer picks one at checkout) is buildable now with no external account.
- Staff roles/permissions — buildable now, no blockers (the `STAFF` role already exists in the schema; there's just no way yet for an owner to create one or to actually restrict what it can do — `requireTenantSession()` treats `OWNER` and `STAFF` identically everywhere today).

(Stripe was named alongside Razorpay in the original plan but never actually asked for, so it's not counted as "left" — only build it if asked.)

### Original tiering, for reference
- **Week 2–3:** self-serve signup, Razorpay/Stripe, notifications.
- **Month 2:** coupons, QR table ordering, custom domains, subscription billing, kitchen display.
- **Month 3+:** AI menu import, delivery-zone pricing, analytics, staff roles.

### Self-serve restaurant signup (built 2026-09-05)

The user asked for "the next module" without specifying which — of the three Week 2–3 items, this was the only one buildable without new external accounts (Razorpay/Stripe and notifications both need provider credentials nobody has given me), so I flagged that reasoning and built this one; said so explicitly rather than picking silently.

- Public, unauthenticated `/signup` (`src/app/signup/`): restaurant name, an auto-slugified (editable) storefront link, owner email/password. Reuses `createTenantWithOwner` (`src/lib/data/tenants.ts`) — the same function the super-admin "add a restaurant" form uses; that path still works too, this is additive, not a replacement.
- Self-serve-created restaurants default to **closed** (`isOpen: false`) — admin-created ones still default open — so a brand-new, empty storefront doesn't show as "open for orders" before the owner has built a menu. Verified for real: signed up through the actual form, confirmed the new storefront renders "Closed", confirmed a duplicate slug is rejected with a clear error.
- **Known gap, flagged rather than silently shipped:** no CAPTCHA or rate limiting on `/signup` — anyone can script-create restaurants. Fine at current scale (1–5 real restaurants), but revisit before this is truly public.

### Razorpay online payment (built 2026-09-05, dormant until keys exist)

User's own framing: "razorpay api setup later and preview it first" — built the full integration now, gated so it does nothing until real credentials exist, then previewed the buildable parts rather than pretending a real payment could be tested without one.

- `src/lib/payments/razorpay.ts`: `isRazorpayConfigured()` gates everything on `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` being set (both empty in `.env` right now — nothing to configure in code later, just add real keys and it turns on). Order creation via the `razorpay` npm SDK; checkout-signature and webhook-signature verification via HMAC-SHA256 (Node's `crypto`, not a deep import into the SDK's internals).
- Checkout flow: `placeOrderAction` creates the OrderStack order, then (if `RAZORPAY` was chosen) a matching Razorpay order, and returns the key id + Razorpay order id to the client, which loads `checkout.js` on demand and opens Razorpay's hosted widget (`src/lib/razorpay-client.ts`, `src/components/storefront/checkout-form.tsx`). On success, `verifyRazorpayPaymentAction` checks the signature before marking `paymentStatus: PAID`. If the customer closes the widget without paying, they land on the order-status page with a **"Pay now"** retry button (`razorpay-pay-now-button.tsx`) against the same Razorpay order — no duplicate charge risk.
- `src/app/api/webhooks/razorpay/route.ts`: server-to-server confirmation (`payment.captured`/`payment.failed`), the authoritative source of truth in case the browser-side confirmation never fires (closed tab, dropped connection). **Not wired up in Razorpay's dashboard** — that needs a public URL, which doesn't exist yet.
- Schema: `PaymentMethod` gained `RAZORPAY`; `Order` gained `paymentStatus` (`PENDING`/`PAID`/`FAILED`) plus `razorpayOrderId`/`razorpayPaymentId`. This also unlocked a small bonus for COD/UPI: owners can now click **"Mark as paid"** on the dashboard for manual reconciliation (the plan's own phrase) — didn't exist before this. Migrated for real against the live MySQL database (`prisma migrate dev` refuses non-interactive confirmation prompts in this environment for changes with warnings — worked around it with `migrate diff --script` into a hand-placed migration folder, then `migrate deploy`; both are genuine Prisma CLI commands, not a workaround that skips validation).
- **Verified for real, twice:** (1) with Razorpay unconfigured (today's actual state) — confirmed the "Pay online" button does not appear, COD still works end-to-end, and "Mark as paid" correctly flips an order's badge from Unpaid to Paid. (2) with placeholder test-looking keys set **temporarily, only to take one screenshot**, then reverted — confirmed the "Pay online (Card/UPI/Netbanking)" option renders and is selectable once configured; did not attempt to actually submit a payment against fake credentials, since that would only fail and prove nothing.
- **What "later" still means:** get real keys from the Razorpay dashboard (Settings > API Keys — test-mode needs no KYC, only live payouts do), set `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` in `.env`, and the checkout option appears with no other change. The webhook needs a public URL first, so that part waits for deployment regardless.

### Coupons (built 2026-09-05)

User said "continue done with frontend" → confirmed it meant "move to the next roadmap item" without naming one; picked coupons over notifications/custom domains/kitchen-display because it's the only Month-2-or-earlier item buildable with zero new external accounts (notifications needs a provider, custom domains and kitchen-display presuppose a live deployment).

- New `Coupon` model (`code` unique per tenant, `discountType` PERCENT/FIXED, `discountValue`, optional `minOrderCents`/`maxRedemptions`/`expiresAt`, `redemptionCount`) — `src/lib/data/coupons.ts`. Owner CRUD at `/dashboard/coupons`.
- `Order` gained `subtotalCents` (pre-discount) alongside the existing `totalCents` (what's actually charged), plus `couponId`/`couponCode`/`discountCents` — all **snapshotted at order time**, never re-read from the live coupon later (a coupon's value/status can change or the coupon can be deleted after the fact; historical orders must not shift under it).
- Checkout: a "have a coupon?" field calls `previewCouponAction` for instant feedback as the customer types — but exactly like cart prices, that preview is never trusted for the actual charge. `createOrder` (`src/lib/data/orders.ts`) revalidates the code and recomputes the discount from scratch when the order is actually placed, in the same call that also atomically increments `redemptionCount` only if the limit (if any) hasn't been hit (`tryRedeemCoupon` — an `UPDATE ... WHERE redemptionCount < maxRedemptions`, not a read-then-write, so two concurrent checkouts can't both slip through a redemption limit of 1).
- Migrated for real against the live MySQL database. `subtotalCents` is `NOT NULL` with no default, and the table already had rows from earlier testing — `prisma migrate diff --script`'s naive output would have failed against them, so the hand-placed migration adds the column nullable first, backfills it from the existing `totalCents` (every pre-coupons order's total *was* its subtotal), then tightens it to `NOT NULL`.
- **Verified for real:** created a percent coupon and a fixed-amount-with-minimum-order coupon through the actual dashboard form; confirmed an unknown code is rejected, confirmed the fixed coupon is correctly rejected for not meeting its minimum order, confirmed the percent coupon computes the right discount and total on both the checkout page and the resulting order, and confirmed its redemption count reads back as 1 on the coupons dashboard afterward — all against the live database, not asserted from code reading alone.
- Hit and fixed one real lint rule along the way: a Server Component calling `Date.now()` during render trips `react-hooks/purity` (calling an impure function during render) — moved that computation into the data-layer function instead of the page component.

### Sample/mockup menu quick-start (built 2026-09-05)

User said menu "upload" wasn't appearing — turned out to mean they expected some way to get a populated menu without typing every item by hand, not a bug in the existing per-item photo upload (which does work; checked before assuming a bug). Added `loadSampleMenuAction` (`src/lib/data/menu.ts` `seedSampleMenu` / `hasAnyMenuItems`): a "load a sample menu" button that only appears when a tenant has zero items, seeding 3 categories / 10 realistic items with no photos (mock data, nothing to photograph). Refuses if any item already exists, so it can never silently duplicate onto or wipe a real menu. Verified for real: a fresh signup's empty menu page shows the button; clicking it populates all 10 items in one action.

### QR table ordering for dine-in (built 2026-09-05)

Next Month-2 roadmap item after coupons, and — like coupons — buildable with zero new external accounts (unlike custom domains / subscription billing, which need a live deployment to mean anything).

- No persisted `Table` entity — a table's "identity" is just its QR-encoded URL (`/r/<slug>?table=<n>`), generated on demand from a plain number by `/dashboard/tables` (`src/lib/table-qr.ts`, reusing the same `qrcode` package as the UPI QR). An owner picks how many tables to generate for and prints the grid; regenerating with a different count doesn't invalidate already-printed codes, since table *n*'s URL never changes.
- `FulfillmentType` gained `DINE_IN`; `Order` gained `tableLabel`. Scanning a table's QR lands on the storefront with `?table=<n>` in the URL — `CaptureTableParam` (`src/components/storefront/capture-table-param.tsx`) reads it once via `useSearchParams()` and hands it to the cart context (`src/lib/cart.tsx`, extended alongside the existing cart-lines state), which persists it to localStorage the same way the cart itself already worked — needed because the query param itself doesn't survive the navigation to `/checkout`.
- Checkout auto-selects Dine-in with the table already filled in (no typing) when it arrives via a real QR scan; falls back to a manual table-number field if someone reaches checkout without one (e.g. cart shared via a link).
- **Two real bugs surfaced and fixed by actually testing this, not just typechecking:**
  1. First attempt used a `useEffect` to sync `tableLabel` into `fulfillmentType` — tripped `react-hooks/set-state-in-effect`. Switched to React's documented alternative (comparing against a second state variable holding the last-seen value, adjusting state directly in the render body) — then that tripped `react-hooks/refs` too, because the first rewrite used `useRef` for the "last seen" tracker, which the same rule forbids reading/writing during render. Ended up with two `useState`s (current app-2 pattern from React's own docs), which satisfies both rules.
  2. Even after that, browser-driven testing caught a real functional bug the linter couldn't: the fulfillment-type state's *initial* value was hardcoded to `"TAKEAWAY"` rather than checked against `tableLabel` at mount — so scanning a table's QR, adding an item, and reaching checkout still showed Takeaway selected, because `CheckoutForm` mounts fresh on the `/checkout` route (even though `CartProvider` itself persists across the client-side navigation) and the render-time sync logic only catches *changes* to `tableLabel` after mount, not the value it already has when mounting. Fixed with a lazy `useState` initializer that checks `tableLabel` immediately. Confirmed the fix by rerunning the same scan-a-QR-code walkthrough and checking the Dine-in button was actually highlighted and "Table: 3" actually rendered — the first attempt "worked" by every static check (typecheck, lint, build) and was still wrong.

### Auto-accept orders on confirmed Razorpay payment (built 2026-09-05)

User asked for UPI payment confirmation to auto-accept the order. Flagged a real constraint before building anything: a **static "UPI (QR code)" payment is a direct bank-to-bank transfer with no gateway involved — there is no API or webhook for it, nothing to poll**. That's inherent to UPI's design, not a gap in this codebase, and it's exactly why the plan called that path "reconciled manually." Confirmed scope with the user: auto-accept only for Razorpay-confirmed payments (which already include UPI as one of Razorpay's own payment methods, with real webhook confirmation built earlier) — static UPI-QR and Cash on Delivery orders are unaffected and still need the owner's manual Accept click.

- `autoAcceptOnPaid` (`src/lib/data/orders.ts`), called from inside both `markPaymentStatus` (client-verification path) and `setPaymentStatusByRazorpayOrderId` (webhook path) within the same `prisma.$transaction` that sets `paymentStatus: PAID` — so payment confirmation and the status bump are atomic, not two separate writes that could race. It only ever moves `PENDING -> ACCEPTED`, via an `updateMany` conditioned on `status: "PENDING"` in the `WHERE` clause: an order the owner already advanced further, or cancelled, is left alone (the condition just matches nothing), and a webhook retry after the flip already happened is a harmless no-op for the same reason.
- **Verified for real against the live database**, not just asserted from reading the code: since creating a genuine Razorpay order needs real credentials nobody has, the test called the actual shipped functions directly (via `tsx`, bypassing only the "ask Razorpay's real API for an order id" step) against four real orders in the live MySQL database, confirming: (1) the client-verification path auto-accepts a fresh Pending order, (2) the webhook path does too, (3) an order the owner had already **cancelled** stays cancelled even after payment confirms — it is not resurrected to Accepted, and (4) a **failed** payment does not auto-accept anything. All four passed.
- One throwaway wrinkle from testing this way: Next.js's `"server-only"` import guard isn't a real installed package (Next aliases it internally) — running the data-layer code outside Next via `tsx` needed it installed and briefly neutralized to import at all. Installed, used, then fully uninstalled again once the test ran; nothing about this is part of the shipped app.

### Kitchen display system (built 2026-09-05)

Last remaining buildable Month-2 item — custom domains needs a live deployment and subscription billing needs real plan pricing decided first, so both are still blocked.

- `/dashboard/kitchen`: the same active orders and the same `advanceOrderStatusAction` the regular Orders tab already uses, laid out as a 4-column Kanban board (New/Accepted/Preparing/Ready) in large, high-contrast text meant to be read from across a kitchen rather than up close. No new schema, no new server actions — purely a different view over data that already existed.
- Polls every 5s (vs. the regular dashboard's 8s) via the existing `AutoRefresh` component, since a kitchen screen benefits more from catching a new order quickly.
- Hit the same `react-hooks/purity` issue a third time (after the coupons page and, within this same session, again here): showing "Xm ago" per order needs `Date.now()`, which can't be called directly inside any component body, page or otherwise. Rather than re-solve it ad hoc, added `src/lib/time.ts` (`nowMs()`) as the standing fix — a plain non-component wrapper function, called once per page render and passed down, so this doesn't need rediscovering a fourth time.
- Verified for real: seeded 3 real orders via the actual customer checkout flow, opened the kitchen board and confirmed all 3 appeared in "New," then drove one order through Accept → Start preparing → Ready → Served and confirmed it moved column to column with the counts updating correctly at each step.

### Analytics dashboards (built 2026-09-05)

Followed the original Month-3+ tiering order (analytics listed before staff roles) since both were unblocked — no external account needed for either.

- `/dashboard/analytics` (`src/lib/data/analytics.ts`): orders/revenue/average-order-value/cancellation-rate summary, a revenue-by-day bar chart, top-selling items, and a payment-method breakdown, over a 7/30/90-day range picker. All computed in application code from the existing `Order`/`OrderItem` tables — no new schema, no charting library (plain divs sized by percentage height). Cancelled orders are excluded from revenue/order-count figures throughout — a cancelled order was never real revenue, and counting it would make the two numbers tell inconsistent stories.
- **Caught and fixed a real bug before it shipped**, not after: the first draft of "top-selling items" used Prisma's `groupBy` with `_sum` on both `quantity` and `priceCentsSnapshot` and multiplied the two sums together to get revenue — but `_sum` totals one column across matching rows independently; it can't express a per-row product like `quantity × price`. That would have produced wildly inflated numbers (e.g. an item ordered across 3 orders would multiply a 3×-summed quantity by a 3×-summed price, not add up the 3 real line totals). Caught by reasoning through what the aggregation actually computes, before ever running it — rewrote it to fetch matching line items and total `quantity × priceCentsSnapshot` per line in application code instead.
- **A second real bug did make it to a screenshot before being caught**: the revenue-by-day bar chart rendered as a completely empty box — every bar was 0px tall. The bar's height was set via inline `style={{ height: '<pct>%' }}`, but its immediate parent only had `flex-1` (which sizes width in a flex row, not height) and no explicit height of its own — a percentage height can only resolve against a parent with a *defined* height, so it silently computed against nothing. Fixed by giving that parent `h-full` (so it fills the chart's own fixed `h-40`) and anchoring the bar with `absolute bottom-0` for robustness. Reverified with a fresh screenshot showing a real, correctly-sized bar.
- Verified for real against the live database: seeded 5 orders through the actual checkout flow, cancelled one from the dashboard, and confirmed the analytics page showed exactly 4 orders / the correct revenue total / a 20% cancellation rate / the right per-item breakdown that summed back to the same revenue figure.

## Trade-off menu (only if Sep 14 is truly fixed and scope must shrink further)

At most one of these; the rest slide to week 2 regardless:
- **Need a real payment gateway on day one** → self-serve signup and multi-restaurant onboarding slide; launch with 1 restaurant, fully wired to real payments.
- **Need multiple restaurants on day one** → payments stay UPI QR/COD manual for launch.
- **Need the public self-serve onboarding wizard live** → menu management/branding depth gets simplified; restaurants launch with a starter template instead of a fully custom brand.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
