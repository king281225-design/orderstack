"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { StaticSantaFallback } from "@/components/storefront/christmas/static-santa-fallback";

const SantaScene = dynamic(() => import("@/components/storefront/christmas/santa-scene"), {
  ssr: false,
  loading: () => null,
});

/**
 * Only ever rendered when the "christmasCampaign" feature is on for this
 * tenant (see src/app/r/[slug]/layout.tsx) — so for every other tenant this
 * component (and the dynamic import below) is never mounted at all, meaning
 * `three`/`@react-three/fiber` are never fetched. `ssr: false` additionally
 * guarantees the 3D scene is never part of server-rendered HTML even when
 * the flag IS on.
 *
 * Client-side checks WebGL2 availability and prefers-reduced-motion before
 * deciding whether to even attempt the 3D scene — a viewer failing either
 * check gets the plain static fallback instead of a broken/janky canvas.
 */
export function SantaLoader({ contentWidthPx }: { contentWidthPx?: number }) {
  const [decided, setDecided] = useState(false);
  const [canRender3d, setCanRender3d] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sideTrees, setSideTrees] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasWebGL = (() => {
      try {
        const canvas = document.createElement("canvas");
        return Boolean(canvas.getContext("webgl2"));
      } catch {
        return false;
      }
    })();
    // One-time capability probe on mount (WebGL/matchMedia aren't available
    // during SSR) — same exception class as CartProvider's localStorage
    // hydration effect (src/lib/cart.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(reduced);
    setCanRender3d(!reduced && hasWebGL);
    // Fallback trees need ~190px of empty margin each side of the content column.
    setSideTrees(window.innerWidth - (contentWidthPx ?? 576) >= 380);
    setDecided(true);
  }, [contentWidthPx]);

  if (!decided) return null;
  return canRender3d ? (
    <SantaScene contentWidthPx={contentWidthPx} />
  ) : (
    <StaticSantaFallback reducedMotion={reducedMotion} sideTrees={sideTrees} />
  );
}
