"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { setSpinPool } from "@/lib/data/christmas";
import { tenantHasFeature } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export type SpinPoolActionState = { error: string | null };
const ok: SpinPoolActionState = { error: null };

export async function setChristmasSpinPoolAction(
  _prev: SpinPoolActionState,
  formData: FormData,
): Promise<SpinPoolActionState> {
  const session = await requireOwnerSession();

  // Defense in depth alongside the page-level gate (/dashboard/christmas) —
  // same pattern as createCouponAction.
  const tenant = await getTenantById(session.tenantId);
  if (!tenant || !tenantHasFeature(tenant, "christmasCampaign")) {
    return { error: "The Christmas campaign isn't enabled for your account." };
  }

  const submittedIds = formData.getAll("couponId").map(String);

  // Never trust client-submitted ids blindly — only ids that actually
  // resolve to a coupon belonging to THIS tenant make it into the pool.
  const owned = await prisma.coupon.findMany({
    where: { id: { in: submittedIds }, tenantId: session.tenantId },
    select: { id: true },
  });
  const verifiedIds = owned.map((c) => c.id);

  await setSpinPool(session.tenantId, verifiedIds);
  revalidatePath("/dashboard/christmas");
  return ok;
}
