import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/data/tenants";
import { listPublicMenu } from "@/lib/data/menu";
import { MenuBrowser } from "@/components/storefront/menu-browser";
import { CaptureTableParam } from "@/components/storefront/capture-table-param";

export const dynamic = "force-dynamic";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();

  const categories = await listPublicMenu(tenant.id);

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
      <MenuBrowser categories={categories} />
    </>
  );
}
