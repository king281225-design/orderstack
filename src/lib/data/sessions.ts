import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Single-device-login enforcement for Starter tenants only. Advanced and
 * Business tenants are exempt — multi-device login is part of both plans
 * (Business since the 2026-09-16 pricing request; Advanced added 2026-11-17).
 * Auth itself is a stateless JWT (see src/lib/auth.ts) with no session
 * table — this is the one piece of server-side session state that exists,
 * purely to answer "has this login been superseded by a newer one
 * elsewhere?" for the tenants whose plan says that should matter.
 */

/** Called once per login (see src/app/login/actions.ts, src/app/signup/actions.ts) — overwrites whatever the previous "current" session was, so that older login's JWT will fail isSessionStillActive from this point on. */
export async function setUserActiveSession(userId: string, sessionId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { currentSessionId: sessionId } });
}

/**
 * Returns false when this login has been superseded by a newer one on
 * another device (Starter only) and the caller should treat the
 * request as logged out. Always true for Advanced and Business tenants, and true when
 * either lookup fails to resolve (fails open on a data anomaly rather than
 * locking someone out of their own account over an unrelated bug) — the
 * real security boundary here is single-device convenience, not
 * authorization, so failing open is the correct tradeoff.
 */
export async function isSessionStillActive(
  userId: string,
  sessionId: string | undefined,
  tenantId: string,
): Promise<boolean> {
  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currentSessionId: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { planTier: true } }),
  ]);
  if (!user || !tenant) return true;
  if (tenant.planTier === "BUSINESS" || tenant.planTier === "ADVANCED") return true;
  if (!sessionId) return false; // pre-existing token issued before this feature shipped
  return user.currentSessionId === sessionId;
}
