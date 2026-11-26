const FLAKE_COUNT = 25;

/**
 * Pure CSS, no client JS needed — a fixed, non-interactive overlay of
 * falling snowflakes. pointer-events: none means it can never block a click
 * on the header/promo-bar/menu/cart-bar underneath, regardless of stacking
 * order. Mounted only when the "christmasCampaign" feature is actually on
 * for this tenant (see src/app/r/[slug]/layout.tsx) — never just CSS-hidden,
 * so a flag-off tenant pays nothing for this at all.
 *
 * A plain (non-"use client") component: the per-flake left/delay/duration
 * spread below is computed once per request (this page is already
 * `dynamic = "force-dynamic"`) and baked into the SSR'd HTML — there's no
 * client-side re-render that would ever recompute it differently, so this
 * doesn't need "use client" or any hydration guard.
 */
export function Snowfall() {
  const flakes = Array.from({ length: FLAKE_COUNT }, (_, i) => {
    // Deterministic-enough spread without a real RNG dependency — purely
    // decorative, nothing here needs to be unpredictable.
    const seed = (i * 73) % 100;
    const left = (seed + i * 11) % 100;
    const duration = 8 + (seed % 7); // 8–14s
    const delay = -(seed % 10); // negative delay staggers start positions
    const size = 0.6 + ((seed % 5) * 0.15); // 0.6–1.2em
    return { id: i, left, duration, delay, size };
  });

  return (
    <div className="christmas-snowfall-layer" aria-hidden="true">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="christmas-snowflake"
          style={
            {
              left: `${f.left}%`,
              fontSize: `${f.size}em`,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
            } as React.CSSProperties
          }
        >
          ❄
        </span>
      ))}
    </div>
  );
}
