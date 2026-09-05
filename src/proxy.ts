import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";

const COOKIE_NAME = "os_session";

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/super-admin/:path*"],
};
