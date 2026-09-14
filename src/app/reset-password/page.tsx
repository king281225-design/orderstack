import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { checkPasswordResetToken, type ResetTokenCheck } from "@/lib/data/password-reset";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { BhojSetuLogo } from "@/components/brand/logo";

const INVALID_MESSAGES: Record<"invalid" | "expired" | "used", string> = {
  invalid: "This reset link isn't valid.",
  expired: "This reset link has expired.",
  used: "This reset link has already been used.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect(session.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard");
  }

  const { token } = await searchParams;
  // This is only a page-load convenience so we don't render a form for an
  // obviously dead link — resetPasswordAction re-validates the token from
  // scratch server-side regardless, never trusting this check alone.
  const check: ResetTokenCheck | null = token ? await checkPasswordResetToken(token) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <BhojSetuLogo
          markSize={32}
          textClassName="text-xl font-semibold text-gray-900"
          className="mb-1"
        />
        {check?.valid && token ? (
          <>
            <p className="mb-6 text-sm text-gray-500">Choose a new password for your account.</p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-600">
              {INVALID_MESSAGES[check && !check.valid ? check.reason : "invalid"]}
            </p>
            <Link
              href="/forgot-password"
              className="rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Request a new link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
