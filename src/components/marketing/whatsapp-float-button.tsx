import { WhatsAppIcon } from "@/components/marketing/whatsapp-icon";
import { WHATSAPP_URL } from "@/lib/contact";

/**
 * A fixed, always-reachable WhatsApp chat button — the common floating
 * bottom-right pattern most sites use — replacing the plain text link that
 * used to live only in the header (see marketing-topbar.tsx). No client
 * state needed; it's a plain anchor pinned with fixed positioning.
 */
export function WhatsAppFloatButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-black/20 transition-transform hover:scale-105"
      style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <WhatsAppIcon className="flex h-14 w-14 items-center justify-center rounded-full" />
    </a>
  );
}
