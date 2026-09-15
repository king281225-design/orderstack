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
        <BhojSetuLogo height={36} className="mb-1" priority />
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
