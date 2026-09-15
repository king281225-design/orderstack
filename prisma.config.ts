import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { resolveDatabaseUrl } from "./src/lib/database-url";

// Prisma 7 dropped `datasource { url }` from schema.prisma — the CLI (migrate,
// db seed, studio) now reads the connection string from here instead.
// PrismaClient itself is configured separately in src/lib/prisma.ts via the
// @prisma/adapter-mariadb driver adapter (MySQL), using the same DATABASE_URL
// (see resolveDatabaseUrl for why both need their own TLS param added).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: resolveDatabaseUrl(env("DATABASE_URL")),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
