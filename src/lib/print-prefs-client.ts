"use client";

import { useSyncExternalStore } from "react";
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
