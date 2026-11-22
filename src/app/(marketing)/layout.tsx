import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { WhatsAppFloatButton } from "@/components/marketing/whatsapp-float-button";
import { WebMcpTools } from "@/components/marketing/webmcp-tools";
import { getContact, getOverview, getPricing, searchFaq, PUBLIC_PAGES } from "@/lib/agent-info";

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
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <main id="main-content" className="flex-1">
        {children}
      </main>
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
