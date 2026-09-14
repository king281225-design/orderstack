import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/logout/actions";
import { BhojSetuLogo } from "@/components/brand/logo";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="inline-flex items-center gap-2 font-semibold text-gray-900">
            <BhojSetuLogo markSize={22} textClassName="font-semibold text-gray-900" />
            <span className="text-gray-400">·</span>
            <span className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              Super Admin
            </span>
          </span>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-gray-500 hover:text-indigo-600">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
