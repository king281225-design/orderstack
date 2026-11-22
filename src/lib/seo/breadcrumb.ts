import { SITE_URL, SITE_NAME } from "@/lib/site";

/**
 * Builds a BreadcrumbList JSON-LD object: Home > ...rest. `rest` is the
 * page's own trail after Home — e.g. [{ name: "Pricing", path: "/pricing" }].
 * Matches the pattern already used on blog posts (src/app/(marketing)/blog/[slug]/page.tsx).
 */
export function buildBreadcrumbJsonLd(rest: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      ...rest.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.name,
        item: `${SITE_URL}${item.path}`,
      })),
    ],
  };
}
