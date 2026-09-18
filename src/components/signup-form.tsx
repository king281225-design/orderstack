"use client";

import { useActionState, useEffect, useState } from "react";
import { signupAction, type SignupState } from "@/app/signup/actions";

const initialState: SignupState = { error: null };

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
type SlugResult = { slug: string; status: "available" | "taken" | "invalid" | "error" };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugResult, setSlugResult] = useState<SlugResult | null>(null);

  const slugFormatOk = slug.length >= 2 && slug.length <= 60 && SLUG_RE.test(slug);
  const slugStatus: "idle" | "invalid" | "checking" | SlugResult["status"] = !slug
    ? "idle"
    : !slugFormatOk
      ? "invalid"
      : slugResult?.slug === slug
        ? slugResult.status
        : "checking";

  useEffect(() => {
    if (!slugFormatOk) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/slug-check?slug=${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { status: SlugResult["status"] };
        setSlugResult({ slug, status: res.ok ? data.status : "error" });
      } catch {
        if (!controller.signal.aborted) setSlugResult({ slug, status: "error" });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, slugFormatOk]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="restaurantName" className="text-sm font-medium text-gray-700">
          Restaurant name
        </label>
        <input
          id="restaurantName"
          name="restaurantName"
          required
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium text-gray-700">
          Storefront link
        </label>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span className="whitespace-nowrap">yourplatform.com/r/</span>
          <input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9]+(\-[a-z0-9]+)*"
            minLength={2}
            maxLength={60}
            aria-describedby="slug-status"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none"
          />
        </div>
        <p id="slug-status" aria-live="polite" className="min-h-4 text-xs">
          {slugStatus === "checking" && <span className="text-gray-500">Checking availability…</span>}
          {slugStatus === "available" && (
            <span className="font-medium text-green-600">✓ {slug} is available</span>
          )}
          {slugStatus === "taken" && (
            <span className="text-red-600">
              ✗ That link is taken.{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => {
                  setSlugTouched(true);
                  setSlug(`${slug}-2`.slice(0, 60));
                }}
              >
                Try {slug}-2
              </button>
            </span>
          )}
          {slugStatus === "invalid" && (
            <span className="text-amber-600">Use lowercase letters, numbers and single hyphens (at least 2 characters).</span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Your email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || slugStatus === "taken" || slugStatus === "invalid"}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Creating your restaurant…" : "Start my 7-day free trial"}
      </button>
      <p className="text-center text-xs text-gray-500">
        No credit card required · Takes about 10 minutes · Cancel anytime
      </p>
    </form>
  );
}
