/**
 * The BhojSetu platform mark — a bridge (setu) motif, since this app's job
 * is bridging restaurants and customers. Deliberately separate from a
 * tenant's own uploaded logo (Tenant.logoUrl, shown on that tenant's
 * storefront/dashboard) — this is the platform's own identity, used on the
 * home page, login page, and super-admin header.
 */
export function BhojSetuMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="BhojSetu"
    >
      <defs>
        <linearGradient id="bs-mark-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FB923C" />
          <stop offset="1" stopColor="#B91C1C" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#bs-mark-g)" />
      <path
        d="M14 41 C14 26 22 17 32 17 C42 17 50 26 50 41"
        stroke="#FFF7ED"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <rect x="11" y="41" width="7" height="11" rx="2.5" fill="#FFF7ED" />
      <rect x="46" y="41" width="7" height="11" rx="2.5" fill="#FFF7ED" />
      <circle cx="32" cy="33" r="4.5" fill="#FFF7ED" />
    </svg>
  );
}

export function BhojSetuLogo({
  markSize = 28,
  textClassName = "text-xl font-semibold text-gray-900",
  className = "",
}: {
  markSize?: number;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BhojSetuMark size={markSize} />
      <span className={textClassName}>BhojSetu</span>
    </span>
  );
}
