"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { createStaffAccount, deleteStaffAccount, EmailTakenError } from "@/lib/data/staff";
import { getTenantById } from "@/lib/data/tenants";
import { tierHasFeature } from "@/lib/plans";

export type StaffActionState = { error: string | null };
const ok: StaffActionState = { error: null };

export async function createStaffAction(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const session = await requireOwnerSession();

  // Defense in depth alongside the page-level gate (/dashboard/staff).
  const tenant = await getTenantById(session.tenantId);
  if (!tenant || !tierHasFeature(tenant.planTier, "staff")) {
    return { error: "Staff logins aren't included on your current plan." };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  try {
    await createStaffAccount(session.tenantId, email, password);
  } catch (err) {
    if (err instanceof EmailTakenError) return { error: err.message };
    return { error: "Could not create staff account." };
  }

  revalidatePath("/dashboard/staff");
  return ok;
}

export async function deleteStaffAction(userId: string) {
  const session = await requireOwnerSession();
  await deleteStaffAccount(session.tenantId, userId);
  revalidatePath("/dashboard/staff");
}
