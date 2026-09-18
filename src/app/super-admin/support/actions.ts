"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { updateTicket } from "@/lib/data/support";
import { sendSupportUpdateEmail } from "@/lib/notifications/email";

const schema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]),
  adminResponse: z.string().max(5000).optional(),
});

/** Team-side update: status + the reply the restaurant sees on its Help page (and by email). */
export async function updateSupportTicketAction(id: string, formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const parsed = schema.safeParse({
    status: formData.get("status"),
    adminResponse: typeof formData.get("adminResponse") === "string" ? formData.get("adminResponse") : undefined,
  });
  if (!parsed.success) return;

  const result = await updateTicket(id, {
    status: parsed.data.status,
    adminResponse: parsed.data.adminResponse ?? null,
  });
  if (result && (result.responseChanged || result.statusChanged)) {
    void sendSupportUpdateEmail(result.ticket);
  }
  revalidatePath("/super-admin/support");
}
