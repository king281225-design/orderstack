import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { logoutAction } from "@/app/logout/actions";
import { countActiveTickets } from "@/lib/data/support";
import { BhojSetuLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const activeTickets = await countActiveTickets();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50 dark:from-[#0f0b08] dark:via-[#1a120c] dark:to-[#3d1c05]">
      <header className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 shadow-md dark:from-indigo-800 dark:via-indigo-800 dark:to-violet-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="inline-flex items-center gap-2 font-semibold text-white">
            {/* The logo's wordmark colors are baked into the image (dark
                brown "Bhoj"), which reads poorly directly on this orange
                header gradient — a small light chip behind it keeps it
                legible instead of changing the header's own background. */}
            <span className="rounded-md bg-white/95 px-2 py-1">
              <BhojSetuLogo height={22} />
            </span>
            <span className="text-white/50">·</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
              Super Admin
            </span>
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle variant="header" />
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-white/80 hover:text-white">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <nav className="mx-auto flex max-w-5xl gap-2 px-4 pt-4 text-sm" aria-label="Super admin">
        <Link href="/super-admin" className="rounded-full border border-gray-300 bg-white px-3 py-1 text-gray-700 hover:border-indigo-400 dark:bg-[#241d17]">
          Restaurants
        </Link>
        <Link href="/super-admin/support" className="rounded-full border border-gray-300 bg-white px-3 py-1 text-gray-700 hover:border-indigo-400 dark:bg-[#241d17]">
          Support
          {activeTickets > 0 && (
            <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">{activeTickets}</span>
          )}
        </Link>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
