import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 dropped `datasource { url }` from schema.prisma — the CLI (migrate,
// db seed, studio) now reads the connection string from here instead.
// PrismaClient itself is configured separately in src/lib/prisma.ts via the
// @prisma/adapter-mariadb driver adapter (MySQL), using the same DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
