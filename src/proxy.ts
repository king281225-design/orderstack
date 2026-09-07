import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getTenantByCustomDomain } from "@/lib/data/tenants";

const COOKIE_NAME = "os_session";

// Paths a custom domain should never be rewritten for — real top-level app
// routes, not something to prefix with /r/<slug>.
const RESERVED_PREFIXES = ["/r/", "/dashboard", "/super-admin", "/api", "/login", "/signup"];

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
