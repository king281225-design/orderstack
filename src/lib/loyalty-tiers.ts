/**
 * A purely cosmetic label over the existing loyalty points system
 * (Customer.totalSpentCents — see src/lib/data/customers.ts) for the
 * Christmas-campaign checkout display. No schema change, no new tier
 * system: just a display-time derivation, deliberately kept out of
 * customers.ts (which is "server-only") so it can be imported from a client
 * component like checkout-form.tsx.
 */
export type LoyaltyTier = "Silver" | "Gold" | "Platinum" | "VIP";

const THRESHOLDS: { minSpentCents: number; tier: LoyaltyTier }[] = [
  { minSpentCents: 10_00000, tier: "VIP" }, // ₹10,000+
  { minSpentCents: 5_00000, tier: "Platinum" }, // ₹5,000+
  { minSpentCents: 1_50000, tier: "Gold" }, // ₹1,500+
  { minSpentCents: 0, tier: "Silver" },
];

export function loyaltyTierLabel(totalSpentCents: number): LoyaltyTier {
  const match = THRESHOLDS.find((t) => totalSpentCents >= t.minSpentCents);
  return match?.tier ?? "Silver";
}
