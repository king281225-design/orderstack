import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { WhatsAppFloatButton } from "@/components/marketing/whatsapp-float-button";

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
      <div className="flex-1">{children}</div>
      <MarketingFooter />
      <WhatsAppFloatButton />
    </div>
  );
}
