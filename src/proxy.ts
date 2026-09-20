import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getTenantByCustomDomain, getTenantTrialStatus } from "@/lib/data/tenants";
import { isSessionStillActive } from "@/lib/data/sessions";
import { TRIAL_MS } from "@/lib/plans";

const COOKIE_NAME = "os_session";

// One-time dashboard trial: an owner/staff account gets 7 days of
// dashboard access (wall-clock time since the tenant was created — see
// getTenantTrialStatus's comment) before being forced to /dashboard/billing
// to actually subscribe. Applies to owners/staff only — the public
// storefront (/r/<slug>, a restaurant's own customers) is never gated by
// this. Restaurants the platform's own subscriptionStatus already marks
// ACTIVE (i.e. genuinely paid, by any tier) are exempt for as long as that
// stays true.
const BILLING_PATH = "/dashboard/billing";

// Paths a custom domain should never be rewritten for — real top-level app
// routes, not something to prefix with /r/<slug>.
const RESERVED_PREFIXES = [
  "/r/",
  "/dashboard",
  "/super-admin",
  "/api",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/refund",
];

// Edge-level gate on the two authenticated areas. This is defense in depth —
// every dashboard/super-admin page and server action also re-checks the
// session itself (see requireRole / requireTenantSession in lib/auth.ts),
// since the proxy alone is not a substitute for per-request authorization.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  const isDashboard = pathname.startsWith("/dashboard");
  const isSuperAdmin = pathname.startsWith("/super-admin");

  if (isDashboard && (!session || (session.role !== "OWNER" && session.role !== "STAFF"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Single-device-login enforcement (Starter/Advanced tenants — see
  // src/lib/data/sessions.ts; Business tenants are exempt). Checked before
  // the trial gate and on every dashboard path including /dashboard/billing
  // itself, since a superseded session shouldn't be able to reach anything,
  // not even to pay. Clears the now-invalid cookie so the redirect doesn't
  // loop back here.
  // A super-admin managing a restaurant (session.impersonatorId) is exempt from both this and the
  // trial gate below — they're supporting the tenant, not using its plan — and their own sid is
  // not the tenant owner's, so the device check would wrongly log them out.
  if (isDashboard && session && !session.impersonatorId && (session.role === "OWNER" || session.role === "STAFF") && session.tenantId) {
    const stillActive = await isSessionStillActive(session.sub, session.sid, session.tenantId);
    if (!stillActive) {
      const response = NextResponse.redirect(new URL("/login?loggedOutElsewhere=1", request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  // Trial gate — only once we know it's a real owner/staff session, and
  // never on /dashboard/billing itself (that's the one page a
  // trial-expired tenant must still be able to reach, to actually pay).
  if (isDashboard && session && !session.impersonatorId && (session.role === "OWNER" || session.role === "STAFF") && session.tenantId) {
    if (pathname !== BILLING_PATH && !pathname.startsWith(`${BILLING_PATH}/`)) {
      const tenant = await getTenantTrialStatus(session.tenantId);
      if (
        tenant &&
        tenant.subscriptionStatus !== "ACTIVE" &&
        Date.now() - tenant.createdAt.getTime() > TRIAL_MS
      ) {
        return NextResponse.redirect(new URL(`${BILLING_PATH}?trialExpired=1`, request.url));
      }
    }
  }

  if (isSuperAdmin && (!session || session.role !== "SUPER_ADMIN")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Custom domains (src/lib/data/tenants.ts, set from /dashboard/branding):
  // if the Host header matches a tenant's customDomain, transparently serve
  // that tenant's storefront at the domain's root instead of requiring
  // /r/<slug> in the URL. Real, testable right now via the Host header
  // alone (no DNS needed to verify this part) — but the domain only
  // actually resolves for real visitors once this app is deployed to a
  // public host and the owner's DNS points a CNAME/A record at it.
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const isReservedPath = RESERVED_PREFIXES.some((p) => pathname.startsWith(p));
  if (host && host !== "localhost" && host !== "127.0.0.1" && !isReservedPath) {
    const tenant = await getTenantByCustomDomain(host);
    if (tenant && tenant.status !== "SUSPENDED") {
      const url = request.nextUrl.clone();
      url.pathname = `/r/${tenant.slug}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Broadened from just /dashboard and /super-admin so the custom-domain
  // rewrite above can run on every real page request too — excludes static
  // assets/image-optimization/metadata files per Next's own recommended
  // negative-match pattern, since those never need auth or domain rewriting.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
