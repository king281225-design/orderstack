import { formatINR } from "@/lib/money";
import type { Coupon } from "@prisma/client";

/** Same wording the checkout page's own coupon field would confirm — kept in sync deliberately, not copy nobody checked against reality. */
function describeCoupon(c: Coupon): string {
  const discount =
    c.discountType === "PERCENT" ? `${c.discountValue}% off` : `${formatINR(c.discountValue)} off`;
  const minOrder = c.minOrderCents > 0 ? ` on orders above ${formatINR(c.minOrderCents)}` : "";
  return `Use code ${c.code} for ${discount}${minOrder}`;
}

/**
 * A scrolling strip advertising whatever coupons are actually live right
 * now — never static marketing copy, always re-derived from the same
 * eligibility rules checkout itself enforces (getActivePromotableCoupons).
 * Renders nothing at all if there's nothing real to advertise.
 */
export function PromoBar({ coupons }: { coupons: Coupon[] }) {
  if (coupons.length === 0) return null;

  const messages = coupons.map(describeCoupon);
  // Rendered twice back-to-back so the marquee animation's halfway point is
  // seamless — see the .animate-marquee keyframe in globals.css.
  const track = [...messages, ...messages];

  return (
    <div
      className="overflow-hidden py-1.5 text-sm font-medium text-white"
      style={{ backgroundColor: "var(--brand-secondary)" }}
      role="marquee"
      aria-label="Current offers"
    >
      <div className="animate-marquee flex w-max gap-12 whitespace-nowrap">
        {track.map((msg, i) => (
          <span key={i} aria-hidden={i >= messages.length}>
            🎉 {msg}
          </span>
        ))}
      </div>
    </div>
  );
}
