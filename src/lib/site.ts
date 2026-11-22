/**
 * Single source of truth for the platform's own public site URL — used by
 * canonical tags, Open Graph URLs, JSON-LD, and the sitemap/robots routes.
 * Override with NEXT_PUBLIC_SITE_URL once a non-default domain is live.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://bhojsetu.in").replace(/\/$/, "");

export const SITE_NAME = "BhojSetu";

// The Organization JSON-LD entity's @id. Lives here (not exported from
// app/layout.tsx) because Next's route type check rejects extra exports from
// a layout file under `next build --webpack`. Pages reference it as
// `publisher: { "@id": ORG_JSON_LD_ID }`.
export const ORG_JSON_LD_ID = `${SITE_URL}/#org`;
