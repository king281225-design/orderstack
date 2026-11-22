import { SITE_URL } from "@/lib/site";
import {
  PRODUCT_SUMMARY,
  NOT_TO_BE_CONFUSED,
  PUBLIC_PAGES,
  getBlogLinks,
  getContact,
  getPricing,
} from "@/lib/agent-info";

// llms.txt (https://llmstxt.org): an H1 title, a blockquote summary, optional
// prose, then H2 sections of markdown LINKS ("- [Title](url): note"). Generated
// from the same data as the site itself (plans.ts prices, the blog's own post
// list, the shared page list) so it can't drift — it used to be a hand-typed
// static file with plain "Label: URL" lines, which isn't the format.
export const dynamic = "force-static";

export function GET() {
  const pricing = getPricing();
  const contact = getContact();
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const lines = [
    "# BhojSetu",
    "",
    `> ${PRODUCT_SUMMARY}`,
    "",
    NOT_TO_BE_CONFUSED,
    "",
    `Pages are also available as Markdown: request them with the header \`Accept: text/markdown\` (supported on the homepage and /pricing). A small read-only MCP server is at ${SITE_URL}/mcp, described by ${SITE_URL}/.well-known/mcp/server-card.json.`,
    "",
    "## Pricing",
    "",
    ...pricing.plans.map(
      (p) => `- [${p.name}](${SITE_URL}/pricing): ${inr(p.monthlyInr)}/month — ${p.features.slice(0, 3).join("; ")}`,
    ),
    "",
    "## Key pages",
    "",
    ...PUBLIC_PAGES.map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.description}`),
    "",
    "## Guides and articles",
    "",
    ...getBlogLinks().map((b) => `- [${b.title}](${b.url}): ${b.description}`),
    "",
    "## Contact",
    "",
    `- [Contact page](${contact.contactPage}): ${contact.business} (founder: ${contact.founder})`,
    `- Phone / WhatsApp: ${contact.phoneAndWhatsApp}`,
    `- Email: ${contact.email}`,
    `- Address: ${contact.address}`,
    "",
    "## Optional",
    "",
    `- [Sitemap](${SITE_URL}/sitemap.xml): every public page, including restaurant storefronts`,
    `- [MCP Server Card](${SITE_URL}/.well-known/mcp/server-card.json): machine-readable description of the MCP server`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
