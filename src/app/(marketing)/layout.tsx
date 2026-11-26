import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { WhatsAppFloatButton } from "@/components/marketing/whatsapp-float-button";
import { WebMcpTools } from "@/components/marketing/webmcp-tools";
import { getContact, getOverview, getPricing, searchFaq, PUBLIC_PAGES } from "@/lib/agent-info";
import { CHRISTMAS_THEME_ENABLED } from "@/lib/seasonal";
import { Snowfall } from "@/components/storefront/christmas/snowfall";
import { XmasSkyline } from "@/components/christmas/xmas-skyline";

// The seasonal running banner. The greeting repeats between the product
// messages and is highlighted; the product messages only claim what the
// product actually backs (the 7-day trial and the Starter plan's feature
// list in src/lib/plans.ts).
const GREETING = "🎄 Merry Christmas from BhojSetu 🎄";
const RIBBON_MESSAGES: { text: string; greeting?: boolean }[] = [
  { text: GREETING, greeting: true },
  { text: "🎁 7-day free trial · no credit card required" },
  { text: GREETING, greeting: true },
  { text: "⭐ QR table ordering, KOT, billing & inventory in one place" },
  { text: GREETING, greeting: true },
  { text: "🎅 UPI QR & cash-on-delivery checkout for your customers" },
];

/**
 * Shared chrome for the public marketing pages only (homepage + legal/info
 * pages) — a route group, so it adds no URL segment. Deliberately scoped
 * away from /login, /signup, /dashboard, /super-admin, and /r/[slug], which
 * all keep building their own independent page shells as before.
 *
 * No top bar — removed at the user's request (it only ever held the
 * business name, phone number, and a Sign in link, all of which are
 * redundant with the footer and the hero's own Sign in button).
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`flex min-h-screen flex-col ${CHRISTMAS_THEME_ENABLED ? "christmas-theme-marketing" : ""}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      {CHRISTMAS_THEME_ENABLED && (
        <>
          <Snowfall />
          <div className="xmas-top-banner overflow-hidden py-2 text-xs font-semibold tracking-wide sm:text-sm" role="marquee" aria-label="Seasonal announcement">
            {/* The track is rendered twice so the loop point is seamless; the longer message list needs a slower duration than the 22s default to keep the same reading speed. */}
            <div className="animate-marquee flex w-max gap-12 whitespace-nowrap" style={{ animationDuration: "48s" }}>
              {[...RIBBON_MESSAGES, ...RIBBON_MESSAGES].map((msg, i) => (
                <span
                  key={i}
                  aria-hidden={i >= RIBBON_MESSAGES.length}
                  className={msg.greeting ? "font-extrabold tracking-wider" : undefined}
                  style={msg.greeting ? { color: "var(--xmas-gold)" } : undefined}
                >
                  {msg.text}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {CHRISTMAS_THEME_ENABLED && <XmasSkyline />}
      <MarketingFooter />
      <WhatsAppFloatButton />
      {/* Registers read-only WebMCP tools for in-browser agents (no-op where unsupported). */}
      <WebMcpTools
        overview={getOverview()}
        pricing={getPricing()}
        contact={getContact()}
        faqs={searchFaq()}
        pages={PUBLIC_PAGES.map(({ key, title, path }) => ({ key, title, path }))}
      />
    </div>
  );
}
