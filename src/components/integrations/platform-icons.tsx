import Image from "next/image";

/**
 * Real brand marks for the delivery-platform integration cards on
 * /dashboard/integrations — unlike the storefront's own social icons
 * (src/components/storefront/social-icons.tsx, hand-drawn to avoid
 * reproducing those platforms' exact artwork), showing a restaurant owner
 * the actual, recognizable Zomato/Swiggy icon here is the norm for an
 * integration settings page (same as Petpooja/Posist/UrbanPiper's own
 * dashboards) — these are each platform's real app icon, used only to
 * identify the service this app connects to, not re-colored or altered.
 * Source: Wikimedia Commons (Zomato_logo.png) and English Wikipedia
 * (Swiggy_Logo.svg, cropped to its icon mark) — see public/brand-logos/.
 */

export function ZomatoIcon({ className }: { className?: string }) {
  return (
    <span className={className} style={{ overflow: "hidden" }}>
      <Image src="/brand-logos/zomato.png" alt="Zomato" width={44} height={44} className="h-full w-full object-cover" />
    </span>
  );
}

export function SwiggyIcon({ className }: { className?: string }) {
  return (
    <span className={className} style={{ overflow: "hidden" }}>
      <Image src="/brand-logos/swiggy-icon.svg" alt="Swiggy" width={44} height={44} className="h-full w-full object-cover" />
    </span>
  );
}
