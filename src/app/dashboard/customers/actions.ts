"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { listInactiveCustomers } from "@/lib/data/customers";
import { createCoupon, CouponCodeTakenError } from "@/lib/data/coupons";
import { tierHasFeature } from "@/lib/plans";
import { buildTenantWhatsAppUrl } from "@/lib/contact";
import { sendWinBackWhatsApp } from "@/lib/notifications/whatsapp";
import { formatINR } from "@/lib/money";
import type { DiscountType } from "@prisma/client";

export type WinBackResult =
  | { ok: true; couponCode: string; waLink: string }
  | { ok: false; error: string };

export type WinBackOfferInput = {
  discountType: DiscountType;
  /** PERCENT: 1-100. FIXED: cents off (converted from the ₹ the owner typed, same as createCouponAction). */
  discountValue: number;
  expiryDays: number;
  /** Minimum order total (in cents) the discount requires — e.g. "20% off orders above ₹299." 0 = no minimum. Same field/enforcement as a regular Coupon's minOrderCents (src/lib/data/coupons.ts validateCoupon). */
  minOrderCents: number;
  /** Owner-typed coupon code (same free-text field the regular Coupons page uses — see add-coupon-form.tsx). Blank = auto-generate a WINBACK-XXXXX code, same as before. */
  customCode?: string;
};

const MAX_EXPIRY_DAYS = 90;

/**
 * Generates a one-time win-back coupon (reusing the existing Coupon system —
 * not a new discount mechanism) for one inactive customer and returns a
 * prefilled wa.me link to that customer's own phone (Tier A, zero
 * credentials). The discount — and now the coupon code itself — is set by
 * the owner per campaign — see WinBackPanel's percent/₹ toggle, value,
 * validity-days, minimum-order, and code fields — not hardcoded. A blank
 * code auto-generates WINBACK-XXXXX, same as before. If a real WhatsApp
 * Business API is configured
 * (src/lib/notifications/whatsapp.ts), also fires an automatic send — the
 * owner can still use the link as a fallback either way. Owner-triggered only
 * — there's no cron job here, matching this codebase's standing "explicit
 * action, not invisible automation" rule for anything that spends money or
 * contacts a customer. Redeemable once (maxRedemptions: 1) — this is a
 * personalized recovery code for one specific customer, not a general public
 * coupon, so that part isn't exposed as a setting.
 */
export async function sendWinBackOfferAction(customerPhone: string, offer: WinBackOfferInput): Promise<WinBackResult> {
  const session = await requireOwnerSession();

  // Defense in depth alongside the page-level gate — a direct action call
  // from a non-Advanced session must not be able to create coupon/WhatsApp
  // activity the dashboard itself won't show, same pattern as
  // createCouponAction/createStaffAction.
  const tenant = await getTenantById(session.tenantId);
  if (!tenant || !tierHasFeature(tenant.planTier, "loyalty")) {
    return { ok: false, error: "Loyalty & win-back offers aren't included on your current plan." };
  }

  const phone = customerPhone.trim();
  if (!phone) return { ok: false, error: "This customer has no phone number on file." };

  if (!offer.discountValue || offer.discountValue <= 0) {
    return { ok: false, error: "Enter a valid discount value." };
  }
  if (offer.discountType === "PERCENT" && offer.discountValue > 100) {
    return { ok: false, error: "A percent discount can't exceed 100." };
  }
  if (!Number.isFinite(offer.expiryDays) || offer.expiryDays < 1 || offer.expiryDays > MAX_EXPIRY_DAYS) {
    return { ok: false, error: `Validity must be between 1 and ${MAX_EXPIRY_DAYS} days.` };
  }
  const minOrderCents = Number.isFinite(offer.minOrderCents) && offer.minOrderCents > 0 ? Math.round(offer.minOrderCents) : 0;

  const typedCode = offer.customCode?.trim().toUpperCase();
  if (typedCode && !/^[A-Z0-9-]{3,40}$/.test(typedCode)) {
    return { ok: false, error: "Coupon code can only use letters, numbers, and hyphens (3-40 characters)." };
  }
  const code = typedCode || `WINBACK-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + offer.expiryDays * 86_400_000);

  try {
    await createCoupon(session.tenantId, {
      code,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      minOrderCents,
      maxRedemptions: 1,
      expiresAt,
    });
  } catch (err) {
    if (err instanceof CouponCodeTakenError) {
      return { ok: false, error: "That code is already in use — try again." };
    }
    return { ok: false, error: "Could not create the win-back coupon." };
  }

  const discountSummary = offer.discountType === "PERCENT" ? `${offer.discountValue}% off` : `${formatINR(offer.discountValue)} off`;
  const minOrderSummary = minOrderCents > 0 ? ` on orders above ${formatINR(minOrderCents)}` : "";
  const message = `We miss you at ${tenant.name}! Here's ${discountSummary}${minOrderSummary} on your next order — use code ${code} at checkout (valid ${offer.expiryDays} days).`;
  const waLink = buildTenantWhatsAppUrl(phone, message);

  // Fire-and-forget automatic send (Tier B) — does nothing until real
  // WhatsApp credentials exist; the wa.me link above works either way.
  void sendWinBackWhatsApp(phone, tenant.name, code, discountSummary);

  revalidatePath("/dashboard/coupons");
  return { ok: true, couponCode: code, waLink };
}

/** Owner-only, Advanced+ — customers who haven't ordered in `sinceDays` days. */
export async function listWinBackCandidatesAction(sinceDays: number) {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant || !tierHasFeature(tenant.planTier, "loyalty")) return [];
  return listInactiveCustomers(session.tenantId, sinceDays);
}
