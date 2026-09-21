import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * There's no separate Customer table — a "customer" is just the distinct
 * (customerPhone) values on this tenant's own Order rows, grouped in
 * application code. Fine at launch scale (1–5 restaurants, modest order
 * volume); a dedicated table would only earn its keep once cross-order
 * customer profile fields (saved addresses, etc.) are actually needed.
 * Always scoped by tenantId — one restaurant's customers never leak into
 * another's list, same isolation rule as every other query in src/lib/data.
 */
export async function listCustomersForTenant(tenantId: string) {
  const orders = await prisma.order.findMany({
    // Walk-in bills saved without a phone number have no identity to group
    // by, so they are left out of the customer list.
    where: { tenantId, status: { not: "CANCELLED" }, customerPhone: { not: "" } },
    select: {
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      totalCents: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const byPhone = new Map<
    string,
    {
      phone: string;
      name: string;
      email: string | null;
      orderCount: number;
      totalSpentCents: number;
      firstOrderAt: Date;
      lastOrderAt: Date;
    }
  >();

  for (const o of orders) {
    const existing = byPhone.get(o.customerPhone);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpentCents += o.totalCents;
      existing.lastOrderAt = o.createdAt;
      // Keep the most recent name/email on file — a repeat customer's
      // latest order is the freshest info we have about them.
      existing.name = o.customerName;
      existing.email = o.customerEmail ?? existing.email;
    } else {
      byPhone.set(o.customerPhone, {
        phone: o.customerPhone,
        name: o.customerName,
        email: o.customerEmail,
        orderCount: 1,
        totalSpentCents: o.totalCents,
        firstOrderAt: o.createdAt,
        lastOrderAt: o.createdAt,
      });
    }
  }

  return Array.from(byPhone.values())
    .map((c) => ({ ...c, loyaltyPoints: loyaltyPointsFor(c.totalSpentCents) }))
    .sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());
}

/**
 * A simple, fixed points-per-spend rule (1 point per ₹10) rather than a
 * stored balance — consistent with this file's own "no separate table,
 * derive from Order rows" approach above, and with an auto-applied
 * discount-on-Nth-order left out of scope (redeeming points isn't wired
 * into checkout; an owner who wants to reward a specific repeat customer
 * can already do that manually with the existing Coupon system). Points
 * are shown for recognition/reporting, not spent anywhere yet.
 */
function loyaltyPointsFor(totalSpentCents: number): number {
  return Math.floor(totalSpentCents / 1000);
}

/** CSV export for the Customers page — see /api/dashboard/customers/export. */
export function customersToCsv(
  customers: { name: string; phone: string; email: string | null; orderCount: number; totalSpentCents: number; loyaltyPoints: number; lastOrderAt: Date }[],
): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Name", "Phone", "Email", "Orders", "Total spent (₹)", "Loyalty points", "Last order"];
  const rows = customers.map((c) => [
    c.name,
    c.phone,
    c.email ?? "",
    String(c.orderCount),
    (c.totalSpentCents / 100).toFixed(2),
    String(c.loyaltyPoints),
    c.lastOrderAt.toISOString(),
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
}

/** Count of customers whose first-ever order fell within the window — feeds the analytics "new customers" figure. */
export function countNewCustomers(
  customers: { firstOrderAt: Date }[],
  since: Date,
): number {
  return customers.filter((c) => c.firstOrderAt.getTime() >= since.getTime()).length;
}
