"use server";

import { getTenantBySlug } from "@/lib/data/tenants";
import { spinForPrize, type SpinResult } from "@/lib/data/christmas";
import { tenantHasFeature } from "@/lib/plans";

export type ClientSpinResult =
  | { ok: true; code: string; discountType: "PERCENT" | "FIXED"; discountValue: number }
  | { ok: false; error: string };

/**
 * The real pick-and-award for the Christmas Spin & Win game
 * (src/components/storefront/christmas/spin-and-win-modal.tsx). Re-checks
 * the feature flag independently of the page/layout gate — same "page gate
 * + action gate" defense-in-depth pattern createCouponAction already uses —
 * so a direct call against a flag-off tenant is refused regardless of
 * whether the UI that would normally call this ever rendered.
 */
export async function spinAction(
  slug: string,
  deviceId: string,
  phone: string | null,
): Promise<ClientSpinResult> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status === "SUSPENDED") return { ok: false, error: "Restaurant not found." };
  if (!tenantHasFeature(tenant, "christmasCampaign")) {
    return { ok: false, error: "This isn't available right now." };
  }
  if (!deviceId.trim()) return { ok: false, error: "Could not verify your device. Please reload and try again." };

  const result: SpinResult = await spinForPrize(tenant.id, deviceId.trim(), phone?.trim() || null);

  if (!result.ok) {
    if (result.reason === "already_spun") {
      return { ok: false, error: "You've already used your spin on this device. Enjoy your visit!" };
    }
    return { ok: false, error: "Spin & Win isn't set up yet — check back soon!" };
  }

  return { ok: true, code: result.code, discountType: result.discountType, discountValue: result.discountValue };
}
