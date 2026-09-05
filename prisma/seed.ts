// Bootstraps the first SUPER_ADMIN account from env vars so there's a way
// to log in and start adding restaurants. Safe to run more than once — it
// only creates the account if no super admin exists yet.
//
// Run with: npx prisma db seed   (needs DATABASE_URL set to a real MySQL instance)
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

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

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
