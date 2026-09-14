import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/notifications/email";

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Looks up the user by email, creates a reset token, and emails it — but
 * ALWAYS resolves the same way regardless of whether the email matched a
 * real account (standard practice to avoid leaking which emails have
 * accounts). Callers must show a generic "if that email exists…" message,
 * never branch on this function's return value.
 *
 * Real limitation, same "dormant until a key is set" pattern as the rest of
 * this codebase's email/payment integrations: without RESEND_API_KEY set,
 * sendPasswordResetEmail silently no-ops (see src/lib/notifications/email.ts)
 * — the token is still created, but nothing is actually delivered. Unlike
 * order-confirmation emails (a nice-to-have on top of an order that already
 * exists), this makes the whole forgot-password flow non-functional until a
 * real Resend key exists, since email is the only delivery channel here.
 */
export async function requestPasswordReset(
  email: string,
  resetUrlBase: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return;

  // Invalidate any earlier outstanding tokens for this user so only the
  // newest reset link works — an old, still-unexpired link mailed a few
  // minutes ago shouldn't remain valid alongside a fresh one.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${resetUrlBase}?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export type ResetTokenCheck =
  | { valid: true }
  | { valid: false; reason: "invalid" | "expired" | "used" };

/** Read-only check, used by the reset-password page to decide whether to show the form at all. */
export async function checkPasswordResetToken(rawToken: string): Promise<ResetTokenCheck> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!record) return { valid: false, reason: "invalid" };
  if (record.usedAt) return { valid: false, reason: "used" };
  if (record.expiresAt < new Date()) return { valid: false, reason: "expired" };
  return { valid: true };
}

/** Re-validates the token from scratch (never trusts the page-load check above) before actually changing anything. */
export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!record) return { ok: false, error: "This reset link is invalid." };
  if (record.usedAt) return { ok: false, error: "This reset link has already been used." };
  if (record.expiresAt < new Date()) {
    return { ok: false, error: "This reset link has expired. Request a new one." };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return { ok: true };
}
