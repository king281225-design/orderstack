"use client";

import { useState, useTransition } from "react";
import {
  setTenantStatusAction,
  setTenantSubscriptionOverrideAction,
  setTenantTrialDaysAction,
  setTenantFeatureOverrideAction,
  startManagingTenantAction,
} from "@/app/super-admin/actions";
import {
  trialState,
  TRIAL_DAYS,
  TRIAL_DAYS_MIN,
  TRIAL_DAYS_MAX,
  ALL_FEATURES,
  FEATURE_LABELS,
  PLAN_DEFINITIONS,
  tierHasFeature,
  defaultTierFor,
  parseFeatureOverrides,
  type Feature,
} from "@/lib/plans";
import type { PlanTier, SubscriptionStatus, TenantStatus } from "@prisma/client";

/** Shared sizing so every dropdown/button in the super-admin table has the same real tap target. */
const TOUCH = "min-h-9 touch-manipulation cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-none disabled:cursor-wait disabled:opacity-60";

const ACCESS_TONE: Record<"full" | "trial" | "ended", string> = {
  full: "border-green-300 bg-green-100 text-green-700",
  trial: "border-amber-300 bg-amber-100 text-amber-800",
  ended: "border-red-300 bg-red-100 text-red-700",
};

/**
 * Manual override of the "has this tenant ever paid" signal — bypasses the
 * 7-day dashboard trial gate (src/proxy.ts) without a real Razorpay payment.
 * A real dropdown (not a single toggle button) so the super-admin picks the
 * state directly: "Normal" lets the trial clock (src/lib/plans.ts) run as
 * usual, "Full access" force-grants it regardless of trial/payment status.
 * Kept separate from real subscription state — see
 * setTenantSubscriptionOverride's own comment. The helper line underneath
 * always shows where the tenant actually stands (days left / ended / why
 * it's full) so nothing is hidden behind the selected option alone.
 */
