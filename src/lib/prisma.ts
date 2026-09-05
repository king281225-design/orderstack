import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma 7 dropped the Rust query engine in favor of JS driver adapters, so
// PrismaClient needs an explicit adapter instead of reading DATABASE_URL from
// schema.prisma (see prisma.config.ts for how the CLI gets its own copy of
// the connection string for migrate/seed/studio).
//
// Database is MySQL, connected via @prisma/adapter-mariadb (works against
// both MariaDB and MySQL servers) — not the Postgres setup from the initial
// scaffold. See CLAUDE.md for why this changed.
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at a real " +
        "MySQL instance — see CLAUDE.md.",
    );
  }
  const adapter = new PrismaMariaDb(connectionString);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Standard Next.js dev-mode singleton so hot-reload doesn't exhaust database
// connections by creating a new PrismaClient on every reload.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
