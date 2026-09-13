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
    where: { tenantId, status: { not: "CANCELLED" } },
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

  return Array.from(byPhone.values()).sort(
    (a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime(),
  );
}

/** Count of customers whose first-ever order fell within the window — feeds the analytics "new customers" figure. */
export function countNewCustomers(
  customers: { firstOrderAt: Date }[],
  since: Date,
): number {
  return customers.filter((c) => c.firstOrderAt.getTime() >= since.getTime()).length;
}