export function AccessSelect({
  tenantId,
  subscriptionStatus,
  createdAt,
  now,
  trialDays,
}: {
  tenantId: string;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Date;
  now: number;
  trialDays?: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const state = trialState(createdAt, subscriptionStatus, now, trialDays);
  const tone = state.kind === "full" ? "full" : state.kind === "trial" ? "trial" : "ended";
  const helper = state.kind === "full" ? "Manual override" : state.kind === "trial" ? `Trial · ${state.daysLeft}d left` : "Trial ended";

  return (
    <div className="flex flex-col items-start gap-0.5">
      <select
        value={subscriptionStatus === "ACTIVE" ? "FULL" : "NORMAL"}
        disabled={isPending}
        aria-label="Access override"
        title="Grant or remove full access regardless of the trial/payment status"
        onChange={(e) => {
          const grantFull = e.target.value === "FULL";
          startTransition(async () => {
            await setTenantSubscriptionOverrideAction(tenantId, grantFull);
          });
        }}
        className={`${TOUCH} border ${ACCESS_TONE[tone]}`}
      >
        <option value="NORMAL">Normal (trial gate)</option>
        <option value="FULL">Full access (override)</option>
      </select>
      <span className="text-[11px] text-gray-500">{isPending ? "Saving…" : helper}</span>
    </div>
  );
}

/** Common presets for the trial-length dropdown; the tenant's current value is inserted if it isn't one of these. */
const TRIAL_PRESETS = [3, 7, 14, 15, 21, 30, 45, 60, 90, 180];
const CUSTOM = "custom";

/**
 * Per-tenant override of the free trial length (Tenant.trialDays — see
 * trialMsFor/trialState in src/lib/plans.ts, read by both the dashboard gate
 * in src/proxy.ts and the owner dashboard's own "N days left" banner). A
 * dropdown of common lengths plus "Custom…" for anything else, so the
 * super-admin can give one restaurant more runway without touching every
 * tenant's trial.
 */
export function TrialDaysSelect({ tenantId, trialDays }: { tenantId: string; trialDays: number | null }) {
  const [isPending, startTransition] = useTransition();
  const current = trialDays ?? TRIAL_DAYS;
  const options = TRIAL_PRESETS.includes(current) ? TRIAL_PRESETS : [...TRIAL_PRESETS, current].sort((a, b) => a - b);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState(String(current));

  function save(days: number) {
    if (!Number.isFinite(days) || days <= 0) return;
    const clamped = Math.min(TRIAL_DAYS_MAX, Math.max(TRIAL_DAYS_MIN, Math.round(days)));
    startTransition(async () => {
      await setTenantTrialDaysAction(tenantId, clamped);
    });
  }

  if (customOpen) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          save(Number(customValue));
          setCustomOpen(false);
        }}
      >
        <input
          type="number"
          min={TRIAL_DAYS_MIN}
          max={TRIAL_DAYS_MAX}
          value={customValue}
          autoFocus
          aria-label="Custom trial length in days"
          title="Trial length in days"
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={() => {
            save(Number(customValue));
            setCustomOpen(false);
          }}
          className={`${TOUCH} w-16 border border-gray-300 bg-white dark:bg-[#241d17]`}
        />
        <span className="text-[11px] text-gray-500">days</span>
      </form>
    );
  }

  return (
    <select
      value={current}
      disabled={isPending}
      aria-label="Trial length"
      title="How many days of dashboard access this tenant gets before the trial gate kicks in"
      onChange={(e) => {
        if (e.target.value === CUSTOM) {
          setCustomValue(String(current));
          setCustomOpen(true);
          return;
        }
        save(Number(e.target.value));
      }}
      className={`${TOUCH} w-full border border-gray-300 bg-white dark:bg-[#241d17]`}
    >
      {options.map((d) => (
        <option key={d} value={d}>
          {d} day{d === 1 ? "" : "s"}
          {d === TRIAL_DAYS ? " (default)" : ""}
        </option>
      ))}
      <option value={CUSTOM}>Custom…</option>
    </select>
  );
}

const STATUS_TONE: Record<TenantStatus, string> = {
  ACTIVE: "border-green-300 bg-green-100 text-green-700",
  SUSPENDED: "border-gray-300 bg-gray-200 text-gray-700",
};

/** Active/Suspended as a real dropdown — picking "Suspended" locks the owner out immediately. */
export function StatusSelect({ tenantId, status }: { tenantId: string; status: TenantStatus }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      value={status}
      disabled={isPending}
      aria-label="Restaurant status"
      title="Suspending blocks the owner's dashboard and the public storefront"
      onChange={(e) => {
        const next = e.target.value as TenantStatus;
        startTransition(async () => {
          await setTenantStatusAction(tenantId, next);
        });
      }}
      className={`${TOUCH} border ${STATUS_TONE[status]}`}
    >
      <option value="ACTIVE">Active</option>
      <option value="SUSPENDED">Suspended</option>
    </select>
  );
}

/** Where "Manage" may jump to — bound server-side too (MANAGE_LANDING_PATHS in actions.ts); this is just the menu copy. */
const MANAGE_DESTINATIONS: { value: string; label: string }[] = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/dashboard/orders", label: "Orders" },
  { value: "/dashboard/menu", label: "Menu" },
  { value: "/dashboard/branding", label: "Branding & settings" },
  { value: "/dashboard/billing", label: "Billing" },
  { value: "/dashboard/analytics", label: "Analytics" },
  { value: "/dashboard/inventory", label: "Inventory" },
  { value: "/dashboard/tables", label: "Tables" },
  { value: "/dashboard/staff", label: "Staff" },
  { value: "/dashboard/coupons", label: "Coupons" },
];

