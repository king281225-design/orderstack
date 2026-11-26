import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/data/tenants";
import { listPublicMenu, getBestsellerItemIds } from "@/lib/data/menu";
import { MenuBrowser } from "@/components/storefront/menu-browser";
import { CaptureTableParam } from "@/components/storefront/capture-table-param";
import { DemoViewPing } from "@/components/storefront/demo-view-ping";
import { InstagramIcon, FacebookIcon, GoogleIcon } from "@/components/storefront/social-icons";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";
import { DEMO_STOREFRONT_SLUG } from "@/lib/contact";
import { tenantHasFeature } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status === "SUSPENDED") return {};

  const title = tenant.tagline ? `${tenant.name} — ${tenant.tagline}` : `${tenant.name} — Order Online`;
  const description = `Order online from ${tenant.name}. Browse the menu, pay via UPI or cash on delivery, and track your order — no app needed.`;
  const url = `${SITE_URL}/r/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      images: tenant.logoUrl ? [{ url: tenant.logoUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: tenant.logoUrl ? [tenant.logoUrl] : undefined,
    },
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();

  const [rawCategories, bestsellerIds] = await Promise.all([
    listPublicMenu(tenant.id),
    getBestsellerItemIds(tenant.id),
  ]);
  const bestsellerIdSet = new Set(bestsellerIds);
  // Explicit allowlist, not a spread of the raw Prisma row — Item also
  // carries stockQty/lowStockThreshold (Prisma.Decimal, for direct-stock
  // tracking) and other owner-only fields that aren't plain serializable
  // objects, which React rejects when crossing the server->client boundary
  // into MenuBrowser (a Client Component). Same fix already applied to the
  // dashboard menu page's own toDisplayItem for the same reason. Prisma's
  // Json columns (tags/variants) also come back typed as generic JsonValue —
  // cast to the shapes createItem/updateItem actually ever write (see
  // menu-import wizard's publish action), rather than widening MenuBrowser's
  // own prop types to accept arbitrary JSON.
  const toPublicItems = (items: (typeof rawCategories)[number]["items"]) =>
    items.map((item) => {
      const existingTags = (item.tags as string[] | null) ?? [];
      // Auto-computed from real sales (see getBestsellerItemIds), not a
      // manually-set flag — never add it twice if the owner already tagged
      // the item "Bestseller" by hand via the AI-import wizard/manual edit.
      const tags =
        bestsellerIdSet.has(item.id) && !existingTags.includes("Bestseller")
          ? ["Bestseller", ...existingTags]
          : existingTags;
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        imageUrl: item.imageUrl,
        isVeg: item.isVeg,
        isAvailable: item.isAvailable,
        tags: tags.length > 0 ? tags : null,
        variants: (item.variants as { label: string; priceCents: number }[] | null) ?? null,
        addOns: item.addOns.map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents })),
      };
    });
  const categories = rawCategories.map((c) => ({
    ...c,
    items: toPublicItems(c.items),
    subcategories: c.subcategories.map((sc) => ({ ...sc, items: toPublicItems(sc.items) })),
  }));

  const restaurantJsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: tenant.name,
    url: `${SITE_URL}/r/${slug}`,
    image: tenant.logoUrl ?? undefined,
    ...(tenant.googleRating != null && tenant.googleReviewCount != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: tenant.googleRating,
            reviewCount: tenant.googleReviewCount,
          },
        }
      : {}),
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: categories
        .filter((c) => c.items.length > 0)
        .map((c) => ({
          "@type": "MenuSection",
          name: c.name,
          hasMenuItem: c.items
            .filter((i) => i.isAvailable)
            .map((i) => ({
              "@type": "MenuItem",
              name: i.name,
              description: i.description || undefined,
              offers: { "@type": "Offer", price: (i.priceCents / 100).toFixed(2), priceCurrency: "INR" },
            })),
        })),
    },
  };

  return (
    <>
      <JsonLd data={restaurantJsonLd} />
      <Suspense fallback={null}>
        <CaptureTableParam />
      </Suspense>
      {slug === DEMO_STOREFRONT_SLUG && <DemoViewPing />}
      {tenantHasFeature(tenant, "christmasCampaign") && (
        <div
          className="px-4 pb-4 pt-6 text-center"
          style={{ background: "linear-gradient(180deg, var(--xmas-teal, #1e4d4a), var(--xmas-navy, #0a1830))" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--xmas-gold, #e8b64a)" }}>
            Season&apos;s Greetings
          </p>
          <h2 className="xmas-heading mt-1 text-2xl font-bold sm:text-3xl">Merry Christmas!</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--xmas-cream, #f6ecd9)" }}>
            From all of us at {tenant.name} — enjoy a little festive cheer with your order. 🎁
          </p>
        </div>
      )}
      {tenant.bannerImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tenant.bannerImageUrl}
          alt={`${tenant.name} banner`}
          className="h-40 w-full object-cover sm:h-56"
        />
      )}
      {tenant.menuDocumentUrl && (
        <div className="mx-auto max-w-xl px-4 pt-4">
          <a
            href={tenant.menuDocumentUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-gray-200 bg-white px-3 py-2 text-center text-sm font-medium underline"
            style={{ color: "var(--brand-primary)" }}
          >
            View full menu ({tenant.menuDocumentType === "pdf" ? "PDF" : "photo"}) ↗
          </a>
        </div>
      )}
      {(tenant.googleRating || tenant.googleReviewUrl || tenant.instagramUrl || tenant.facebookUrl) && (
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pt-3 text-sm">
          {tenant.googleRating != null && (
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <span aria-hidden>⭐</span>
              {tenant.googleRating.toFixed(1)}
              {tenant.googleReviewCount != null && (
                <span className="text-gray-500">({tenant.googleReviewCount} reviews)</span>
              )}
            </span>
          )}
          {tenant.googleReviewUrl && (
            <a
              href={tenant.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 underline"
              style={{ color: "var(--brand-primary)" }}
            >
              <GoogleIcon className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-sm" />
              Rate us on Google
            </a>
          )}
          {tenant.instagramUrl && (
            <a
              href={tenant.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              title="Instagram"
            >
              <InstagramIcon className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 hover:shadow-md" />
            </a>
          )}
          {tenant.facebookUrl && (
            <a
              href={tenant.facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              title="Facebook"
            >
              <FacebookIcon className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 hover:shadow-md" />
            </a>
          )}
        </div>
      )}
      <MenuBrowser categories={categories} />
    </>
  );
}
