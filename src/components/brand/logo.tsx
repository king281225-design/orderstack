import Image from "next/image";

/**
 * The BhojSetu platform mark — used on the home page, login/signup/password
 * pages, and super-admin header. Deliberately separate from a tenant's own
 * uploaded logo (Tenant.logoUrl, shown on that tenant's storefront/
 * dashboard) — this is the platform's own identity.
 *
 * Real logo files supplied by the user (2026-09-15), replacing the earlier
 * placeholder SVG bridge mark:
 * - public/brand/site-logo.png — the horizontal lockup (mark + wordmark +
 *   "SCAN · ORDER · ENJOY · TOGETHER"), used wherever the logo appears
 *   inline in a header/card (BhojSetuLogo below).
 * - public/brand/front-page-logo.png — the fuller stacked lockup (mark +
 *   wordmark + tagline + feature row), reserved for the landing page hero
 *   specifically (BhojSetuFrontPageLogo below) — a different, bolder
 *   composition meant to stand alone at a larger size.
 * Source aspect ratios: site-logo.png is 2172x724 (~3:1), front-page-logo.png
 * is 1254x1254 (1:1) — both intrinsic sizes are declared below so Next can
 * reserve layout space and serve an optimized/resized asset instead of the
 * full-resolution source on every page.
 */
export function BhojSetuLogo({
  height = 32,
  className = "",
  priority = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/site-logo.png"
      alt="BhojSetu"
      width={2172}
      height={724}
      priority={priority}
      style={{ height, width: "auto" }}
      className={className}
    />
  );
}

export function BhojSetuFrontPageLogo({
  width = 320,
  className = "",
}: {
  width?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/front-page-logo.png"
      alt="BhojSetu — good food brings people together"
      width={1254}
      height={1254}
      priority
      style={{ width, height: "auto" }}
      className={className}
    />
  );
}
