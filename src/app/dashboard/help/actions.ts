"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenantSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { createTicket, SupportRateLimitError } from "@/lib/data/support";
import { saveUpload } from "@/lib/storage";
import { SUPPORT_RESPONSE_TARGET } from "@/lib/contact";
import { sendSupportConfirmationEmail, sendSupportTeamEmail } from "@/lib/notifications/email";

export type SupportFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  ticketNumber?: number;
};

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  category: z.enum([
    "TECHNICAL_ISSUE",
    "ORDER_PROBLEM",
    "PAYMENT_BILLING",
    "MENU_HELP",
    "QR_TABLES",
    "ACCOUNT_LOGIN",
    "FEATURE_REQUEST",
    "GENERAL_ENQUIRY",
  ]),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]),
  subject: z.string().trim().min(5, "Add a short subject (at least 5 characters).").max(150),
  description: z
    .string()
    .trim()
    .min(20, "Please describe the problem in a bit more detail (at least 20 characters).")
    .max(5000),
  area: z.string().trim().max(60).optional(),
  orderNumber: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{1,9}$/.test(v), "Order number should be digits only."),
  contactName: z.string().trim().min(2, "Enter your name.").max(80),
  contactPhone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Enter a phone number we can reach you on."),
  contactEmail: z.string().trim().email("Enter a valid email address.").max(120),
  preferredContact: z.enum(["PHONE", "WHATSAPP", "EMAIL"]),
  bestTime: z.string().trim().max(60).optional(),
});

export async function submitSupportTicketAction(
  _prev: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const session = await requireTenantSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return { error: "Restaurant not found." };

  const parsed = schema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  let screenshotUrl: string | null = null;
  const file = formData.get("screenshot");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { error: "Please attach a picture (PNG or JPG).", fieldErrors: { screenshot: "Images only." } };
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      return { error: "That screenshot is over 5 MB.", fieldErrors: { screenshot: "Max 5 MB." } };
    }
    try {
      screenshotUrl = await saveUpload(file, "support");
    } catch (err) {
      console.error("support screenshot upload failed:", err);
      return { error: "Couldn't upload the screenshot. Try again, or send the request without it." };
    }
  }

  const hdrs = await headers();
  const host = hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const origin = host ? `${proto}://${host}` : null;

  let ticket;
  try {
    ticket = await createTicket(session.tenantId, {
      createdByEmail: session.email,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      preferredContact: data.preferredContact,
      bestTime: data.bestTime || null,
      category: data.category,
      priority: data.priority,
      area: data.area || null,
      orderNumber: data.orderNumber ? Number(data.orderNumber) : null,
      subject: data.subject,
      description: data.description,
      screenshotUrl,
      userAgent: hdrs.get("user-agent")?.slice(0, 190) ?? null,
    });
  } catch (err) {
    if (err instanceof SupportRateLimitError) return { error: err.message };
    console.error("createTicket failed:", err);
    return { error: "Couldn't send your request. Please try again, or call/WhatsApp us." };
  }

  void sendSupportTeamEmail(ticket, tenant.name, origin);
  void sendSupportConfirmationEmail(ticket, tenant.name, SUPPORT_RESPONSE_TARGET);

  revalidatePath("/dashboard/help");
  return { error: null, ticketNumber: ticket.ticketNumber };
}
