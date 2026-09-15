import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { BhojSetuLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-[#0f0b08] dark:via-[#1a120c] dark:to-[#3d1c05] px-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white dark:bg-[#241d17] p-8 shadow-sm">
        {/* site-logo.png's "Bhoj" lettering is dark brown/near-black —
            fine on a white card, invisible against this same card's
            dark-mode background. A small light chip behind it keeps it
            legible instead of changing the card's own background (same
            fix already used in super-admin/layout.tsx). */}
        <span className="mb-1 inline-block rounded-md bg-white/95 px-2 py-1">
          <BhojSetuLogo height={36} priority />
        </span>
        <p className="mb-6 text-sm text-gray-500">
          Sign in to manage your restaurant or the platform.
        </p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-gray-500">
          New restaurant?{" "}
          <Link href="/signup" className="font-medium text-gray-900 hover:underline">
            Set up your storefront
          </Link>
        </p>
      </div>
    </div>
  );
}
