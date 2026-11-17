import { trialMsFor } from "@/lib/plans";

/**
 * Trial-to-paid email follow-up schedule. Pure (no DB, no email) so the
 * timing rules can be tested on their own — the cron route wires it up.
 *
 * Every step is anchored either to signup ("start") or to the end of that
 * tenant's own trial ("end", which honours the super-admin's per-tenant
 * trialDays override). The sequence keeps going after the trial ends until
 * the restaurant pays, then stops for good (a paid tenant is filtered out by
 * the query) — and it always ends: the last step says so, and the owner can
 * opt out at any point with the unsubscribe link in every email.
 */
export type TrialFollowUpStepId =
  | "setup_menu"
  | "first_orders"
  | "two_days_left"
  | "trial_ended"
  | "welcome_offer"
  | "need_help"
  | "plans_recap"
  | "last_note";

export const TRIAL_FOLLOW_UP_STEPS: {
  id: TrialFollowUpStepId;
  anchor: "start" | "end";
  /** Days after (or, if negative, before) the anchor. */
  offsetDays: number;
}[] = [
  { id: "setup_menu", anchor: "start", offsetDays: 1 },
  { id: "first_orders", anchor: "start", offsetDays: 3 },
  { id: "two_days_left", anchor: "end", offsetDays: -2 },
  { id: "trial_ended", anchor: "end", offsetDays: 0 },
  { id: "welcome_offer", anchor: "end", offsetDays: 3 },
  { id: "need_help", anchor: "end", offsetDays: 7 },
  { id: "plans_recap", anchor: "end", offsetDays: 14 },
  { id: "last_note", anchor: "end", offsetDays: 30 },
];

export const TRIAL_FOLLOW_UP_LABELS: Record<TrialFollowUpStepId, string> = {
  setup_menu: "Set up your menu",
  first_orders: "Get your first order",
  two_days_left: "2 days left",
  trial_ended: "Trial ended",
  welcome_offer: "₹100 welcome offer",
  need_help: "Need help?",
  plans_recap: "Plans recap",
  last_note: "Last note",
};

/** A step that is overdue by more than this is skipped rather than sent late. */
export const TRIAL_FOLLOW_UP_STALE_DAYS = 6;

const DAY_MS = 86_400_000;

export function followUpDueAt(
  stepIndex: number,
  createdAt: Date,
  trialDays: number | null | undefined,
): Date {
  const step = TRIAL_FOLLOW_UP_STEPS[stepIndex];
  const base =
    step.anchor === "start" ? createdAt.getTime() : createdAt.getTime() + trialMsFor(trialDays);
  return new Date(base + step.offsetDays * DAY_MS);
}

export type FollowUpDecision =
  | { action: "none" }
  /** Due step is far overdue (e.g. a long-dormant signup): record progress, send nothing. */
  | { action: "skip"; toStep: number }
  | { action: "send"; stepIndex: number };

/**
 * `sentSteps` = how many steps were already handled (Tenant.trialFollowUpStep).
 * At most one email per run: if several steps became due at once (e.g. a very
 * short trial, or the cron missed days) only the latest due one is sent, so a
 * restaurant never gets a burst.
 */
export function decideFollowUp(
  createdAt: Date,
  trialDays: number | null | undefined,
  sentSteps: number,
  now: Date,
): FollowUpDecision {
  let latestDue = -1;
  for (let i = sentSteps; i < TRIAL_FOLLOW_UP_STEPS.length; i++) {
    if (followUpDueAt(i, createdAt, trialDays).getTime() <= now.getTime()) latestDue = i;
  }
  if (latestDue === -1) return { action: "none" };
  const overdueMs = now.getTime() - followUpDueAt(latestDue, createdAt, trialDays).getTime();
  if (overdueMs > TRIAL_FOLLOW_UP_STALE_DAYS * DAY_MS) return { action: "skip", toStep: latestDue + 1 };
  return { action: "send", stepIndex: latestDue };
}
