"use client";

/**
 * Sun/moon switch — flips documentElement's data-theme attribute (which
 * globals.css's [data-theme="dark"] color overrides key off) and remembers
 * the choice in localStorage.
 *
 * Deliberately has NO React state for "which icon to show": both icons
 * render always, and plain CSS (dark:hidden / hidden dark:block, wired to
 * the same [data-theme="dark"] attribute via globals.css's
 * @custom-variant) decides which one is visible. Tracking that in state
 * instead would mean the very first client render can't know the real
 * theme without reading the DOM — correct only from an effect, which
 * necessarily runs after paint, so a plain useEffect gives an SSR flash of
 * the wrong icon and setting state inside it also trips
 * react-hooks/set-state-in-effect; a useLayoutEffect re-read (the
 * documented fix for React Strict Mode's dev-only attribute reset — see
 * theme-init-script.tsx) still can't run before the very first paint. The
 * CSS-only approach sidesteps all of that: it's correct on the very first
 * paint because the attribute is already set by ThemeInitScript before any
 * React code runs, no client/server icon mismatch is possible, and no
 * hooks are involved at all.
 */
export function ThemeToggle({ variant = "page" }: { variant?: "page" | "header" }) {
  function toggle() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("bhojsetu-theme", next);
    } catch {
      // Private browsing / blocked storage — the toggle still works for
      // this page view, it just won't be remembered next visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className={
        variant === "header"
          ? "grid size-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          : "grid size-8 place-items-center rounded-full text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-[#1e2939] dark:hover:text-indigo-400"
      }
    >
      {/* Moon — shown in light mode as the "switch to dark" affordance. */}
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5 dark:hidden">
        <path d="M21.64 13a1 1 0 00-1.05-.14 8.05 8.05 0 01-3.37.73 8.15 8.15 0 01-8.14-8.14 8.06 8.06 0 01.73-3.37A1 1 0 008.66.24a10.14 10.14 0 1013.1 13.1 1 1 0 00-.12-.34z" />
      </svg>
      {/* Sun — shown in dark mode as the "switch to light" affordance. */}
      <svg viewBox="0 0 24 24" fill="currentColor" className="hidden size-4.5 dark:block">
        <path d="M12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm9-6a1 1 0 110 2h-1a1 1 0 110-2h1zM4 12a1 1 0 110 2H3a1 1 0 110-2h1zm14.36-6.36a1 1 0 011.42 1.42l-.71.7a1 1 0 11-1.42-1.41l.71-.71zM6.35 17.66a1 1 0 011.42 1.41l-.71.71a1 1 0 01-1.42-1.42l.71-.7zM18.36 18.36a1 1 0 01-1.42 0l-.7-.71a1 1 0 111.41-1.42l.71.71a1 1 0 010 1.42zM7.05 6.34a1 1 0 01-1.42 0l-.7-.7a1 1 0 111.41-1.42l.71.71a1 1 0 010 1.41zM12 20a1 1 0 011 1v-1a1 1 0 10-2 0v1a1 1 0 001 1z" />
      </svg>
    </button>
  );
}
