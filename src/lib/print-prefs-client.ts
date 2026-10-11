"use client";

import { useCallback, useSyncExternalStore, type RefObject } from "react";
import { type ThermalWidth, DEFAULT_THERMAL_WIDTH, isThermalWidth } from "@/lib/print-prefs";

/**
 * Persisted across visits, read at the moment a print is triggered (bill or
 * KOT) rather than held in component state — the KOT ticket page is a
 * separate navigation from the bill page that first sets this.
 */
const THERMAL_WIDTH_KEY = "bhojsetu-thermal-width";

export function getPersistedThermalWidth(): ThermalWidth {
  try {
    const v = localStorage.getItem(THERMAL_WIDTH_KEY) ?? undefined;
    return isThermalWidth(v) ? v : DEFAULT_THERMAL_WIDTH;
  } catch {
    return DEFAULT_THERMAL_WIDTH;
  }
}

export function setPersistedThermalWidth(width: ThermalWidth) {
  try {
    localStorage.setItem(THERMAL_WIDTH_KEY, width);
  } catch {
    // Private-browsing/blocked storage — the choice just won't be
    // remembered next visit, nothing else depends on it.
  }
}

function subscribeWidthPref(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}
function getWidthPrefServerSnapshot(): ThermalWidth {
  return DEFAULT_THERMAL_WIDTH;
}

/**
 * React binding for the persisted width, for components that render it
 * (invoice-view.tsx's width selector) — see invoice-view.tsx's own comment
 * on why this is useSyncExternalStore and not a plain effect+setState.
 */
export function useThermalWidthPref(): ThermalWidth {
  return useSyncExternalStore(subscribeWidthPref, getPersistedThermalWidth, getWidthPrefServerSnapshot);
}

const MM_PER_PX = 25.4 / 96;
const PAGE_HEIGHT_BUFFER_MM = 6;

/**
 * Measures a printable receipt's real rendered height and returns the @page
 * height to use (content height + a small buffer) — or null before the
 * first real measurement is in. An earlier version just declared a big
 * fixed height (1000mm) and assumed the printer driver would trim the
 * trailing blank paper — a real printed/previewed receipt showed that
 * assumption was wrong: the preview (and, going by it, the physical print)
 * showed one line of content followed by nearly a full meter of blank
 * page. Measuring the actual content instead of guessing fixes that
 * directly. Returning null (rather than some fallback number) while
 * unmeasured matters: the auto-print callers (invoice-view.tsx, the KOT
 * page) must NOT fire window.print() against a placeholder height — they
 * wait for a real, non-null value first.
 *
 * ResizeObserver through useSyncExternalStore, not a measure-in-effect +
 * setState — this project's own react-hooks/set-state-in-effect rule
 * forbids calling setState synchronously inside an effect (see
 * invoice-view.tsx's comment on the same constraint for the thermal/width
 * preferences), and this is React's own documented pattern for subscribing
 * to layout changes: getSnapshot reads the latest measurement, and the
 * ResizeObserver callback is the "subscribe" signal to re-check it,
 * without ever calling setState directly ourselves.
 */
export function useThermalPageHeightMm(ref: RefObject<HTMLElement | null>): number | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const el = ref.current;
      if (!el) return () => {};
      const observer = new ResizeObserver(onStoreChange);
      observer.observe(el);
      return () => observer.disconnect();
    },
    [ref],
  );
  const getSnapshot = useCallback(() => {
    const heightPx = ref.current?.getBoundingClientRect().height ?? 0;
    if (heightPx <= 0) return null;
    return Math.ceil(heightPx * MM_PER_PX) + PAGE_HEIGHT_BUFFER_MM;
  }, [ref]);
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
