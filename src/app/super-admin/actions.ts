"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, getSession, createSession, generateSessionId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createTenantWithOwner,
  setTenantStatus,
  setTenantPlan,
  setTenantSubscriptionOverride,
  setTenantBilling,
  deleteTenants,
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

// Where "Manage" may land — bound arguments are client-visible, so never redirect to a raw value.
const MANAGE_LANDING_PATHS = ["/dashboard", "/dashboard/menu", "/dashboard/branding"];

/**
 * "Manage this restaurant": swaps the super-admin's session for an owner-level
 * one on the chosen tenant (see SessionPayload.impersonatorId), so every real
 * dashboard page and server action — menu, orders, branding, staff, coupons —
 * works exactly as it does for the owner, with the same tenant scoping. Works
 * on suspended tenants too, so problems can be fixed before reactivating.
 */
export async function startManagingTenantAction(tenantId: string, landing: string = "/dashboard") {
  const session = await requireRole("SUPER_ADMIN");
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, slug: true } });
  if (!tenant) throw new Error("Restaurant not found.");
  const target = MANAGE_LANDING_PATHS.includes(landing) ? landing : "/dashboard";

  console.info(`[super-admin] ${session.email} started managing tenant ${tenant.slug} (${tenant.id})`);
  await createSession({
    sub: session.sub,
    role: "OWNER",
    tenantId: tenant.id,
    email: session.email,
    sid: generateSessionId(),
    impersonatorId: session.sub,
  });
  redirect(target);
}

/** Turns a "managing a restaurant" session back into the super-admin's own. */
export async function stopManagingTenantAction() {
  const session = await getSession();
  if (!session?.impersonatorId) redirect("/login");
  // Re-check against the database rather than trusting the claim alone.
  const admin = await prisma.user.findUnique({ where: { id: session.impersonatorId } });
  if (!admin || admin.role !== "SUPER_ADMIN") redirect("/login");

  console.info(`[super-admin] ${admin.email} stopped managing tenant ${session.tenantId}`);
  await createSession({
    sub: admin.id,
    role: "SUPER_ADMIN",
    tenantId: null,
    email: admin.email,
    sid: generateSessionId(),
  });
  redirect("/super-admin");
}

const BILLING_PERIODS = ["MONTHLY", "ANNUAL"] as const;

/** Inline monthly/annual dropdown on the restaurants list ("" clears it). */
export async function setTenantBillingPeriodAction(tenantId: string, period: string) {
  await requireRole("SUPER_ADMIN");
  const billingPeriod = BILLING_PERIODS.find((p) => p === period) ?? null;
  await prisma.tenant.update({ where: { id: tenantId }, data: { billingPeriod } });
  revalidatePath("/super-admin");
}

/** Detail-page billing form: period plus the date the customer has paid up to. */
export async function saveTenantBillingAction(tenantId: string, formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const rawPeriod = String(formData.get("billingPeriod") ?? "");
  const billingPeriod = BILLING_PERIODS.find((p) => p === rawPeriod) ?? null;
  const rawDate = String(formData.get("paidUntil") ?? "").trim();
  let paidUntil: Date | null = null;
  if (rawDate) {
    // Treat the picked calendar day as the END of that day in India, so "paid until 30 Sep" stays valid all through the 30th.
    paidUntil = new Date(`${rawDate}T23:59:59+05:30`);
    if (Number.isNaN(paidUntil.getTime())) throw new Error("Invalid date.");
  }
  await setTenantBilling(tenantId, { billingPeriod, paidUntil });
  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/restaurants/${tenantId}`);
}

const MAX_DELETE_BATCH = 200;

/**
 * Permanent bulk delete, reached only from the /super-admin/delete confirmation
 * page. The typed word is checked here on the server, not just in the browser.
 */
export async function deleteTenantsAction(formData: FormData) {
  const session = await requireRole("SUPER_ADMIN");
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") {
    throw new Error('Type DELETE (capitals) to confirm.');
  }
  const ids = [...new Set(formData.getAll("id").map(String))].filter(Boolean);
  if (ids.length === 0) redirect("/super-admin");
  if (ids.length > MAX_DELETE_BATCH) throw new Error(`Too many at once (max ${MAX_DELETE_BATCH}).`);

  const doomed = await prisma.tenant.findMany({ where: { id: { in: ids } }, select: { slug: true } });
  const count = await deleteTenants(ids);
  console.info(`[super-admin] ${session.email} DELETED ${count} restaurant(s): ${doomed.map((t) => t.slug).join(", ")}`);
  revalidatePath("/super-admin");
  redirect(`/super-admin?deleted=${count}`);
}
