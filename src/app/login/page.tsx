import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { BhojSetuLogo } from "@/components/brand/logo";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <BhojSetuLogo
          markSize={32}
          textClassName="text-xl font-semibold text-gray-900"
          className="mb-1"
        />
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
