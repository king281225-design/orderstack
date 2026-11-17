"use client";

import { useActionState, useRef } from "react";
import { updateBrandingAction, type BrandingState } from "@/app/dashboard/branding/actions";
import type { Tenant } from "@prisma/client";

const initialState: BrandingState = { error: null, success: false };

// One-click color bundles on top of the 5 manual pickers below — picking one
// just fills in those same 5 fields (via the refs below), it doesn't replace
// or bypass manual editing, and nothing is saved until "Save changes" runs.
const THEME_PRESETS = [
  { name: "Classic", primary: "#111827", secondary: "#f97316", accent: "#ffffff", headerText: "#ffffff", cardBg: "#ffffff" },
  { name: "Elegant Dark", primary: "#1a1a2e", secondary: "#e94560", accent: "#0f0f1a", headerText: "#ffffff", cardBg: "#16213e" },
  { name: "Minimal White", primary: "#ffffff", secondary: "#2d2d2d", accent: "#fafafa", headerText: "#1a1a1a", cardBg: "#ffffff" },
  { name: "Festive Warm", primary: "#7a1f1f", secondary: "#d4af37", accent: "#fff8ee", headerText: "#fff8ee", cardBg: "#fffaf2" },
  { name: "Street Vibrant", primary: "#ff5722", secondary: "#ffc107", accent: "#fff3e0", headerText: "#ffffff", cardBg: "#ffffff" },
] as const;

