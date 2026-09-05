import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenantBySlug } from "@/lib/data/tenants";
import { CartProvider } from "@/lib/cart";
import { CartBar } from "@/components/storefront/cart-bar";

// Always render at request time — this reads live tenant/menu/order data
// from Postgres, which build-time static generation has no access to.
export const dynamic = "force-dynamic";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();

  const themeVars = {
    "--brand-primary": tenant.colorPrimary,
    "--brand-secondary": tenant.colorSecondary,
    "--brand-accent": tenant.colorAccent,
  } as React.CSSProperties;

  return (
    <CartProvider slug={slug}>
      <div style={themeVars} className="flex min-h-screen flex-col bg-[var(--brand-accent)]">
        <header
          className="flex items-center gap-3 px-4 py-4 text-white"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          <Link href={`/r/${slug}`} className="flex items-center gap-3">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt={tenant.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/20" />
            )}
            <div>
              <p className="font-semibold leading-tight">{tenant.name}</p>
              {tenant.tagline && <p className="text-xs text-white/80">{tenant.tagline}</p>}
            </div>
          </Link>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
              tenant.isOpen ? "bg-white/20" : "bg-black/30"
            }`}
          >
            {tenant.isOpen ? "Open now" : "Closed"}
          </span>
        </header>

        <div className="flex-1 pb-20">{children}</div>

        <CartBar slug={slug} isOpen={tenant.isOpen} />
      </div>
    </CartProvider>
  );
}
