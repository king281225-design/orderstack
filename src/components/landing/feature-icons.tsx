/**
 * Simple line-style (stroke, not filled) icons for the hero's "offerings"
 * row and the feature-cards section below it — informational, unlike the
 * purely decorative shapes in hero-decorations.tsx, so these are NOT
 * aria-hidden by default; callers pass their own label alongside them.
 */

type IconProps = {
  className?: string;
};

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function StorefrontIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" focusable="false">
      <path d="M3 9.5 4.5 4h15L21 9.5" />
      <path d="M3 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5 10.5V20h14v-9.5" />
      <path d="M10 20v-5.5a2 2 0 0 1 4 0V20" />
    </svg>
  );
}

export function ScooterIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" focusable="false">
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 18h6l1.5-6H10" />
      <path d="M12 18h6" />
      <path d="M13.5 12 15 7h3" />
      <path d="M9 7h3.5" />
    </svg>
  );
}

export function ShoppingBagIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" focusable="false">
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function TrendingUpIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" focusable="false">
      <path d="M3 17 9.5 10.5 14 15 21 7" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

export function QrCodeIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14h1v1h-1zM14 20h1v1h-1zM17.5 17.5h1v1h-1zM20 20h1v1h-1z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ReceiptIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" focusable="false">
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

export function BarChartIcon({ className = "" }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true" focusable="false">
      <path d="M4 20V10M12 20V4M20 20v-7" />
      <path d="M2 20h20" />
    </svg>
  );
}
