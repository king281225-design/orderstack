"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import {
  updateTenantBranding,
  setTenantCustomDomain,
  updateDeliveryZone,
  DomainTakenError,
} from "@/lib/data/tenants";
import { saveUpload } from "@/lib/storage";
import { INDIA_STATES } from "@/lib/india-states";

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
  const colorHeaderText = String(formData.get("colorHeaderText") ?? "#ffffff");
  const colorCardBackground = String(formData.get("colorCardBackground") ?? "#ffffff");
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
    colorHeaderText,
    colorCardBackground,
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

export type DeliveryZoneState = { error: string | null; success: boolean };

/**
 * Radius in km + the restaurant's own lat/lng. An empty radius field clears
 * the whole feature (all three go back to null) rather than leaving stale
 * coordinates behind with no radius to pair them with.
 */
export async function updateDeliveryZoneAction(
  _prev: DeliveryZoneState,
  formData: FormData,
): Promise<DeliveryZoneState> {
  const session = await requireOwnerSession();

  const radiusRaw = String(formData.get("deliveryRadiusKm") ?? "").trim();
  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();

  if (!radiusRaw) {
    await updateDeliveryZone(session.tenantId, { latitude: null, longitude: null, deliveryRadiusKm: null });
    revalidatePath("/dashboard/branding");
    return { error: null, success: true };
  }

  const radius = Number(radiusRaw);
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(radius) || radius <= 0) {
    return { error: "Delivery radius must be a positive number of km.", success: false };
  }
  if (!latRaw || !lngRaw || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Set your restaurant's location before saving a delivery radius.", success: false };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { error: "That doesn't look like a valid latitude/longitude.", success: false };
  }

  await updateDeliveryZone(session.tenantId, { latitude: lat, longitude: lng, deliveryRadiusKm: radius });
  revalidatePath("/dashboard/branding");
  return { error: null, success: true };
}

export type BillingSettingsState = { error: string | null; success: boolean };

/**
 * GST rate + registered business details used on manually-created bills'
 * printed invoices (src/app/dashboard/orders/[id]/print) — filed alongside
 * branding/delivery-zone as one more piece of "restaurant settings," same
 * pattern as the two forms above.
 */
export async function updateBillingSettingsAction(
  _prev: BillingSettingsState,
  formData: FormData,
): Promise<BillingSettingsState> {
  const session = await requireOwnerSession();

  const gstRateRaw = String(formData.get("gstRate") ?? "").trim();
  const businessAddress = String(formData.get("businessAddress") ?? "").trim();
  const gstin = String(formData.get("gstin") ?? "").trim();
  const businessStateRaw = String(formData.get("businessState") ?? "").trim();

  let gstRate: number | null = null;
  if (gstRateRaw) {
    gstRate = Number(gstRateRaw);
    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
      return { error: "GST rate must be a number between 0 and 100.", success: false };
    }
  }

  // Only ever accept one of the fixed dropdown values — never freeform text
  // from a tampered request — so invoice-view.tsx's "is this set" check
  // stays a reliable signal.
  const businessState =
    businessStateRaw && (INDIA_STATES as readonly string[]).includes(businessStateRaw) ? businessStateRaw : null;

  await updateTenantBranding(session.tenantId, {
    gstRate,
    businessAddress: businessAddress || null,
    gstin: gstin || null,
    businessState,
  });

  revalidatePath("/dashboard/branding");
  return { error: null, success: true };
}
