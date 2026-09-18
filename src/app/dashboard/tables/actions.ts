"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { getTenantById, setTenantQrCardDesign } from "@/lib/data/tenants";
import { defaultQrCardDesign, sanitizeQrCardDesign, type QrCardDesign } from "@/lib/qr-card";

export async function saveQrCardDesignAction(input: unknown): Promise<{ error: string | null; design?: QrCardDesign }> {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return { error: "Restaurant not found." };

  const design = sanitizeQrCardDesign(input, defaultQrCardDesign(tenant));
  await setTenantQrCardDesign(session.tenantId, design);
  revalidatePath("/dashboard/tables");
  return { error: null, design };
}