/**
 * Opens the restaurant's real dashboard as its owner (see
 * startManagingTenantAction) — one dropdown instead of a row of buttons, so
 * every section is one tap away. Picking an option jumps immediately; it's
 * a "go here now" menu, not a persisted setting, so it stays uncontrolled.
 */
export function ManageSelect({ tenantId }: { tenantId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      key={isPending ? "pending" : "idle"}
      defaultValue=""
      disabled={isPending}
      aria-label="Manage this restaurant"
      title="Open this restaurant's dashboard as its owner"
      onChange={(e) => {
        const dest = e.target.value;
        if (!dest) return;
        startTransition(async () => {
          await startManagingTenantAction(tenantId, dest);
        });
      }}
      className={`${TOUCH} w-full border border-indigo-300 bg-indigo-50 font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40`}
    >
      <option value="" disabled>
        {isPending ? "Opening…" : "Manage ▾"}
      </option>
      {MANAGE_DESTINATIONS.map((d) => (
        <option key={d.value} value={d.value}>
          → {d.label}
        </option>
      ))}
    </select>
  );
}

type FeatureMode = "default" | "on" | "off";

const FEATURE_MODE_TONE: Record<FeatureMode, string> = {
  default: "border-gray-300 bg-white dark:bg-[#241d17]",
  on: "border-green-300 bg-green-100 text-green-700",
  off: "border-red-300 bg-red-100 text-red-700",
};

/**
 * One feature's row in FeatureOverridesPanel below: "Default" follows
 * whatever the plan tier normally grants; "Force on"/"Force off" override it
 * regardless of tier — this is the actual "add/remove anything from the
 * plan" control, per-tenant (Tenant.featureOverrides, see tenantHasFeature
 * in src/lib/plans.ts).
 */
function FeatureOverrideRow({
  tenantId,
  feature,
  planTier,
  mode,
}: {
  tenantId: string;
  feature: Feature;
  planTier: PlanTier;
  mode: FeatureMode;
}) {
  const [isPending, startTransition] = useTransition();
  const includedByDefault = tierHasFeature(planTier, feature);
  const minTier = defaultTierFor(feature);

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 dark:border-white/10">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium text-gray-900">{FEATURE_LABELS[feature]}</span>
        <span className="text-[11px] text-gray-500">
          {includedByDefault ? `Included on ${PLAN_DEFINITIONS[planTier].label}` : `Normally ${PLAN_DEFINITIONS[minTier].label}+`}
        </span>
      </div>
      <select
        value={mode}
        disabled={isPending}
        aria-label={`${FEATURE_LABELS[feature]} override`}
        title="Default follows the plan tier; Force on/off always wins regardless of tier"
        onChange={(e) => {
          const next = e.target.value as FeatureMode;
          startTransition(async () => {
            await setTenantFeatureOverrideAction(tenantId, feature, next);
          });
        }}
        className={`${TOUCH} shrink-0 border ${FEATURE_MODE_TONE[mode]}`}
      >
        <option value="default">Default</option>
        <option value="on">Force on</option>
        <option value="off">Force off</option>
      </select>
    </div>
  );
}

/**
 * Full per-tenant feature grant/revoke panel — one row per Feature (see
 * ALL_FEATURES in src/lib/plans.ts), each independently overridable. This is
 * what lets a Starter restaurant get, say, Analytics without a full plan
 * upgrade, or a Business restaurant lose one feature without downgrading.
 */
export function FeatureOverridesPanel({
  tenantId,
  planTier,
  featureOverrides,
}: {
  tenantId: string;
  planTier: PlanTier;
  featureOverrides: unknown;
}) {
  const overrides = parseFeatureOverrides(featureOverrides);
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {ALL_FEATURES.map((feature) => (
        <FeatureOverrideRow
          key={feature}
          tenantId={tenantId}
          feature={feature}
          planTier={planTier}
          mode={feature in overrides ? (overrides[feature] ? "on" : "off") : "default"}
        />
      ))}
    </div>
  );
}
