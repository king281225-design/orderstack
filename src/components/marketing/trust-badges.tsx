import Link from "next/link";
import { SslLockIcon, ShieldCheckIcon } from "@/components/marketing/trust-icons";

/**
 * Placed right under the pricing table — the brief's "trust badges near the
 * payment mention" ask. Plain, honest claims only: real SSL (this app is
 * served over https once deployed), the existing real Razorpay integration,
 * and a link to the new Privacy Policy — no invented certifications.
 */
export function TrustBadges() {
  return (
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 pb-16 text-xs text-gray-500">
      <span className="flex items-center gap-1.5">
        <SslLockIcon className="h-4 w-4 text-indigo-500" />
        Secured with SSL encryption
      </span>
      <span className="flex items-center gap-1.5">
        <ShieldCheckIcon className="h-4 w-4 text-indigo-500" />
        Payments secured by Razorpay
      </span>
      <Link href="/privacy" className="flex items-center gap-1.5 hover:text-indigo-600">
        <ShieldCheckIcon className="h-4 w-4 text-indigo-500" />
        Your data stays private — read our Privacy Policy
      </Link>
    </div>
  );
}
