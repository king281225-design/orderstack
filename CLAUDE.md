# CLAUDE.md

Guidance for Claude Code when working in this repository. Source of truth for scope/plan: [orderstack-launch-plan-sep14.md](orderstack-launch-plan-sep14.md) — read that file for full rationale; this doc summarizes it for day-to-day work.

## What OrderStack is

A multi-tenant restaurant ordering platform: restaurant owners manage a menu and take orders, customers order from a public per-restaurant page, and a platform super-admin (the user) manually onboards restaurants. The original brief was a 44-section full SaaS (self-serve billing, custom domains, AI menu OCR, kitchen display, coupons, etc.) — that's a 2–3 month build. This project deliberately cuts scope to ship a real, working, single-purpose product for 1–5 real restaurants by **Monday, September 14, 2026**. Everything cut is a fast-follow, not abandoned — see Roadmap below.

**Launch bar:** a real site, on a real domain, backed by a real Postgres database, with 1–5 real restaurants taking real orders — not a demo, not client-side-only storage.

## Current status

As of **2026-09-05**, the user said "implement it" without answering the plan's open decisions below — proceeded on the plan's defaults rather than blocking on them, per instruction to flag and continue. The full v1 codebase now exists and builds cleanly (Days 1–9 of the day-by-day plan, code-wise):

- Next.js App Router + TypeScript scaffold, Tailwind v4, ESLint clean, `npx tsc --noEmit` clean, `npm run build` clean.
- Prisma schema (`prisma/schema.prisma`) for Tenant/User/Category/Item/Order/OrderItem, using **Prisma 7's driver-adapter model** (`@prisma/adapter-pg` — Prisma 7 dropped `datasource { url }` from schema.prisma; the CLI reads the connection string from `prisma.config.ts`, `PrismaClient` gets it via the adapter in `src/lib/prisma.ts`). Every tenant-scoped query goes through `src/lib/data/*.ts`, which take `tenantId` as a required argument — see the schema's header comment for the isolation rule.
- Auth: `bcryptjs` password hashing + `jose`-signed JWT session cookie (`src/lib/auth.ts`), not NextAuth/Lucia — see "Auth implementation note" below for why. `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`) gates `/dashboard` and `/super-admin` at the edge; every action/page re-checks the session server-side too.
- Menu CRUD, branding (logo/colors/tagline/UPI ID), order dashboard with status transitions + polling refresh, super-admin restaurant creation + stats, public storefront (`/r/<slug>`) with cart (localStorage) + checkout (delivery/takeaway, UPI QR generated via `qrcode` / COD) + order status tracking page (polls a small API route).
- Image uploads (`src/lib/storage.ts`): writes to `/public/uploads` locally; switches to Vercel Blob automatically once `BLOB_READ_WRITE_TOKEN` is set (real durable storage — required before going live, see below).

**Update (same day, preview pass):** the user asked to see it working before proceeding, so rather than wait on a Neon/Supabase account, a throwaway local Postgres was spun up with `embedded-postgres` (`scripts/dev-db.mjs`, `npm run dev:db` — no install, no service, no account, project-scoped to `.devdb/`) and the whole flow was actually driven end-to-end with `playwright-core` against the running dev server: super-admin login → create restaurant → owner login → add menu category/item → set branding + UPI ID → public storefront → add to cart → checkout (both Cash on Delivery and UPI, the latter confirmed rendering a real scannable QR) → order-status page → back to the owner dashboard seeing the live order → Accept transitions it. `npx prisma migrate dev` and `npm run db:seed` both ran for real (not just typechecked) and worked. Two real bugs surfaced and were fixed: an invalid regex in the restaurant-slug `pattern` attribute, and a redundant `encType` on two forms that use a function action (React sets it automatically; specifying it too threw a console warning). This embedded-Postgres path is a **local dev/preview convenience only** — production still needs a real Neon/Supabase database per the plan; nothing about that changed.

**Still not done, and can't be from this chat:** no Neon/Supabase project exists yet, nothing is deployed, and no real restaurant's real data has been loaded. Days 10–12 (loading a real restaurant's real menu, phone bug-bash, production deploy) are inherently the user's to do once those accounts exist. See "Running locally / deploying" below.

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
- Real PostgreSQL with tenant isolation enforced **at the query level** (not just app-level filtering)
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
| Database | PostgreSQL via Neon or Supabase | Real managed Postgres; free tier covers launch scale |
| ORM | Prisma | Fast schema iteration, type-safe queries, easy tenant-scoping |
| Auth | NextAuth (credentials provider) or Lucia | Real sessions without building auth from scratch |
| File storage | Supabase Storage or Vercel Blob | Real image uploads for logos and menu photos |
| Styling | Tailwind CSS | Fast per-tenant theming, matches the demo's approach |
| Hosting | Vercel | Zero-downtime deploys, custom domain support, generous free tier |

Keep the ideas proven in the earlier demo (tenant-namespaced data, theme-as-config, isolated order queues) but back them with a real database and real accounts — no client-side-only storage in v1.

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

**Trying it out locally right now, no accounts needed:** `npm run dev:db` in one terminal (starts a throwaway local Postgres via `embedded-postgres`, prints the `DATABASE_URL` to use — already set in `.env`), then `npx prisma migrate dev` + `npm run db:seed` once, then `npm run dev`. This is exactly the path already verified in the preview pass above — not hypothetical.

**Going to a real, deployed instance for the actual 1–5 restaurants:**
1. **Provision Postgres** — create a Neon or Supabase project, copy its connection string into `DATABASE_URL` in `.env` (copy `.env.example` → `.env` first if starting fresh), replacing the local `dev:db` one.
2. **Generate a real `AUTH_SECRET`** if not already set — `.env` already has one auto-generated by the initial scaffold; rotate it before real use if that file was ever shared.
3. `npx prisma migrate dev --name init` against the real `DATABASE_URL`, then `npm run db:seed`.
4. `npm run dev`, sign in at `/login` with the super-admin credentials, add a restaurant, sign in as its owner, build the real menu, then open `/r/<slug>` to place a test order.
5. **Before going live on Vercel:** set `DATABASE_URL`, `AUTH_SECRET`, `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` as env vars in the Vercel dashboard, and create a Blob store there to get `BLOB_READ_WRITE_TOKEN` — without it, uploaded photos land on Vercel's ephemeral filesystem and will vanish.
6. Point the domain's DNS at Vercel once deployed.

Do this real-database pass before Day 10 of the plan (loading the actual restaurant's data).

## Post-launch roadmap

- **Week 2–3:** Razorpay/Stripe integration once the merchant account is approved; self-serve restaurant signup (turn the demo onboarding wizard into the real thing); email/WhatsApp order notifications.
- **Month 2:** Coupons, QR table ordering for dine-in, custom domains, subscription billing automation, kitchen display system.
- **Month 3+:** AI-assisted menu import from photos/PDFs, delivery-zone radius pricing, analytics dashboards, staff roles/permissions.

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
