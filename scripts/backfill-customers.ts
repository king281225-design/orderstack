// One-time backfill: populates the new Customer table (see prisma/schema.prisma)
// from existing Order history, for tenants that had real orders before this
// shipped — without this, their /dashboard/customers page would look empty
// until a new order came in, even though they have real repeat customers.
// Groups by (tenantId, customerPhone) exactly like the old live-grouping
// version of listCustomersForTenant used to, computing points from the
// tenant's current loyaltyRupeesPerPoint rate (there's no historical record
// of past rate changes, so this is necessarily an approximation for a tenant
// that changes its rate later — fine for a one-time catch-up).
//
// Idempotent: re-running just recomputes and overwrites the same rows.
//
// Run against the target database:
//   $env:DATABASE_URL="<url>"; npx tsx scripts/backfill-customers.ts [tenantSlug]
// Omit tenantSlug to backfill every tenant.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const slugArg = process.argv[2];

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL ?? "") });

function loyaltyPointsFor(totalSpentCents: number, rupeesPerPoint: number | null): number {
  const rate = rupeesPerPoint && rupeesPerPoint > 0 ? rupeesPerPoint : 10;
  return Math.floor(totalSpentCents / 100 / rate);
}

async function backfillTenant(tenantId: string, loyaltyRupeesPerPoint: number | null) {
  const orders = await prisma.order.findMany({
    where: { tenantId, status: { not: "CANCELLED" }, customerPhone: { not: "" } },
    select: { customerName: true, customerPhone: true, customerEmail: true, totalCents: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const byPhone = new Map<
    string,
    { name: string; email: string | null; orderCount: number; totalSpentCents: number; firstOrderAt: Date; lastOrderAt: Date }
  >();
  for (const o of orders) {
    const existing = byPhone.get(o.customerPhone);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpentCents += o.totalCents;
      existing.lastOrderAt = o.createdAt;
      existing.name = o.customerName;
      existing.email = o.customerEmail ?? existing.email;
    } else {
      byPhone.set(o.customerPhone, {
        name: o.customerName,
        email: o.customerEmail,
        orderCount: 1,
        totalSpentCents: o.totalCents,
        firstOrderAt: o.createdAt,
        lastOrderAt: o.createdAt,
      });
    }
  }

  for (const [phone, c] of byPhone) {
    await prisma.customer.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      create: {
        tenantId,
        phone,
        name: c.name,
        email: c.email,
        orderCount: c.orderCount,
        totalSpentCents: c.totalSpentCents,
        pointsBalance: loyaltyPointsFor(c.totalSpentCents, loyaltyRupeesPerPoint),
        firstOrderAt: c.firstOrderAt,
        lastOrderAt: c.lastOrderAt,
      },
      update: {
        name: c.name,
        email: c.email,
        orderCount: c.orderCount,
        totalSpentCents: c.totalSpentCents,
        pointsBalance: loyaltyPointsFor(c.totalSpentCents, loyaltyRupeesPerPoint),
        firstOrderAt: c.firstOrderAt,
        lastOrderAt: c.lastOrderAt,
      },
    });
  }

  return byPhone.size;
}

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: slugArg ? { slug: slugArg } : undefined,
    select: { id: true, slug: true, name: true, loyaltyRupeesPerPoint: true },
  });
  if (slugArg && tenants.length === 0) throw new Error(`No tenant with slug "${slugArg}"`);

  for (const tenant of tenants) {
    const count = await backfillTenant(tenant.id, tenant.loyaltyRupeesPerPoint);
    console.log(`${tenant.slug} (${tenant.name}): ${count} customer(s) backfilled`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
