import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  ContactMethod,
  SupportCategory,
  SupportPriority,
  SupportStatus,
} from "@prisma/client";

export const SUPPORT_CATEGORIES: { value: SupportCategory; label: string; hint: string }[] = [
  { value: "TECHNICAL_ISSUE", label: "Something isn't working (bug / error)", hint: "A page, button or feature misbehaves" },
  { value: "ORDER_PROBLEM", label: "Problem with an order", hint: "Missing, wrong or stuck order" },
  { value: "PAYMENT_BILLING", label: "Payment or subscription", hint: "Plan, invoice, UPI/online payment" },
  { value: "MENU_HELP", label: "Menu help", hint: "Items, photos, AI menu import, prices" },
  { value: "QR_TABLES", label: "QR codes & tables", hint: "Printing or scanning QR codes" },
  { value: "ACCOUNT_LOGIN", label: "Login or account", hint: "Password, staff logins, access" },
  { value: "FEATURE_REQUEST", label: "Feature request / suggestion", hint: "Something you wish it could do" },
  { value: "GENERAL_ENQUIRY", label: "General enquiry", hint: "Any other question" },
];

export const SUPPORT_PRIORITIES: { value: SupportPriority; label: string }[] = [
  { value: "URGENT", label: "Urgent — I can't take orders right now" },
  { value: "HIGH", label: "High — a key feature is broken" },
  { value: "NORMAL", label: "Normal — needs help, but I can carry on" },
  { value: "LOW", label: "Low — a question or suggestion" },
];

export const SUPPORT_AREAS = [
  "Orders",
  "New bill / Invoices",
  "Menu",
  "Inventory",
  "KOT / Kitchen",
  "Tables & QR codes",
  "Customers",
  "Coupons",
  "Analytics",
  "Settings / Branding",
  "Billing / Plan",
  "My customers' storefront page",
  "Login / Sign-up",
  "Other",
] as const;

export const CATEGORY_LABEL = Object.fromEntries(SUPPORT_CATEGORIES.map((c) => [c.value, c.label])) as Record<
  SupportCategory,
  string
>;
export const PRIORITY_LABEL: Record<SupportPriority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  NORMAL: "Normal",
  LOW: "Low",
};
export const STATUS_LABEL: Record<SupportStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_CUSTOMER: "Waiting for you",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export class SupportRateLimitError extends Error {}

export type NewTicketInput = {
  createdByEmail: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  preferredContact: ContactMethod;
  bestTime: string | null;
  category: SupportCategory;
  priority: SupportPriority;
  area: string | null;
  orderNumber: number | null;
  subject: string;
  description: string;
  screenshotUrl: string | null;
  userAgent: string | null;
};

const MAX_TICKETS_PER_HOUR = 5;

export async function createTicket(tenantId: string, input: NewTicketInput) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.supportTicket.count({ where: { tenantId, createdAt: { gte: since } } });
  if (recent >= MAX_TICKETS_PER_HOUR) {
    throw new SupportRateLimitError(
      "You've sent several requests in the last hour. Please call or WhatsApp us for anything urgent, or wait a little before sending another.",
    );
  }
  return prisma.supportTicket.create({ data: { tenantId, ...input } });
}

export async function listTicketsForTenant(tenantId: string) {
  return prisma.supportTicket.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
}

/** Platform-wide queue for /super-admin/support — newest urgent/open work first. */
export async function listAllTickets(status?: SupportStatus | "ACTIVE") {
  const where =
    status === "ACTIVE"
      ? { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER"] as SupportStatus[] } }
      : status
        ? { status }
        : {};
  return prisma.supportTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { tenant: { select: { name: true, slug: true, planTier: true } } },
  });
}

export async function countActiveTickets(): Promise<number> {
  return prisma.supportTicket.count({
    where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER"] } },
  });
}

export async function updateTicket(
  id: string,
  input: { status: SupportStatus; adminResponse: string | null },
) {
  const existing = await prisma.supportTicket.findUnique({ where: { id } });
  if (!existing) return null;

  const response = input.adminResponse?.trim() || null;
  const responseChanged = response !== (existing.adminResponse ?? null);
  const nowResolved = input.status === "RESOLVED" || input.status === "CLOSED";

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: {
      status: input.status,
      adminResponse: response,
      respondedAt: response && (responseChanged || !existing.respondedAt) ? new Date() : existing.respondedAt,
      resolvedAt: nowResolved ? (existing.resolvedAt ?? new Date()) : null,
    },
  });
  return { ticket: updated, responseChanged, statusChanged: existing.status !== input.status };
}
