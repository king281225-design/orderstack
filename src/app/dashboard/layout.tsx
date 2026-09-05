import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { logoutAction } from "@/app/logout/actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "STAFF") || !session.tenantId) {
    redirect("/login");
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">{tenant.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                tenant.isOpen ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
              }`}
            >
              {tenant.isOpen ? "Open" : "Closed"}
            </span>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-4 px-4 pb-2 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Orders
          </Link>
          <Link href="/dashboard/menu" className="text-gray-600 hover:text-gray-900">
            Menu
          </Link>
          <Link href="/dashboard/branding" className="text-gray-600 hover:text-gray-900">
            Branding
          </Link>
          <Link href="/dashboard/coupons" className="text-gray-600 hover:text-gray-900">
            Coupons
          </Link>
          <a
            href={`/r/${tenant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-gray-600 hover:text-gray-900"
          >
            View storefront ↗
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
