"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { updateTenantBranding, setTenantCustomDomain, DomainTakenError } from "@/lib/data/tenants";
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
  const googleReviewUrl = String(formData.get("googleReviewUrl") ?? "").trim();
  const googleRatingRaw = String(formData.get("googleRating") ?? "").trim();
  const googleReviewCountRaw = String(formData.get("googleReviewCount") ?? "").trim();
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
  const facebookUrl = String(formData.get("facebookUrl") ?? "").trim();

  if (!name) return { error: "Restaurant name is required.", success: false };

  const googleRating = googleRatingRaw ? Number(googleRatingRaw) : null;
  if (googleRating !== null && (!Number.isFinite(googleRating) || googleRating < 0 || googleRating > 5)) {
    return { error: "Google rating must be a number between 0 and 5.", success: false };
  }
  const googleReviewCount = googleReviewCountRaw ? Number(googleReviewCountRaw) : null;
  if (googleReviewCount !== null && (!Number.isInteger(googleReviewCount) || googleReviewCount < 0)) {
    return { error: "Google review count must be a whole number.", success: false };
  }

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
    googleReviewUrl: googleReviewUrl || null,
    googleRating,
    googleReviewCount,
    instagramUrl: instagramUrl || null,
    facebookUrl: facebookUrl || null,
    ...(logoUrl ? { logoUrl } : {}),
  });

  revalidatePath("/dashboard/branding");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export type CustomDomainState = { error: string | null; success: boolean };

/**
 * Separate from updateBrandingAction: a domain can fail with its own
 * distinct error (already connected to another restaurant) and isn't a
 * branding concern really, just filed on the same page for now.
 */
export async function setCustomDomainAction(
  _prev: CustomDomainState,
  formData: FormData,
): Promise<CustomDomainState> {
  const session = await requireOwnerSession();
  const raw = String(formData.get("customDomain") ?? "").trim();

  try {
    await setTenantCustomDomain(session.tenantId, raw || null);
  } catch (err) {
    if (err instanceof DomainTakenError) return { error: err.message, success: false };
    return {
      error: err instanceof Error ? err.message : "Could not save that domain.",
      success: false,
    };
  }

  revalidatePath("/dashboard/branding");
  return { error: null, success: true };
}
