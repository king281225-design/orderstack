/**
 * Purely decorative inline SVGs for the landing-page hero (floating cutlery
 * + food particles). No semantics of their own — always rendered
 * aria-hidden, positioned/animated by the caller (landing-hero.tsx).
 */

type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function ForkIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 32 100" className={className} style={style} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <rect x="4" y="0" width="4" height="30" rx="2" />
        <rect x="12" y="0" width="4" height="30" rx="2" />
        <rect x="20" y="0" width="4" height="30" rx="2" />
        <rect x="4" y="27" width="20" height="7" rx="3.5" />
        <rect x="11" y="31" width="6" height="67" rx="3" />
      </g>
    </svg>
  );
}

export function SpoonIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 32 100" className={className} style={style} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <ellipse cx="14" cy="15" rx="13" ry="16" />
        <rect x="11" y="27" width="6" height="71" rx="3" />
      </g>
    </svg>
  );
}

export function BasilLeafIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true" focusable="false">
      <path
        d="M20 2C10 6 4 16 4 25c0 7 7 11 14 11s14-4 14-11c0-4-1.5-8-3.5-11.5 3.5 2 6 5.5 7 9.5C37.5 13 30 3 20 2Z"
        fill="currentColor"
      />
      <path d="M20 7v25" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function ChiliIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 60 26" className={className} style={style} aria-hidden="true" focusable="false">
      <path
        d="M6 3c5-3 9-1 9 3 0 6-6 9-6 15 0 5 5 7 11 5 13-4 21-13 26-23-1 13-13 24-26 28-9 3-19-2-19-11 0-7 6-11 5-17Z"
        fill="currentColor"
      />
      <path d="M6 3 10-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TomatoSliceIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="18" fill="currentColor" opacity="0.9" />
      <circle cx="20" cy="20" r="12" fill="white" opacity="0.3" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse key={deg} cx="20" cy="9" rx="2" ry="3.5" fill="currentColor" transform={`rotate(${deg} 20 20)`} />
      ))}
    </svg>
  );
}

export function OnionRingIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.85" />
      <circle cx="20" cy="20" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.6" />
    </svg>
  );
}

/**
 * A soft, blurred elliptical glow "trail" sat behind the fork/spoon —
 * a restrained nod to the reference design's glowing light-loop around its
 * crossed cutlery, without the continuous spin/large-rotating-object motion
 * the animation brief explicitly asked to avoid. Purely a slow opacity
 * breathe (see .animate-hero-glow in globals.css), colored via currentColor
 * so the caller controls the tint through its own text-* class.
 */
export function CutleryGlowLoop({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 220 110" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="cutlery-glow-gradient" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="42%" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="58%" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="55" rx="104" ry="34" fill="none" stroke="url(#cutlery-glow-gradient)" strokeWidth="3.5" />
    </svg>
  );
}

export function SpiceParticleIcon({ className = "", style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true" focusable="false">
      <circle cx="4" cy="6" r="1.6" fill="currentColor" />
      <circle cx="10" cy="3" r="1.2" fill="currentColor" />
      <circle cx="15" cy="9" r="1.8" fill="currentColor" />
      <circle cx="8" cy="13" r="1.3" fill="currentColor" />
      <circle cx="16" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}
