import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SignupForm } from "@/components/signup-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-[#0f0b08] dark:via-[#1a120c] dark:to-[#3d1c05] px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white dark:bg-[#241d17] p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Set up your restaurant</h1>
        <p className="mb-6 text-sm text-gray-500">
          Create your account, then build your menu and branding before going live.
        </p>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-gray-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
