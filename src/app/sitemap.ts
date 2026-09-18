import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { listActiveTenantSlugsForSitemap } from "@/lib/data/tenants";
import { BLOG_POSTS } from "@/lib/blog/posts";

// Otherwise this is static and only regenerates on a rebuild/redeploy — a
// restaurant that signs up in between would be invisible to crawlers until
// the next deploy. Hourly is fresh enough for a sitemap without hitting the
// database on every crawl.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/refund`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/compare/bhojsetu-vs-petpooja`, changeFrequency: "monthly", priority: 0.7 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.publishedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const tenants = await listActiveTenantSlugsForSitemap();
  const storefrontRoutes: MetadataRoute.Sitemap = tenants.map((t) => ({
    url: `${SITE_URL}/r/${t.slug}`,
    lastModified: t.updatedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...blogRoutes, ...storefrontRoutes];
}
