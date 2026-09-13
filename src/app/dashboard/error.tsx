"use client";

import Link from "next/link";

/**
 * Catches ANY error thrown while rendering a /dashboard/* page — originally
 * written assuming the only realistic cause was requireOwnerSession()
 * rejecting a staff account on an owner-only page (the nav already hides
 * those links from staff, so that's a defense-in-depth path, not the normal
 * way anyone reaches this). That assumption was wrong: Next.js redacts the
 * real message/type of a server-thrown error before it reaches this
 * client-side boundary in production (a deliberate security measure — it
 * strips server details from what the browser sees), so this boundary has
 * no real way to tell "wrong role" apart from an unrelated crash (hit for
 * real: a genuine owner account got told "only available to the restaurant
 * owner" for what was actually an unrelated server error). Showing a
 * generic message instead of asserting a specific, possibly-wrong cause.
 */
export default function DashboardError() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold text-gray-900">Something went wrong</p>
      <p className="text-sm text-gray-500">
        This could be a permissions issue (some sections are owner-only) or a temporary error.
        Try going back and reloading — if it keeps happening, contact support.
      </p>
      <Link href="/dashboard" className="text-sm font-medium text-gray-900 underline">
        Back to Orders
      </Link>
    </div>
  );
}