export function BrandingForm({ tenant }: { tenant: Tenant }) {
  const [state, formAction, pending] = useActionState(updateBrandingAction, initialState);

  const primaryRef = useRef<HTMLInputElement>(null);
  const secondaryRef = useRef<HTMLInputElement>(null);
  const accentRef = useRef<HTMLInputElement>(null);
  const headerTextRef = useRef<HTMLInputElement>(null);
  const cardBgRef = useRef<HTMLInputElement>(null);

  function applyPreset(preset: (typeof THEME_PRESETS)[number]) {
    if (primaryRef.current) primaryRef.current.value = preset.primary;
    if (secondaryRef.current) secondaryRef.current.value = preset.secondary;
    if (accentRef.current) accentRef.current.value = preset.accent;
    if (headerTextRef.current) headerTextRef.current.value = preset.headerText;
    if (cardBgRef.current) cardBgRef.current.value = preset.cardBg;
  }

  return (
    <form
      action={formAction}
      className="flex max-w-lg flex-col gap-4 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Restaurant name
        <input
          name="name"
          defaultValue={tenant.name}
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Tagline
        <input
          name="tagline"
          defaultValue={tenant.tagline ?? ""}
          placeholder="e.g. Home-style food, made fresh daily"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Logo
        {tenant.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.logoUrl} alt="Current logo" className="h-16 w-16 rounded object-cover" />
        )}
        <input name="logo" type="file" accept="image/*" className="text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Banner image
        {tenant.bannerImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.bannerImageUrl} alt="Current banner" className="h-24 w-full rounded object-cover" />
        )}
        <input name="bannerImage" type="file" accept="image/*" className="text-sm" />
        {tenant.bannerImageUrl && (
          <span className="flex items-center gap-1.5 text-xs font-normal text-gray-500">
            <input type="checkbox" name="removeBannerImage" />
            Remove current banner
          </span>
        )}
        <span className="text-xs font-normal text-gray-400">
          A wide photo shown at the top of your menu page (e.g. your restaurant front, or a signature dish)
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        Menu background image
        {tenant.backgroundImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tenant.backgroundImageUrl}
            alt="Current background"
            className="h-24 w-full rounded object-cover"
          />
        )}
        <input name="backgroundImage" type="file" accept="image/*" className="text-sm" />
        {tenant.backgroundImageUrl && (
          <span className="flex items-center gap-1.5 text-xs font-normal text-gray-500">
            <input type="checkbox" name="removeBackgroundImage" />
            Remove current background
          </span>
        )}
        <span className="text-xs font-normal text-gray-400">
          Shown faintly behind your whole menu page — pick something subtle so item text stays easy to read
        </span>
      </label>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-700">Menu colors</p>
        <p className="-mt-1 text-xs text-gray-500">
          Used across your storefront &amp; menu page — see the caption under each for exactly
          where.
        </p>

        <div className="mb-1 flex flex-col gap-1.5">
          <p className="text-xs font-medium text-gray-500">
            Quick themes — fills in the 5 colors below, then Save to apply
          </p>
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-1.5 rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-gray-400"
              >
                <span className="flex h-3.5 w-3.5 overflow-hidden rounded-full border border-black/10">
                  <span className="h-full w-1/2" style={{ backgroundColor: preset.primary }} />
                  <span className="h-full w-1/2" style={{ backgroundColor: preset.secondary }} />
                </span>
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Primary
            <input
              ref={primaryRef}
              name="colorPrimary"
              type="color"
              defaultValue={tenant.colorPrimary}
              className="h-9 w-full rounded-md border border-gray-300"
            />
            <span className="text-xs font-normal text-gray-400">Header banner, buttons</span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Secondary
            <input
              ref={secondaryRef}
              name="colorSecondary"
              type="color"
              defaultValue={tenant.colorSecondary}
              className="h-9 w-full rounded-md border border-gray-300"
            />
            <span className="text-xs font-normal text-gray-400">Category accents, price tags</span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Page background
            <input
              ref={accentRef}
              name="colorAccent"
              type="color"
              defaultValue={tenant.colorAccent}
              className="h-9 w-full rounded-md border border-gray-300"
            />
            <span className="text-xs font-normal text-gray-400">Behind everything</span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Header text
            <input
              ref={headerTextRef}
              name="colorHeaderText"
              type="color"
              defaultValue={tenant.colorHeaderText}
              className="h-9 w-full rounded-md border border-gray-300"
            />
            <span className="text-xs font-normal text-gray-400">
              Your name/tagline on the banner — pick dark text if Primary above is light
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Menu card background
            <input
              ref={cardBgRef}
              name="colorCardBackground"
              type="color"
              defaultValue={tenant.colorCardBackground}
              className="h-9 w-full rounded-md border border-gray-300"
            />
            <span className="text-xs font-normal text-gray-400">Behind each menu item</span>
          </label>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        UPI ID (for the payment QR code)
        <input
          name="upiId"
          defaultValue={tenant.upiId ?? ""}
          placeholder="yourrestaurant@upi"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Merchant name on UPI (optional)
          <input
            name="upiPayeeName"
            defaultValue={tenant.upiPayeeName ?? ""}
            maxLength={80}
            placeholder={tenant.name}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          UPI provider (optional)
          <input
            name="upiProviderName"
            defaultValue={tenant.upiProviderName ?? ""}
            maxLength={60}
            placeholder="Paytm, Google Pay, bank…"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-gray-500">
        A UPI QR can&apos;t confirm payment by itself. When money reaches your account, open the order and tap
        &ldquo;Mark paid&rdquo;, then pick where it came from (Paytm, Google Pay, PhonePe…).
      </p>

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-900">Reviews &amp; social (shown on your menu page)</p>
        <p className="-mt-2 text-xs text-gray-500">
          There&apos;s no live-syncing Google widget here — enter your own rating and a link to
          your Google Business page, and update it yourself whenever it changes.
        </p>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Google review link
          <input
            name="googleReviewUrl"
            type="url"
            defaultValue={tenant.googleReviewUrl ?? ""}
            placeholder="https://g.page/r/your-restaurant/review"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Rating (0–5)
            <input
              name="googleRating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              defaultValue={tenant.googleRating ?? ""}
              placeholder="4.5"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Number of reviews
            <input
              name="googleReviewCount"
              type="number"
              min="0"
              step="1"
              defaultValue={tenant.googleReviewCount ?? ""}
              placeholder="230"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Instagram link
          <input
            name="instagramUrl"
            type="url"
            defaultValue={tenant.instagramUrl ?? ""}
            placeholder="https://instagram.com/yourrestaurant"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Facebook link
          <input
            name="facebookUrl"
            type="url"
            defaultValue={tenant.facebookUrl ?? ""}
            placeholder="https://facebook.com/yourrestaurant"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
