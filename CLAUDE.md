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

## Post-launch roadmap

- **Week 2–3:** ~~Self-serve restaurant signup~~ **done** — see below. Razorpay/Stripe integration is still blocked on a KYC-verified merchant account (nothing to build yet without those credentials); email/WhatsApp order notifications still needs a provider (Resend/Twilio/WhatsApp Business API) and credentials.
- **Month 2:** Coupons, QR table ordering for dine-in, custom domains, subscription billing automation, kitchen display system.
- **Month 3+:** AI-assisted menu import from photos/PDFs, delivery-zone radius pricing, analytics dashboards, staff roles/permissions.

### Self-serve restaurant signup (built 2026-09-05)

The user asked for "the next module" without specifying which — of the three Week 2–3 items, this was the only one buildable without new external accounts (Razorpay/Stripe and notifications both need provider credentials nobody has given me), so I flagged that reasoning and built this one; said so explicitly rather than picking silently.

- Public, unauthenticated `/signup` (`src/app/signup/`): restaurant name, an auto-slugified (editable) storefront link, owner email/password. Reuses `createTenantWithOwner` (`src/lib/data/tenants.ts`) — the same function the super-admin "add a restaurant" form uses; that path still works too, this is additive, not a replacement.
- Self-serve-created restaurants default to **closed** (`isOpen: false`) — admin-created ones still default open — so a brand-new, empty storefront doesn't show as "open for orders" before the owner has built a menu. Verified for real: signed up through the actual form, confirmed the new storefront renders "Closed", confirmed a duplicate slug is rejected with a clear error.
- **Known gap, flagged rather than silently shipped:** no CAPTCHA or rate limiting on `/signup` — anyone can script-create restaurants. Fine at current scale (1–5 real restaurants), but revisit before this is truly public.

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
