import Link from "next/link";
import { SetupSteps } from "@/components/setup-steps";

type Props = {
  menuDone: boolean;
  brandingDone: boolean;
  trialDaysLeft: number | null;
  /** True once the owner has clicked "Skip for now" — see Tenant.onboardingDismissedAt. */
  dismissed: boolean;
  dismissAction: () => Promise<void>;
};

/** Getting-started checklist (owner only, until menu + branding are done, or the owner skips it) and trial countdown. */
export function OnboardingBanner({ menuDone, brandingDone, trialDaysLeft, dismissed, dismissAction }: Props) {
  const showChecklist = !dismissed && (!menuDone || !brandingDone);
  if (!showChecklist && trialDaysLeft === null) return null;
  const current: 2 | 3 = menuDone ? 3 : 2;

  return (
    <div className="mb-4 flex flex-col gap-3 print:hidden">
      {trialDaysLeft !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-900 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200">
          <span>
            {trialDaysLeft > 0
              ? `Free trial: ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left. No card needed until you subscribe.`
              : "Your free trial ends today."}
          </span>
          <Link href="/dashboard/billing" className="font-semibold underline">
            View plans
          </Link>
        </div>
      )}
      {showChecklist && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <SetupSteps current={current} />
            </div>
            <form action={dismissAction}>
              <button type="submit" className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-700 hover:underline dark:text-gray-400">
                Skip for now
              </button>
            </form>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            <li className="text-gray-500">✓ Account created</li>
            <li>
              {menuDone ? (
                <span className="text-gray-500">✓ Menu added</span>
              ) : (
                <Link href="/dashboard/menu" className="font-medium text-indigo-600 hover:underline">
                  → Add your menu items (or load a sample menu)
                </Link>
              )}
            </li>
            <li>
              {brandingDone ? (
                <span className="text-gray-500">✓ Branding set</span>
              ) : (
                <Link href="/dashboard/branding" className="font-medium text-indigo-600 hover:underline">
                  → Set your logo, tagline and colours
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
