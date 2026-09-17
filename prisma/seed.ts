// Bootstraps the first SUPER_ADMIN account from env vars so there's a way
// to log in and start adding restaurants. Safe to run more than once — it
// only creates the account if no super admin exists yet.
//
// Run with: npx prisma db seed   (needs DATABASE_URL set to a real MySQL instance)
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL ?? "");
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      "SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set in .env — skipping super admin bootstrap.",
    );
    return;
  }

  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.log(`Super admin already exists (${existing.email}) — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: { email, passwordHash, role: "SUPER_ADMIN" },
  });
  console.log(`Created super admin: ${admin.email}. Log in and change the password.`);
}

// A dedicated, always-on demo storefront for the marketing homepage to link
// to (src/lib/contact.ts's DEMO_STOREFRONT_SLUG) — not a real restaurant.
// Guarded on the slug already existing, so this is safe to leave here
// permanently and re-run on every `npx prisma db seed` without duplicating.
//
// Deliberately does NOT import createTenantWithOwner/seedSampleMenu from
// src/lib/data/* — those files start with `import "server-only"`, which
// breaks when run outside the Next server via plain tsx (see this
// project's own CLAUDE.md, 2026-09-08 entry). Raw prisma.*.create calls
// here instead, same workaround already used above for the super-admin
// bootstrap (bcrypt.hash duplicated rather than importing lib/auth.ts).
//
// Menu content mirrors SAMPLE_MENU in src/lib/data/menu.ts — keep the two
// in sync if that list changes.
const DEMO_SLUG = "demo-restaurant";
const DEMO_MENU: { category: string; items: { name: string; priceRupees: number; description: string }[] }[] = [
  {
    category: "Starters",
    items: [
      { name: "Paneer Tikka", priceRupees: 249, description: "Char-grilled cottage cheese marinated in yogurt and spices." },
      { name: "Chicken 65", priceRupees: 279, description: "Spicy, deep-fried chicken tossed with curry leaves." },
      { name: "Veg Spring Rolls", priceRupees: 199, description: "Crispy rolls stuffed with mixed vegetables." },
    ],
  },
  {
    category: "Mains",
    items: [
      { name: "Butter Chicken", priceRupees: 399, description: "Tandoori chicken simmered in a creamy tomato gravy." },
      { name: "Dal Makhani", priceRupees: 249, description: "Black lentils slow-cooked overnight with butter and cream." },
      { name: "Veg Biryani", priceRupees: 279, description: "Fragrant basmati rice layered with spiced vegetables." },
      { name: "Palak Paneer", priceRupees: 269, description: "Cottage cheese cubes in a smooth spinach gravy." },
    ],
  },
  {
    category: "Beverages",
    items: [
      { name: "Masala Chai", priceRupees: 49, description: "Spiced Indian tea." },
      { name: "Sweet Lassi", priceRupees: 89, description: "Chilled yogurt-based sweet drink." },
      { name: "Fresh Lime Soda", priceRupees: 69, description: "Refreshing lime soda, sweet or salted." },
    ],
  },
];

async function seedDemoTenant() {
  const existing = await prisma.tenant.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) {
    console.log(`Demo tenant already exists (${DEMO_SLUG}) — skipping.`);
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      slug: DEMO_SLUG,
      name: "BhojSetu Demo Restaurant",
      tagline: "See how a BhojSetu storefront looks and works",
      isOpen: true,
      status: "ACTIVE",
    },
  });

  const demoPassword = process.env.DEMO_OWNER_PASSWORD ?? randomUUID();
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "demo-owner@bhojsetu.in",
      passwordHash: await bcrypt.hash(demoPassword, 10),
      role: "OWNER",
    },
  });

  for (const group of DEMO_MENU) {
    const category = await prisma.category.create({ data: { tenantId: tenant.id, name: group.category } });
    for (const item of group.items) {
      await prisma.item.create({
        data: {
          tenantId: tenant.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          priceCents: Math.round(item.priceRupees * 100),
        },
      });
    }
  }

  console.log(`Created demo tenant: /r/${DEMO_SLUG}`);
}

main()
  .then(() => seedDemoTenant())
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
