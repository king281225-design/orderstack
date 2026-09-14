import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { BhojSetuLogo } from "@/components/brand/logo";

export default async function ForgotPasswordPage() {
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
          Enter your account email and we&apos;ll send you a link to reset your password.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
