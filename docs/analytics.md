# Analytics (GA4)

GA4 property "bhojsetu.in" (measurement ID `G-5GR56VBJMS`, overridable via
`NEXT_PUBLIC_GA_MEASUREMENT_ID`). Loaded sitewide via
`src/components/analytics/google-analytics.tsx` (plain `gtag.js`, not GTM).

## Page views

Automatic GA4 page views are disabled (`send_page_view: false`) because this
is a client-side-routed Next.js app — the automatic page_view only fires once,
on the GA script's own initial load, and would never fire again on a soft
(client-side) navigation.

`AnalyticsPageviewTracker` (`src/components/analytics/analytics-pageview-tracker.tsx`)
fires a manual `page_view` event on every route change instead (initial load
+ every client-side navigation), with `page_path`, `page_location`, and
`page_title`. It's mounted once, sitewide, in `src/app/layout.tsx`.

## Custom events

All custom events go through `trackEvent()` (`src/lib/analytics/track-event.ts`).
Most are wired declaratively — any element with a `data-ga-event="<name>"`
attribute (optionally `data-ga-params='{"location":"hero"}'`, a JSON string)
is tracked by one delegated `click` listener (`AnalyticsClickDelegate`),
mounted sitewide, so most Server Components didn't need to become Client
Components just to fire an event. A few events fire programmatically instead
(view-based, or needing a dynamic value) — noted below.

| Event | Fires when | Params | How |
|---|---|---|---|
| `trial_cta_click` | Any "Start your 7-day free trial" button | `location` (`hero`/`pricing`), `plan` (pricing cards only) | `data-ga-event` |
| `whatsapp_demo_click` | Any WhatsApp demo link/button | `location` (`hero`/`footer`/`float_button`) | `data-ga-event` |
| `phone_click` | The footer's `tel:` link | — | `data-ga-event` |
| `demo_view` | `/r/bhojsetu-demo-2` (the live demo storefront) loads | — | `DemoViewPing`, mounted only on that one slug |
| `pricing_view` | The pricing section scrolls into view, once per page load | — | `IntersectionObserver` in `PublicPricingTable` |
| `pricing_toggle` | The monthly/annual pricing toggle | `billing_period` (`MONTHLY`/`ANNUAL`) | direct `onClick` (already a Client Component) |
| `login_click` | The hero's "Sign in" link | — | `data-ga-event` |
| `signup_complete` | Right after a real account is created | — | `SignupWelcomePing`, mounted on `/dashboard/menu`, triggered by a one-shot `?welcome=1` redirect param (the signup server action has no client-visible "thank you" page to fire from) — strips the param immediately after firing |
| `faq_open` | A FAQ question is expanded (not on collapse) | `question_index` | direct `onClick` in `FaqAccordion` (already a Client Component) |

No event ever includes personal data (names, phone numbers, email
addresses) in its params.

## Internal / bot traffic

Two independent signals mark traffic as internal (`src/lib/analytics/internal-traffic.ts`):

1. **A route under `/dashboard` or `/super-admin`.** The session itself is an
   httpOnly JWT cookie (`src/lib/auth.ts`), unreadable from client JS, so
   route is the only client-feasible "is this the owner using their own app"
   signal available. Marketing conversion events (`trial_cta_click`, etc.)
   never fire on these routes at all (`trackEvent` returns early) — they
   don't render there anyway, but it's an explicit second guard. Page views
   on these routes still fire, tagged `traffic_type: "internal"`.
2. **The `bhojsetu_internal` cookie**, for the owner's own devices when
   browsing the *public* site (so e.g. previewing your own storefront or
   pricing page doesn't count as a real visitor). Set it once per device:

   - Visit `https://bhojsetu.in/?internal=1` to mark this browser as
     internal for a year.
   - Visit `https://bhojsetu.in/?internal=0` to clear it.

   The query param is stripped from the URL immediately after it's read, so
   it never lingers or gets accidentally shared in a copied link.

   This is a plain, non-httpOnly, analytics-only cookie — it has nothing to
   do with the real session cookie and grants no access to anything.

Either signal adds `traffic_type: "internal"` to the event/page view, rather
than dropping it outright — so GA4's own **Internal Traffic** data filter
(GA4 Admin → Data settings → Data filters) can be set up to exclude anything
carrying that parameter. See CLAUDE.md's "MANUAL STEPS FOR OWNER" checklist
for setting that filter up and marking key events.

## Known bot traffic

The two Ashburn, VA sessions with ~2s engagement flagged in the Nov 2026
audit look like bots (no code change addresses this — see GA4 Admin → Data
streams → Configure tag settings → "List unwanted referrals", and consider a
Vercel/Hostinger firewall rule if bot visits grow).
