import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/data/tenants";
import { listPublicMenu } from "@/lib/data/menu";
import { MenuBrowser } from "@/components/storefront/menu-browser";

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

  return <MenuBrowser categories={categories} />;
}
