import { NextResponse, type NextRequest } from "next/server";
import { stopTrialFollowUps, verifyTrialUnsubscribeToken } from "@/lib/data/trial-followups";

/**
 * One-click opt-out linked from every trial follow-up email. The token is a
 * signed JWT carrying only the tenant id (see createTrialUnsubscribeToken),
 * so it can't be guessed or forged for another restaurant. Only stops these
 * marketing-style follow-ups — order/billing/support emails are unaffected.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const tenantId = await verifyTrialUnsubscribeToken(token);

  const page = (title: string, message: string, status: number) =>
    new NextResponse(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f9fafb;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="max-width:420px;margin:16px;padding:28px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;text-align:center">
<h1 style="font-size:20px;margin:0 0 10px;color:#111827">${title}</h1><p style="color:#4b5563;margin:0">${message}</p></div></body></html>`,
      { status, headers: { "content-type": "text/html; charset=utf-8" } },
    );

  if (!tenantId) return page("Link not valid", "This unsubscribe link is invalid or has been altered.", 400);
  await stopTrialFollowUps(tenantId);
  return page(
    "You're unsubscribed",
    "We won't send you any more trial follow-up emails. Your account and orders are not affected.",
    200,
  );
}
