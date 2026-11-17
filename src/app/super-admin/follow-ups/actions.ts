"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { resumeTrialFollowUps, stopTrialFollowUps } from "@/lib/data/trial-followups";

export async function stopFollowUpsAction(tenantId: string) {
  await requireRole("SUPER_ADMIN");
  await stopTrialFollowUps(tenantId);
  revalidatePath("/super-admin/follow-ups");
}

export async function resumeFollowUpsAction(tenantId: string) {
  await requireRole("SUPER_ADMIN");
  await resumeTrialFollowUps(tenantId);
  revalidatePath("/super-admin/follow-ups");
}
