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
  // The `mariadb` driver's own defaults are too tight for a remote/cross-region
  // host (e.g. TiDB Serverless): connectTimeout defaults to just 1000ms, and
  // the pool's acquireTimeout to 10000ms — any brief network hiccup on a
  // cross-region TLS handshake blows past both, surfacing as `pool timeout:
  // failed to retrieve a connection from pool (active=0 idle=0)` even though
  // the database itself is fine (hit for real against TiDB Serverless from
  // Vercel, see CLAUDE.md). Also lower idleTimeout below TiDB's own
  // documented 30-minute server-side connection cutoff so idle connections
  // get recycled by the client first, rather than found already-dead later.
  // Only applied when not already specified in DATABASE_URL, so a local
  // MySQL setup (fast, same-network) isn't affected unless it wants to be.
  const url = new URL(connectionString);
  if (!url.searchParams.has("connectTimeout")) {
    url.searchParams.set("connectTimeout", "30000");
  }
  if (!url.searchParams.has("acquireTimeout")) {
    url.searchParams.set("acquireTimeout", "45000");
  }
  if (!url.searchParams.has("idleTimeout")) {
    url.searchParams.set("idleTimeout", "600");
  }
  const adapter = new PrismaMariaDb(url.toString());
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
