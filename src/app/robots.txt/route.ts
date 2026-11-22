import { SITE_URL } from "@/lib/site";

// Replaces app/robots.ts: Next's MetadataRoute.Robots type has no field for
// the Content-Signal directive, so robots.txt is written out by hand here.
//
// Content-Signal (https://contentsignals.org) states how our content may be
// used once fetched. It sits INSIDE the User-agent group, and is a stated
// preference, not enforcement — it complements Disallow, it doesn't replace it.
//   search=yes   — fine to index and show in search results
//   ai-train=no  — not to be used to train or fine-tune AI models
// ai-input (live use in AI answers / RAG) is deliberately NOT stated: that's a
// policy call for the owner, and leaving it out neither grants nor refuses it
// (same stance as Cloudflare's own managed robots.txt).
export const dynamic = "force-static";

const DISALLOW = [
  "/dashboard",
  "/super-admin",
  "/api",
  "/login",
  "/forgot-password",
  "/reset-password",
  // Markdown twins of / and /pricing — served via Accept: text/markdown, not
  // meant to be crawled as separate URLs.
  "/md",
];

export function GET() {
  const body = [
    "User-Agent: *",
    "Content-Signal: search=yes, ai-train=no",
    "Allow: /",
    ...DISALLOW.map((p) => `Disallow: ${p}`),
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
