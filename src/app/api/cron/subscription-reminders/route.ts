import { NextResponse, type NextRequest } from "next/server";
import {
  getTenantsNeedingRenewalReminder,
  getOwnerEmail,
  markRenewalReminderSent,
} from "@/lib/data/tenants";
import { sendSubscriptionRenewalReminderEmail } from "@/lib/notifications/email";

/**
 * Vercel Cron target (see vercel.json's "crons" entry) — runs once a day.
 * Requires CRON_SECRET to be set and to match the Authorization header
 * Vercel Cron sends automatically ("Bearer <CRON_SECRET>"); without it, this
 * route refuses every request rather than allowing unauthenticated
 * triggering — same "dormant until configured" pattern as every other
 * integration in this codebase (Razorpay, Resend/SMTP, Anthropic, etc.).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await getTenantsNeedingRenewalReminder();
  const billingUrl = `${request.nextUrl.origin}/dashboard/billing`;

  let sent = 0;
  for (const tenant of tenants) {
    if (!tenant.paidUntil) continue;
    const ownerEmail = await getOwnerEmail(tenant.id);
    if (ownerEmail) {
      await sendSubscriptionRenewalReminderEmail(
        ownerEmail,
        tenant.name,
        tenant.planTier,
        tenant.paidUntil,
        Boolean(tenant.welcomeCouponRedeemedAt),
        billingUrl,
      );
      sent++;
    }
    // Marked even without an owner email on file, so a tenant that can never
    // receive this doesn't get re-checked (and log noise) every single day.
    await markRenewalReminderSent(tenant.id);
  }

  return NextResponse.json({ ok: true, checked: tenants.length, sent });
}
