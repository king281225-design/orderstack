import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { DEMO_STOREFRONT_SLUG } from "@/lib/contact";
import {
  decideFollowUp,
  TRIAL_FOLLOW_UP_STEPS,
  type TrialFollowUpStepId,
} from "@/lib/trial-followup";
import { trialState } from "@/lib/plans";
import { getOwnerEmail } from "@/lib/data/tenants";
import { isEmailConfigured } from "@/lib/notifications/email";
import { sendTrialFollowUpEmail } from "@/lib/notifications/trial-email";

/**
 * Trial-to-paid follow-up runner, driven daily by
 * /api/cron/trial-followups. "Converted" = subscriptionStatus ACTIVE (paid,
 * or activated by the super-admin) — such tenants are never selected, so the
 * emails stop the moment a restaurant pays.
 */

function unsubKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) throw new Error("JWT_SECRET is missing or too short.");
  return new TextEncoder().encode(secret);
}

export async function createTrialUnsubscribeToken(tenantId: string): Promise<string> {
  return new SignJWT({ purpose: "trial-unsub" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(tenantId)
    .sign(unsubKey());
}

/** Returns the tenant id, or null for a bad/forged token. */
export async function verifyTrialUnsubscribeToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, unsubKey());
    if (payload.purpose !== "trial-unsub" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function stopTrialFollowUps(tenantId: string): Promise<boolean> {
  const res = await prisma.tenant.updateMany({
    where: { id: tenantId, trialFollowUpsStoppedAt: null },
    data: { trialFollowUpsStoppedAt: new Date() },
  });
  return res.count > 0;
}

export type FollowUpRunResult = {
  checked: number;
  sent: number;
  skipped: number;
  /** Populated on dry runs (and always cheap to return): what went / would go to whom. */
  details: { tenant: string; email: string | null; step: TrialFollowUpStepId }[];
};

export async function runTrialFollowUps(opts: {
  origin: string;
  dryRun?: boolean;
  now?: Date;
}): Promise<FollowUpRunResult> {
  const now = opts.now ?? new Date();
  // Dormant (touches nothing) until SMTP/Resend credentials exist, so the
  // sequence can't be consumed without ever reaching an inbox.
  if (!opts.dryRun && !isEmailConfigured()) {
    return { checked: 0, sent: 0, skipped: 0, details: [] };
  }
  const candidates = await prisma.tenant.findMany({
    where: {
      status: "ACTIVE",
      subscriptionStatus: { not: "ACTIVE" },
      trialFollowUpsStoppedAt: null,
      trialFollowUpStep: { lt: TRIAL_FOLLOW_UP_STEPS.length },
      slug: { not: DEMO_STOREFRONT_SLUG },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      trialDays: true,
      trialFollowUpStep: true,
      welcomeCouponRedeemedAt: true,
    },
  });

  const result: FollowUpRunResult = { checked: candidates.length, sent: 0, skipped: 0, details: [] };

  for (const t of candidates) {
    const decision = decideFollowUp(t.createdAt, t.trialDays, t.trialFollowUpStep, now);
    if (decision.action === "none") continue;

    if (decision.action === "skip") {
      result.skipped++;
      if (!opts.dryRun) {
        await prisma.tenant.update({ where: { id: t.id }, data: { trialFollowUpStep: decision.toStep } });
      }
      continue;
    }

    const step = TRIAL_FOLLOW_UP_STEPS[decision.stepIndex];
    const ownerEmail = await getOwnerEmail(t.id);
    result.details.push({ tenant: t.name, email: ownerEmail, step: step.id });
    if (opts.dryRun) continue;

    if (ownerEmail) {
      // Only advance the tenant's step on a confirmed send — a failed/unconfigured
      // send is retried on the next run instead of silently burning a step.
      const [menuItemCount, orderCount, token] = await Promise.all([
        prisma.item.count({ where: { tenantId: t.id } }),
        prisma.order.count({ where: { tenantId: t.id } }),
        createTrialUnsubscribeToken(t.id),
      ]);
      const state = trialState(t.createdAt, "NONE", now.getTime(), t.trialDays);
      const ok = await sendTrialFollowUpEmail({
        to: ownerEmail,
        step: step.id,
        restaurantName: t.name,
        slug: t.slug,
        origin: opts.origin,
        menuItemCount,
        orderCount,
        trialDaysLeft: state.kind === "trial" ? state.daysLeft : 0,
        welcomeOfferAvailable: !t.welcomeCouponRedeemedAt,
        unsubscribeUrl: `${opts.origin}/api/trial-unsubscribe?t=${encodeURIComponent(token)}`,
      });
      if (!ok) continue;
      result.sent++;
    }
    // A tenant with no owner email on file also advances, so it isn't re-evaluated daily forever.
    await prisma.tenant.update({
      where: { id: t.id },
      data: { trialFollowUpStep: decision.stepIndex + 1, trialFollowUpSentAt: now },
    });
  }

  return result;
}
