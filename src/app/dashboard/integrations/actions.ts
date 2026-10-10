"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { tenantHasFeature } from "@/lib/plans";
import { setDynoRestaurantLink, removeDynoRestaurantLink, DynoRestaurantIdTakenError } from "@/lib/data/dyno-connections";
import type { DeliveryPlatform } from "@prisma/client";

export type DynoConnectionState = { error: string | null; success: boolean };
const ok: DynoConnectionState = { error: null, success: true };

async function requireAggregatorAccess() {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant || !tenantHasFeature(tenant, "deliveryAggregator")) {
    throw new Error("Delivery-platform integration isn't included on your current plan.");
  }
  return session;
}

export async function saveDynoConnectionAction(
  _prev: DynoConnectionState,
  formData: FormData,
): Promise<DynoConnectionState> {
  let session;
  try {
    session = await requireAggregatorAccess();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Not authorized.", success: false };
  }

  const platform = String(formData.get("platform") ?? "") as DeliveryPlatform;
  const externalId = String(formData.get("externalId") ?? "").trim();
  if (!["ZOMATO", "SWIGGY"].includes(platform)) return { error: "Invalid platform.", success: false };
  if (!externalId) return { error: "Restaurant id is required.", success: false };

  try {
    await setDynoRestaurantLink(session.tenantId, platform, externalId);
  } catch (err) {
    if (err instanceof DynoRestaurantIdTakenError) return { error: err.message, success: false };
    return { error: "Could not save this connection.", success: false };
  }

  revalidatePath("/dashboard/integrations");
  return ok;
}

export async function disconnectDynoAction(platform: DeliveryPlatform) {
  const session = await requireOwnerSession();
  await removeDynoRestaurantLink(session.tenantId, platform);
  revalidatePath("/dashboard/integrations");
}
