# BhojSetu — Launch Plan for September 14, 2026

**Written:** September 2, 2026 · **Time to launch:** 12 days

---

## 1. Read this first — the honest scope call

The original brief (44 sections: full multi-tenant SaaS, self-serve billing, custom domains, AI menu OCR, kitchen display, delivery-zone radius pricing, coupon engine, notification providers, super-admin plan editor...) is a **2–3 month build for a small team**, not a 12-day one. Trying to build all of it by Sep 14 produces something that's broken everywhere instead of solid somewhere.

So this plan makes a deliberate cut: **ship a real, working, single-purpose product for a small number of real restaurants — not a polished self-serve SaaS.** Everything else becomes a fast-follow after launch.

**What "launch" means on Sep 14, realistically:**
- A real website, on a real domain, backed by a real database — not a demo.
- 1–5 real restaurants (the ones you bring on personally) taking real orders through it.
- You (or a trusted operator) adding new restaurants through an admin panel — not yet a public "sign up and build your own site" flow.
- Payment collection via **UPI QR code / Cash on Delivery**, reconciled manually — not a live payment gateway.

**What does NOT make it by Sep 14** (moved to the roadmap in §6):
- Public self-serve signup + automated subscription billing
- Real payment gateway integration (Razorpay/Stripe) — this needs your KYC-verified business account, which itself can take longer than 12 days to approve
- Custom domains per restaurant
- Kitchen display system, table QR ordering, coupons engine, AI/OCR menu import, automated WhatsApp/SMS notifications
- The "anyone can onboard themselves" wizard we built as a demo — v1 onboarding is admin-assisted, not public

If any of the above is a hard requirement for the 14th, tell me now and we cut something else instead — see §7 for the trade-off menu.

---

## 2. What ships on Sep 14 (v1 scope)

**Restaurant owner / staff side**
- Real login (email + password)
- Menu management: add/edit/delete categories and items, upload real photos, mark available/unavailable
- Branding: logo upload, 3 brand colors, tagline — reusing the theme engine from the demo
- Order dashboard: live incoming orders, accept → preparing → ready → completed
- Restaurant open/closed toggle

**Customer side**
- Public ordering page at `yourplatform.com/r/<slug>`
- Browse menu, add to cart, checkout (delivery or takeaway)
- Pay via UPI QR / Cash on Delivery
- Order status tracking

**Platform owner (you) side**
- Super admin: list of restaurants, manually add a new restaurant + owner login, mark plan/status
- Basic aggregate stats: orders, revenue, active restaurants

**Infrastructure**
- Real PostgreSQL database with tenant isolation enforced at the query level
- Real authentication with hashed passwords and sessions
- Deployed on a real domain, working on mobile and desktop, tested end-to-end

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | One codebase for frontend + API routes; deploys cleanly to Vercel |
| Database | **PostgreSQL via Neon or Supabase** | Real managed Postgres, free tier is enough for launch scale |
| ORM | **Prisma** | Fast schema iteration, type-safe queries, easy tenant-scoping |
| Auth | **NextAuth (credentials provider) or Lucia** | Real sessions, no need to build auth from scratch |
| File storage | **Supabase Storage or Vercel Blob** | Real image uploads for logos and menu photos |
| Styling | **Tailwind CSS** | Fast to theme per tenant, matches the demo's approach |
| Hosting | **Vercel** | Zero-downtime deploys, custom domain support, generous free tier |

This keeps the same *ideas* proven in the demo (tenant-namespaced data, theme-as-config, isolated order queues) but backs them with a real database and real accounts instead of client-side storage.

---

## 4. Day-by-day plan

| Day | Date | Focus |
|---|---|---|
| 1 | Wed Sep 2 | Confirm this scope. Create accounts: Vercel, Neon/Supabase, domain registrar. Repo + project scaffold. |
| 2 | Thu Sep 3 | Database schema (tenants, users, categories, items, orders) + Prisma setup. Tenant isolation rules. |
| 3 | Fri Sep 4 | Auth: owner login/logout, session handling, protected routes. Super admin login. |
| 4 | Sat Sep 5 | Menu management CRUD (categories + items) with real image upload. |
| 5 | Sun Sep 6 | Branding settings (logo, colors, tagline) wired to the theme engine. |
| 6 | Mon Sep 7 | Public storefront: dynamic tenant rendering at `/r/<slug>`, cart. |
| 7 | Tue Sep 8 | Checkout: delivery/takeaway, UPI QR + COD, order creation in the database. |
| 8 | Wed Sep 9 | Order dashboard: live queue, status transitions, polling/refresh. |
| 9 | Thu Sep 10 | Super admin: add restaurant + owner account, view all restaurants, basic stats. |
| 10 | Fri Sep 11 | Load your real restaurant(s): real menu, real photos, real branding. |
| 11 | Sat Sep 12 | End-to-end bug bash on real phones (place real test orders, accept them, complete them). Fix what breaks. |
| 12 | Sun Sep 13 | Deploy to production domain, final smoke test, prepare the restaurant owner(s) for go-live. |
| — | **Mon Sep 14** | **Launch.** Real orders start flowing for your first restaurant(s). |

This assumes daily focused work — if you're doing this solo alongside other things, the realistic fallback is **cutting to 2–3 restaurants and the bare order flow** (menu, cart, checkout, dashboard) and pushing branding polish/super admin to week 2.

---

## 5. Division of labor — what I can do vs. what only you can do

**I can do:**
- Write the entire codebase (schema, API routes, pages, components)
- Set up the theme engine, cart/checkout logic, dashboard, admin panel
- Write deployment configuration and step-by-step deploy instructions
- Debug issues you paste back to me

**Only you can do (I have no ability to act on these from this chat):**
- Create and pay for the Vercel / Neon-Supabase / domain accounts
- Set environment variables and API keys in those dashboards
- Click "Deploy" and point the domain's DNS
- Test the live site on real phones on a real network
- Anything requiring your business identity: GST/invoicing setup, a payment gateway KYC application, or terms of service / refund policy text (I can draft these, but you're the one who has to stand behind them legally)

---

## 6. Post-launch roadmap (after Sep 14)

**Week 2–3:** Razorpay/Stripe integration once your merchant account is approved; self-serve restaurant signup (turning the onboarding wizard from the demo into the real thing); email/WhatsApp order notifications.

**Month 2:** Coupons, QR table ordering for dine-in, custom domains, subscription billing automation, kitchen display system.

**Month 3+:** AI-assisted menu import from photos/PDFs, delivery-zone radius pricing, analytics dashboards, staff roles/permissions.

---

## 7. If Sep 14 is truly fixed, here's the trade-off menu

Pick at most one of these to keep; the rest slide to week 2 regardless:
- **"I need a real payment gateway on day one"** → then self-serve signup and multi-restaurant onboarding slide; we launch with 1 restaurant, fully wired to real payments.
- **"I need multiple restaurants on day one"** → then payments stay UPI QR/COD manual for launch.
- **"I need the public self-serve onboarding wizard live"** → then menu management/branding depth gets simplified; restaurants launch with a starter template instead of a fully custom brand.

---

## Next step

Tell me which of these is true, and I'll start writing the real codebase today:
1. Confirm the v1 scope in §2 is right, **or** tell me which trade-off from §7 you want instead.
2. Confirm the tech stack in §3 is OK (or if you already have hosting/DB preferences).
3. Tell me how many real restaurants need to be live on the 14th.
