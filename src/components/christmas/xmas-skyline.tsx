/**
 * A snowy-hill skyline with a few Christmas trees and small lit houses —
 * purely decorative, inline SVG (no image asset to source/host). Used as a
 * section-bottom flourish on the storefront, marketing homepage, and
 * nowhere load-bearing — safe to omit entirely on narrow/short viewports.
 */
export function XmasSkyline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 110"
      preserveAspectRatio="none"
      className={`block h-20 w-full ${className}`}
      aria-hidden="true"
    >
      <path d="M0 60 Q 200 20 400 55 T 800 50 V110 H0 Z" fill="var(--xmas-cream-deep, #efe0c2)" />
      {[70, 300, 560, 730].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i % 2 === 0 ? 48 : 58})`}>
          <polygon points="0,-34 -16,0 16,0" fill="var(--xmas-green-deep, #123524)" />
          <polygon points="0,-22 -11,4 11,4" fill="var(--xmas-green, #1f6b3f)" />
          <circle cx="0" cy="-34" r="2.5" fill="var(--xmas-gold, #e8b64a)" />
        </g>
      ))}
      {[180, 460, 650].map((x) => (
        <g key={x} transform={`translate(${x} 72)`}>
          <polygon points="-14,0 0,-14 14,0" fill="var(--xmas-maroon-deep, #5c1a1a)" />
          <rect x="-11" y="0" width="22" height="16" fill="var(--xmas-maroon, #7a2323)" />
          <rect x="-3" y="5" width="6" height="6" fill="var(--xmas-gold, #e8b64a)" />
        </g>
      ))}
    </svg>
  );
}
