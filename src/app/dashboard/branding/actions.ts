"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { updateTenantBranding } from "@/lib/data/tenants";
import { saveUpload } from "@/lib/storage";

export type BrandingState = { error: string | null; success: boolean };

export async function updateBrandingAction(
  _prev: BrandingState,
  formData: FormData,
): Promise<BrandingState> {
  const session = await requireOwnerSession();

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const colorPrimary = String(formData.get("colorPrimary") ?? "#111827");
  const colorSecondary = String(formData.get("colorSecondary") ?? "#f97316");
  const colorAccent = String(formData.get("colorAccent") ?? "#ffffff");
  const upiId = String(formData.get("upiId") ?? "").trim();
  const logo = formData.get("logo");

  if (!name) return { error: "Restaurant name is required.", success: false };

  let logoUrl: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    logoUrl = await saveUpload(logo, "logos");
  }

  await updateTenantBranding(session.tenantId, {
    name,
    tagline: tagline || null,
    colorPrimary,
    colorSecondary,
    colorAccent,
    upiId: upiId || null,
    ...(logoUrl ? { logoUrl } : {}),
  });

  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}
