"use client";

import Link from "next/link";

/**
 * Catches requireOwnerSession() throwing when a staff account hits an
 * owner-only page directly by URL (the nav already hides these links from
 * staff, so this is a defense-in-depth path, not the normal way anyone
 * reaches this). Without this, Next's default error boundary would show a
 * raw "Application error" page instead.
 */
export default function DashboardError() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold text-gray-900">You don&apos;t have access to this page</p>
      <p className="text-sm text-gray-500">This section is only available to the restaurant owner.</p>
      <Link href="/dashboard" className="text-sm font-medium text-gray-900 underline">
        Back to Orders
      </Link>
    </div>
  );
}
