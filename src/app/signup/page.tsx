import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SignupForm } from "@/components/signup-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SetupSteps } from "@/components/setup-steps";
import { TRIAL_DAYS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Start a 7-day free trial of BhojSetu — no credit card required. Menu, QR ordering, and an order dashboard in minutes.",
  alternates: { canonical: "/signup" },
};

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
        <SetupSteps current={1} />
        <h1 className="mb-1 mt-5 text-xl font-semibold text-gray-900">Create your account</h1>
        <p className="mb-6 text-sm text-gray-500">
          Start your {TRIAL_DAYS}-day free trial. Next you&apos;ll add your menu, then set your branding — then you&apos;re ready to take orders.
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
