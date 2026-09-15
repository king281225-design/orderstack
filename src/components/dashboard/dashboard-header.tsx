"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export type DashboardNavLink = { href: string; label: string };

/**
 * The dashboard's header + nav, as one client component (not split across
 * the server layout) so the hamburger toggle and the two nav renderings
 * (desktop pill row, mobile dropdown) can share one `menuOpen` state — a
 * single component instance is the only way to do that cleanly, since a
 * server component can't hold interactive state itself.
 *
 * Replaces the previous version's single `flex flex-wrap` pill row, which
 * had two real problems on a phone: the top row (avatar + tenant name +
 * status + theme toggle + "Sign out") wrapped awkwardly once the tenant
 * name was more than a few characters, and ~11 nav pills wrapping onto
 * 5-6 lines read as cluttered, not like a real nav. Now the top row always
 * fits (name truncates, a hamburger replaces "Sign out" + the pill row
 * below md), and everything below md collapses into one hamburger-toggled
 * dropdown.
 */
export function DashboardHeader({
  tenantName,
  tenantSlug,
  isOpen,
  links,
  logoutAction,
}: {
  tenantName: string;
  tenantSlug: string;
  isOpen: boolean;
  links: DashboardNavLink[];
  logoutAction: () => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 shadow-md print:hidden dark:from-indigo-800 dark:via-indigo-800 dark:to-violet-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/15 text-xs font-bold text-white">
            {tenantName.charAt(0).toUpperCase()}
          </span>
          <span className="truncate font-semibold text-white">{tenantName}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              isOpen ? "bg-white/90 text-green-700" : "bg-black/20 text-white/80"
            }`}
          >
            {isOpen ? "Open" : "Closed"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle variant="header" />
          <form action={logoutAction} className="hidden md:block">
            <button type="submit" className="text-sm text-white/80 hover:text-white">
              Sign out
            </button>
          </form>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="grid size-8 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white md:hidden"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Desktop nav — the original pill row, unchanged, md and up only */}
      <nav className="mx-auto hidden max-w-5xl flex-wrap gap-1 px-4 pb-2 text-sm md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
        <a
          href={`/r/${tenantSlug}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto rounded-full px-2.5 py-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          View storefront ↗
        </a>
      </nav>

      {/* Mobile dropdown — below md only, toggled by the hamburger above */}
      {menuOpen && (
        <nav className="border-t border-white/10 px-2 pb-3 pt-1 md:hidden">
          <div className="flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-white/90 transition-colors hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={`/r/${tenantSlug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-3 py-2.5 text-white/90 transition-colors hover:bg-white/10"
            >
              View storefront ↗
            </a>
            <form action={logoutAction} className="mt-1 border-t border-white/10 pt-2">
              <button
                type="submit"
                className="w-full rounded-md px-3 py-2.5 text-left text-white/90 transition-colors hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>
      )}
    </header>
  );
}
