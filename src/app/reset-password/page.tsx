import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { checkPasswordResetToken, type ResetTokenCheck } from "@/lib/data/password-reset";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { BhojSetuLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-[#0f0b08] dark:via-[#1a120c] dark:to-[#3d1c05] px-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white dark:bg-[#241d17] p-8 shadow-sm">
        {/* light chip behind the logo so its dark "Bhoj" lettering stays
            legible against this card's dark-mode background — see
            login/page.tsx for the full explanation. */}
        <span className="mb-1 inline-block rounded-md bg-white/95 px-2 py-1">
          <BhojSetuLogo height={36} priority />
        </span>
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
