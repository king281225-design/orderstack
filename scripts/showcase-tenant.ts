// One-off: dresses a restaurant up as a showcase/demo account — placeholder
// social links + rating, an initials-only logo, direct stock tracking on every
// menu item, and the Advanced plan (kept ACTIVE so the trial gate never locks it).
//
// Run against the tenant's real database:
//   $env:DATABASE_URL="<prod url>"; npx tsx scripts/showcase-tenant.ts <slug>
// Idempotent: re-running just reapplies the same values (no duplicate stock rows).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const slug = process.argv[2];
if (!slug) throw new Error("Usage: tsx scripts/showcase-tenant.ts <tenant-slug>");

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL ?? "") });

function initialsLogo(name: string, bg: string, fg: string) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${bg}"/>` +
    `<text x="64" y="64" text-anchor="middle" dominant-baseline="central" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="700" fill="${fg}">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) throw new Error(`No tenant with slug "${slug}"`);
  console.log(`Found: ${tenant.name} (${tenant.planTier}, ${tenant.subscriptionStatus})`);

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      logoUrl: initialsLogo(tenant.name, tenant.colorPrimary, "#ffffff"),
      googleReviewUrl: "https://g.page/r/bhojsetu-kitchen/review",
      googleRating: 4.8,
      googleReviewCount: 126,
      instagramUrl: "https://www.instagram.com/bhojsetu",
      facebookUrl: "https://www.facebook.com/bhojsetu",
      planTier: "ADVANCED",
      pendingPlanTier: null,
      subscriptionStatus: "ACTIVE",
    },
  });

  const items = await prisma.item.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: "asc" } });
  let i = 0;
  for (const item of items) {
    const threshold = 10;
    // Every 4th item sits just under its threshold so the low-stock badge shows.
    const qty = i % 4 === 3 ? 6 : 25 + (i % 5) * 10;
    const hadStock = item.trackStock && item.stockQty !== null;
    await prisma.item.update({
      where: { id: item.id },
      data: {
        trackStock: true,
        stockQty: qty,
        lowStockThreshold: threshold,
        purchasePriceCents: item.purchasePriceCents ?? Math.round(item.priceCents * 0.45),
        sku: item.sku ?? `BK-${String(i + 1).padStart(3, "0")}`,
      },
    });
    if (!hadStock) {
      await prisma.itemStockMovement.create({
        data: { tenantId: tenant.id, itemId: item.id, delta: qty, reason: "ADJUSTMENT", note: "Showcase opening stock" },
      });
    }
    i++;
  }
  console.log(`Done: ${items.length} items tracked, plan ADVANCED/ACTIVE, logo + links set.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
