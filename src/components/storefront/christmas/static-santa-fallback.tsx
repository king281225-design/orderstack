/**
 * Shown instead of the 3D scene when WebGL2 isn't available or the viewer
 * has prefers-reduced-motion set (see santa-loader.tsx). Plain CSS, no new
 * dependency: Santa with a present drifting along the top (the drift is
 * skipped under reduced motion rather than slowed — a viewer whose browser
 * merely lacks WebGL2 but still allows motion keeps some movement), plus a
 * tree in each side margin only when the loader found room for them beside
 * the page's content column.
 */
export function StaticSantaFallback({ reducedMotion, sideTrees }: { reducedMotion: boolean; sideTrees: boolean }) {
  return (
    <>
      <div className="pointer-events-none fixed left-0 top-24 z-20 w-full overflow-hidden" aria-hidden="true">
        <div className={reducedMotion ? "pl-6" : "christmas-santa-drift"}>
          <span className="text-4xl">🎅🎁</span>
        </div>
      </div>
      {sideTrees && (
        <>
          <div
            className="pointer-events-none fixed bottom-4 left-[4%] z-[5] text-[7rem] leading-none"
            aria-hidden="true"
          >
            🎄
          </div>
          <div
            className="pointer-events-none fixed bottom-4 right-[4%] z-[5] text-[7rem] leading-none"
            aria-hidden="true"
          >
            🎄
          </div>
        </>
      )}
    </>
  );
}
