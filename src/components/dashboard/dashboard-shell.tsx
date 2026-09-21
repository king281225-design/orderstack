"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell, type PendingWaiterCall } from "@/components/dashboard/notification-bell";

export type DashboardNavLink = { href: string; label: string; badge?: number };

type IconProps = { size?: number };
const svgBase = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

const IconOrders = ({ size = 18 }: IconProps) => (
  <svg {...svgBase(size)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const IconMenu = ({ size = 18 }: IconProps) => (
  <svg {...svgBase(size)}>
    <path d="M3 3h18v4H3zM5 7v13a1 1 0 001 1h12a1 1 0 001-1V7" />
    <path d="M9 11h6" />
  </svg>
);
const IconInventory = ({ size = 18 }: IconProps) => (
  <svg {...svgBase(size)}>
    <path d="M20 7h-9M14 17H5M17 4v6M7 14v6" />
    <circle cx="17" cy="10" r="3" />
    <circle cx="7" cy="17" r="3" />
  </svg>
);
const IconAnalytics = ({ size = 18 }: IconProps) => (
  <svg {...svgBase(size)}>
    <path d="M3 3v18h18" />
    <path d="M7 14l4-5 3 3 5-7" />
  </svg>
);
const IconGear = ({ size = 18 }: IconProps) => (
  <svg {...svgBase(size)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09c0 .68.39 1.29 1 1.51.63.24 1.35.12 1.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06c-.45.47-.57 1.19-.33 1.82.22.61.83 1 1.51 1H21a2 2 0 010 4h-.09c-.68 0-1.29.39-1.51 1z" />
  </svg>
);
const IconMore = ({ size = 18 }: IconProps) => (
  <svg {...svgBase(size)}>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </svg>
);
const IconSearch = ({ size = 16 }: IconProps) => (
  <svg {...svgBase(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);
const IconPlus = ({ size = 15 }: IconProps) => (
  <svg {...svgBase(size)} strokeWidth={2.5}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconChevron = ({ size = 14 }: IconProps) => (
  <svg {...svgBase(size)} strokeWidth={2.5}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const IconBurger = ({ open }: { open: boolean }) => (
  <svg {...svgBase(18)}>{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
);

/** Rail items in design order; each only shows if the tenant's nav actually includes it. */
const RAIL_ITEMS: { href: string; label: string; icon: (p: IconProps) => ReactNode }[] = [
  { href: "/dashboard", label: "Orders", icon: IconOrders },
  { href: "/dashboard/menu", label: "Menu", icon: IconMenu },
  { href: "/dashboard/inventory", label: "Inventory", icon: IconInventory },
  { href: "/dashboard/analytics", label: "Analytics", icon: IconAnalytics },
];
const SETTINGS_HREF = "/dashboard/branding";

function OpenToggle({
  isOpen,
  setOpenAction,
  full,
}: {
  isOpen: boolean;
  setOpenAction: (open: boolean) => Promise<void>;
  full?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(next: boolean) {
    setMenu(false);
    if (next === isOpen) return;
    startTransition(() => setOpenAction(next));
  }

  return (
    <div className={`relative ${full ? "flex-1" : ""}`}>
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        aria-expanded={menu}
        aria-haspopup="menu"
        disabled={pending}
        className={`flex items-center justify-center gap-2 rounded-full border px-3 py-[7px] text-[13px] font-semibold disabled:opacity-60 ${
          full ? "w-full rounded-[10px] py-[9px] text-[12.5px] font-bold" : ""
        } ${
          isOpen
            ? "border-[#cde3d2] bg-[#eaf6ec] text-[#1e7a4c]"
            : "border-[#f3c6c6] bg-[#fdf0f0] text-[#b23b3b]"
        }`}
      >
        <span className={`size-2 rounded-full ${isOpen ? "bg-[#1e7a4c]" : "bg-[#b23b3b]"}`} />
        {pending ? "Updating…" : isOpen ? "Taking orders" : "Closed"}
        <IconChevron />
      </button>
      {menu && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setMenu(false)} />
          <div
            role="menu"
            className="absolute left-0 top-full z-40 mt-1.5 w-60 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1.5 text-sm shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => choose(true)}
              className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-[var(--ds-chip)]"
            >
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#1e7a4c]" />
              <span>
                <span className="block font-semibold text-[var(--ds-text)]">Taking orders</span>
                <span className="block text-xs text-[var(--ds-muted)]">Customers can order from your storefront.</span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => choose(false)}
              className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-[var(--ds-chip)]"
            >
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#b23b3b]" />
              <span>
                <span className="block font-semibold text-[var(--ds-text)]">Closed</span>
                <span className="block text-xs text-[var(--ds-muted)]">Storefront shows “closed”; no new orders.</span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SearchBox({ className = "", autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const params = useSearchParams();
  const pathname = usePathname();
  // Prefill only on the Orders page, where ?q= is actually applied.
  const current = pathname === "/dashboard" ? params.get("q") ?? "" : "";
  return (
    <form
      action="/dashboard"
      method="get"
      role="search"
      className={`flex items-center gap-2 rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-chip)] px-3 py-[9px] ${className}`}
    >
      <span className="text-[var(--ds-muted)]">
        <IconSearch />
      </span>
      <input
        name="q"
        key={current}
        defaultValue={current}
        autoFocus={autoFocus}
        placeholder="Search order #, customer, phone…"
        aria-label="Search orders"
        className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--ds-text)] placeholder:text-[var(--ds-muted)] focus:outline-none"
      />
    </form>
  );
}

export function DashboardShell({
  tenantName,
  tenantSlug,
  isOpen,
  roleLabel,
  links,
  logoutAction,
  setOpenAction,
  pendingOrderCount,
  waiterCalls,
  acknowledgeWaiterCallAction,
  banner,
  notices,
  children,
}: {
  tenantName: string;
  tenantSlug: string;
  isOpen: boolean;
  roleLabel: string;
  links: DashboardNavLink[];
  logoutAction: () => Promise<void>;
  setOpenAction: (open: boolean) => Promise<void>;
  pendingOrderCount: number;
  waiterCalls: PendingWaiterCall[];
  acknowledgeWaiterCallAction: (id: string) => Promise<void>;
  banner?: ReactNode;
  notices?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isOrdersHome = pathname === "/dashboard";

  // The link that owns the current URL: the longest matching href, with the
  // bare "/dashboard" (Orders) also covering /dashboard/orders/* screens
  // that have no link of their own (bill / KOT print pages).
  const activeHref = links
    .filter((l) =>
      l.href === "/dashboard"
        ? pathname === "/dashboard" ||
          (pathname.startsWith("/dashboard/orders") && !links.some((o) => o.href !== "/dashboard" && pathname.startsWith(o.href)))
        : pathname.startsWith(l.href),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const activeLabel = links.find((l) => l.href === activeHref)?.label ?? "Orders";

  const byHref = new Map(links.map((l) => [l.href, l]));
  const railItems = RAIL_ITEMS.filter((r) => byHref.has(r.href));
  const railHrefs = new Set([...railItems.map((r) => r.href), SETTINGS_HREF]);
  const moreLinks = links.filter((l) => !railHrefs.has(l.href));
  const hasSettings = byHref.has(SETTINGS_HREF);
  const moreActive = moreLinks.some((l) => l.href === activeHref);
  const initial = tenantName.charAt(0).toUpperCase();

  const railBtn = (active: boolean) =>
    `relative flex h-[52px] w-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors ${
      active ? "bg-[var(--ds-rail-active)] text-[#fbf8f3]" : "text-[var(--ds-rail-text)] hover:bg-[var(--ds-rail-active)]/60 hover:text-[#fbf8f3]"
    }`;

  return (
    <div className="ds flex min-h-screen bg-[var(--ds-bg)] text-[var(--ds-text)]">
      {/* LEFT RAIL (md and up) */}
      <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col items-center gap-1.5 bg-[var(--ds-rail)] py-5 md:flex print:hidden">
        <Link
          href="/dashboard"
          aria-label="Orders home"
          className="ds-serif mb-[22px] grid size-10 place-items-center rounded-[11px] bg-[var(--ds-accent)] text-[19px] font-semibold text-[#fbf8f3]"
        >
          {initial}
        </Link>

        {railItems.map((item) => {
          const link = byHref.get(item.href)!;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={railBtn(activeHref === item.href)} aria-current={activeHref === item.href ? "page" : undefined}>
              <Icon />
              <span>{item.label}</span>
              {link.badge ? (
                <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9px] font-bold leading-4 text-gray-900">
                  {link.badge}
                </span>
              ) : null}
            </Link>
          );
        })}

        {moreLinks.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMoreOpen((o) => !o);
                setProfileOpen(false);
              }}
              aria-expanded={moreOpen}
              className={railBtn(moreActive || moreOpen)}
            >
              <IconMore />
              <span>More</span>
            </button>
            {moreOpen && (
              <>
                <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setMoreOpen(false)} />
                <nav className="absolute left-[calc(100%+12px)] top-0 z-40 w-56 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1.5 text-sm shadow-xl">
                  {moreLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--ds-chip)] ${
                        activeHref === l.href ? "bg-[var(--ds-chip)] font-semibold text-[var(--ds-text)]" : "text-[var(--ds-text-2)]"
                      }`}
                    >
                      {l.label}
                      {l.badge ? (
                        <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-gray-900">{l.badge}</span>
                      ) : null}
                    </Link>
                  ))}
                </nav>
              </>
            )}
          </div>
        )}

        <div className="flex-1" />

        {hasSettings && (
          <Link href={SETTINGS_HREF} className={railBtn(activeHref === SETTINGS_HREF)} aria-current={activeHref === SETTINGS_HREF ? "page" : undefined}>
            <IconGear />
            <span>Settings</span>
          </Link>
        )}

        <div className="relative mt-2">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((o) => !o);
              setMoreOpen(false);
            }}
            aria-label="Account menu"
            aria-expanded={profileOpen}
            className="grid size-[38px] place-items-center rounded-full bg-[#fce7d8] text-sm font-bold text-[#221b14]"
          >
            {initial}
          </button>
          {profileOpen && (
            <>
              <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setProfileOpen(false)} />
              <div className="absolute bottom-0 left-[calc(100%+12px)] z-40 w-56 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1.5 text-sm shadow-xl">
                <p className="truncate px-3 py-2 font-semibold text-[var(--ds-text)]">{tenantName}</p>
                <a
                  href={`/r/${tenantSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg px-3 py-2 text-[var(--ds-text-2)] hover:bg-[var(--ds-chip)]"
                >
                  View storefront ↗
                </a>
                <form action={logoutAction}>
                  <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-[var(--ds-text-2)] hover:bg-[var(--ds-chip)]">
                    Sign out
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* RIGHT COLUMN */}
      <div className={`flex min-w-0 flex-1 flex-col ${isOrdersHome ? "md:h-screen" : ""} print:h-auto`}>
        {banner}

        {/* DESKTOP TOP BAR */}
        <header className="hidden h-[68px] shrink-0 items-center gap-[18px] border-b border-[var(--ds-border)] bg-[var(--ds-bg)] px-7 md:flex print:hidden">
          <div className="flex min-w-0 flex-col gap-px">
            <h1 className="ds-serif m-0 truncate text-xl font-semibold tracking-[-0.01em]">{tenantName}</h1>
            <span className="text-xs text-[var(--ds-muted)]">
              {roleLabel} · {activeLabel}
            </span>
          </div>
          <OpenToggle isOpen={isOpen} setOpenAction={setOpenAction} />
          <SearchBox className="max-w-[380px] flex-1" />
          <div className="flex-1" />
          <NotificationBell
            variant="light"
            pendingOrderCount={pendingOrderCount}
            waiterCalls={waiterCalls}
            acknowledgeAction={acknowledgeWaiterCallAction}
          />
          <ThemeToggle />
          <Link
            href="/dashboard/orders/new"
            className="flex items-center gap-2 rounded-[10px] bg-[var(--ds-accent)] px-4 py-2.5 text-[13.5px] font-bold text-[#fff8f1] shadow-[0_1px_2px_rgba(34,20,10,0.15)] hover:brightness-95"
          >
            <IconPlus />
            New order
          </Link>
        </header>

        {/* MOBILE TOP BAR */}
        <header className="flex shrink-0 flex-col gap-2.5 border-b border-[var(--ds-border)] px-4 pb-2.5 pt-4 md:hidden print:hidden">
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              aria-label="Orders home"
              className="ds-serif grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-[var(--ds-accent)] text-base font-semibold text-[#fbf8f3]"
            >
              {initial}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="ds-serif truncate text-base font-semibold leading-[1.1]">{tenantName}</div>
              <div className="text-[11px] text-[var(--ds-muted)]">{activeLabel}</div>
            </div>
            <NotificationBell
              variant="light"
              pendingOrderCount={pendingOrderCount}
              waiterCalls={waiterCalls}
              acknowledgeAction={acknowledgeWaiterCallAction}
            />
            <button
              type="button"
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((o) => !o)}
              className="grid size-9 place-items-center rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text-2)]"
            >
              <IconBurger open={drawerOpen} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <OpenToggle isOpen={isOpen} setOpenAction={setOpenAction} full />
            <button
              type="button"
              aria-label="Search orders"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((o) => !o)}
              className="grid size-[38px] place-items-center rounded-[10px] border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text-2)]"
            >
              <IconSearch />
            </button>
          </div>
          {searchOpen && <SearchBox autoFocus />}
          {drawerOpen && (
            <nav className="flex flex-col rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1.5 text-sm">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                    activeHref === l.href ? "bg-[var(--ds-chip)] font-semibold" : "text-[var(--ds-text-2)]"
                  }`}
                >
                  {l.label}
                  {l.badge ? <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-gray-900">{l.badge}</span> : null}
                </Link>
              ))}
              <a href={`/r/${tenantSlug}`} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-2.5 text-[var(--ds-text-2)]">
                View storefront ↗
              </a>
              <div className="flex items-center justify-between border-t border-[var(--ds-border)] px-1 pt-1.5">
                <form action={logoutAction}>
                  <button type="submit" className="rounded-lg px-2 py-2 text-[var(--ds-text-2)]">
                    Sign out
                  </button>
                </form>
                <ThemeToggle />
              </div>
            </nav>
          )}
        </header>

        <main
          className={
            isOrdersHome
              ? "flex min-h-0 flex-1 flex-col print:block"
              : "mx-auto w-full max-w-5xl px-4 py-6 print:max-w-none print:p-0"
          }
        >
          {notices && <div className={isOrdersHome ? "px-4 pt-4 md:px-7" : ""}>{notices}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
