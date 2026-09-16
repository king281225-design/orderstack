import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/data/tenants";
import { listPublicMenu } from "@/lib/data/menu";
import { MenuBrowser } from "@/components/storefront/menu-browser";
import { CaptureTableParam } from "@/components/storefront/capture-table-param";
import { InstagramIcon, FacebookIcon, GoogleIcon } from "@/components/storefront/social-icons";

export const dynamic = "force-dynamic";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();

  const rawCategories = await listPublicMenu(tenant.id);
  // Prisma's Json columns (tags/variants) come back typed as generic
  // JsonValue — cast to the shapes createItem/updateItem actually ever
  // write (see menu-import wizard's publish action), rather than widening
  // MenuBrowser's own prop types to accept arbitrary JSON.
  const toPublicItems = (items: (typeof rawCategories)[number]["items"]) =>
    items.map((item) => ({
      ...item,
      tags: (item.tags as string[] | null) ?? null,
      variants: (item.variants as { label: string; priceCents: number }[] | null) ?? null,
    }));
  const categories = rawCategories.map((c) => ({
    ...c,
    items: toPublicItems(c.items),
    subcategories: c.subcategories.map((sc) => ({ ...sc, items: toPublicItems(sc.items) })),
  }));

  return (
    <>
      <Suspense fallback={null}>
        <CaptureTableParam />
      </Suspense>
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
