import { NextResponse, type NextRequest } from "next/server";
import { runTrialFollowUps } from "@/lib/data/trial-followups";
import { SITE_URL } from "@/lib/site";

/**
 * Vercel Cron target (see vercel.json) — runs once a day. Emails restaurants
 * still on their free trial (or past it) who haven't paid, following the
 * schedule in src/lib/trial-followup.ts. Same auth rule as the other cron
 * route: refuses everything unless CRON_SECRET is set and matches the
 * Authorization header Vercel Cron sends.
 *
 * `?dry=1` reports who WOULD get which email without sending or recording
 * anything — handy for checking the schedule before/after a deploy.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dry") === "1";
  // Links in the emails must point at the real public domain, not whatever host
  // Vercel Cron happened to call — so in production use SITE_URL.
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : request.nextUrl.origin;
  const result = await runTrialFollowUps({ origin, dryRun });
  return NextResponse.json({ ok: true, dryRun, ...result });
}
