import "dotenv/config";
import { defineConfig } from "prisma/config";
import { resolveDatabaseUrl } from "./src/lib/database-url";

// `prisma generate` (run by the `postinstall` hook) only reads schema.prisma —
// it never opens a database connection — but Prisma 7 still loads this config
// first, and `env("DATABASE_URL")` throws when the variable is unset. Hosted
// builds (e.g. Hostinger) run `npm install` before any env vars are available,
// which used to abort the whole install. So fall back to a placeholder, but
// ONLY for `generate`: every command that really connects (migrate deploy,
// db seed, studio…) must still fail loudly if DATABASE_URL is missing instead
// of silently trying to reach a fake host.
const GENERATE_ONLY_PLACEHOLDER_URL =
  "mysql://placeholder:placeholder@localhost:3306/placeholder";

function databaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (raw) return resolveDatabaseUrl(raw);
  if (process.argv.includes("generate")) return GENERATE_ONLY_PLACEHOLDER_URL;
  throw new Error(
    "Cannot resolve environment variable: DATABASE_URL. Set it in .env or the host's environment variables.",
  );
}

// Prisma 7 dropped `datasource { url }` from schema.prisma — the CLI (migrate,
// db seed, studio) now reads the connection string from here instead.
// PrismaClient itself is configured separately in src/lib/prisma.ts via the
// @prisma/adapter-mariadb driver adapter (MySQL), using the same DATABASE_URL
// (see resolveDatabaseUrl for why both need their own TLS param added).
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl(),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
