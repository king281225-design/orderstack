// Local-dev-only Postgres, no install/service/account needed — for trying
// the app out before a real Neon/Supabase database exists. Production must
// still use a real managed Postgres per CLAUDE.md; this is a convenience for
// running `npm run dev` / previews on a machine with nothing provisioned.
//
// Usage: node scripts/dev-db.mjs
// Leave it running in one terminal; use `npm run dev` (etc.) in another.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(__dirname, "..", ".devdb");
const isNew = !existsSync(databaseDir);

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 5433,
  persistent: true,
});

if (isNew) {
  console.log("Initializing local dev Postgres cluster at .devdb ...");
  await pg.initialise();
}

await pg.start();
console.log("Local dev Postgres running on port 5433.");

if (isNew) {
  await pg.createDatabase("orderstack");
  console.log('Created database "orderstack".');
}

console.log(
  'DATABASE_URL for .env: "postgresql://postgres:postgres@localhost:5433/orderstack"',
);
console.log("Press Ctrl+C to stop.");

process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});
