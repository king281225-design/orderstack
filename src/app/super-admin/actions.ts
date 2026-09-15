"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  createTenantWithOwner,
  setTenantStatus,
  setTenantPlan,
  setTenantSubscriptionOverride,
} from "@/lib/data/tenants";
import type { PlanTier } from "@prisma/client";

export type CreateRestaurantState = { error: string | null; success: boolean };
const initialOk: CreateRestaurantState = { error: null, success: false };

export async function createRestaurantAction(
  _prev: CreateRestaurantState,
  formData: FormData,
): Promise<CreateRestaurantState> {
  await requireRole("SUPER_ADMIN");

  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "")
    .trim()
    .toLowerCase();
  const ownerPassword = String(formData.get("ownerPassword") ?? "");

  if (!slug || !name || !ownerEmail || !ownerPassword) {
    return { error: "All fields are required.", success: false };
  }
  if (ownerPassword.length < 8) {
    return { error: "Owner password must be at least 8 characters.", success: false };
  }

  try {
    await createTenantWithOwner({ slug, name, ownerEmail, ownerPassword });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create restaurant.", success: false };
  }

  revalidatePath("/super-admin");
  return { ...initialOk, success: true };
}

export async function setTenantStatusAction(tenantId: string, status: "ACTIVE" | "SUSPENDED") {
  await requireRole("SUPER_ADMIN");
  await setTenantStatus(tenantId, status);
  revalidatePath("/super-admin");
}

/** Manual plan assignment — see the PlanTier comment in schema.prisma. */
export async function setTenantPlanAction(tenantId: string, planTier: PlanTier) {
  await requireRole("SUPER_ADMIN");
  await setTenantPlan(tenantId, planTier);
  revalidatePath("/super-admin");
}

/** Manual trial-gate override — see setTenantSubscriptionOverride's own comment. */
export async function setTenantSubscriptionOverrideAction(tenantId: string, active: boolean) {
  await requireRole("SUPER_ADMIN");
  await setTenantSubscriptionOverride(tenantId, active);
  revalidatePath("/super-admin");
}
