import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/logout/actions";
import { BhojSetuLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

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
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
