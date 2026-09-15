/**
 * Normalizes a MySQL DATABASE_URL so both places that connect to it agree on
 * using TLS when the server requires it — the Prisma CLI's own schema engine
 * (migrate/db push/studio, wired up in prisma.config.ts) and the runtime
 * `mariadb` driver pool (src/lib/prisma.ts, via @prisma/adapter-mariadb).
 *
 * Hosts like TiDB Serverless enforce `require_secure_transport`: a plain
 * connection attempt is rejected before auth even completes, with
 * "Connections using insecure transport are prohibited." The two engines
 * that connect to this database recognize *different* query-string params
 * for turning TLS on — the native schema engine wants `sslaccept=strict`,
 * the `mariadb` npm driver wants `ssl=true` — so both are set here rather
 * than depending on whichever one the raw env var happens to already have.
 * No-ops (never overrides) when a param is already explicitly set, so a
 * plain local MySQL DATABASE_URL without TLS is untouched. Also skipped
 * entirely for localhost/127.0.0.1 (this project's local-dev MySQL, per
 * CLAUDE.md) — that server doesn't speak TLS at all, and forcing
 * `sslaccept=strict` against it fails the handshake outright rather than
 * just being a harmless no-op.
 *
 * No "server-only" here: this also runs inside prisma.config.ts, which the
 * Prisma CLI loads outside of Next.js entirely.
 */
export function resolveDatabaseUrl(raw: string): string {
  const url = new URL(raw);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return raw;
  }
  if (!url.searchParams.has("sslaccept")) {
    url.searchParams.set("sslaccept", "strict");
  }
  if (!url.searchParams.has("ssl")) {
    url.searchParams.set("ssl", "true");
  }
  return url.toString();
}
