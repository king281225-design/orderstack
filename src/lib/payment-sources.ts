/**
 * Shared payment labels + the "payment source" list. Pure (no server-only
 * imports) so client components, the PDF builder and analytics can all use it.
 *
 * paymentMethod (UPI/COD/CARD/RAZORPAY/AGGREGATOR) is how the customer chose
 * to pay; paymentSource is which channel the money actually arrived through,
 * recorded by the merchant when they confirm receipt.
 */

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  UPI: "UPI (QR code)",
  COD: "Cash",
  CARD: "Card",
  RAZORPAY: "Online",
  AGGREGATOR: "Aggregator (Zomato/Swiggy)",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Unpaid",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/** Sources a merchant can pick when confirming a payment. */
export const PAYMENT_SOURCES = [
  { value: "UPI", label: "UPI (other app)" },
  { value: "GOOGLE_PAY", label: "Google Pay" },
  { value: "PHONEPE", label: "PhonePe" },
  { value: "PAYTM", label: "Paytm" },
  { value: "BHIM_UPI", label: "BHIM UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
] as const;

export type PaymentSourceValue = (typeof PAYMENT_SOURCES)[number]["value"];

const SOURCE_VALUES = new Set<string>(PAYMENT_SOURCES.map((s) => s.value));

/** Labels for every key that can appear in analytics, incl. automatic ones. */
export const PAYMENT_SOURCE_LABEL: Record<string, string> = {
  ...Object.fromEntries(PAYMENT_SOURCES.map((s) => [s.value, s.label])),
  RAZORPAY: "Online (Razorpay)",
  AGGREGATOR: "Aggregator (Zomato/Swiggy)",
};

export function isPaymentSource(value: unknown): value is PaymentSourceValue {
  return typeof value === "string" && SOURCE_VALUES.has(value);
}

/**
 * The source key an order counts under in analytics: the one the merchant
 * recorded, else derived from how the customer paid (so orders confirmed
 * before this feature, and Razorpay/aggregator ones, still land in a bucket).
 */
export function effectivePaymentSource(order: { paymentSource: string | null; paymentMethod: string }): string {
  if (order.paymentSource) return order.paymentSource;
  switch (order.paymentMethod) {
    case "COD":
      return "CASH";
    case "CARD":
      return "CARD";
    case "UPI":
      return "UPI";
    case "RAZORPAY":
      return "RAZORPAY";
    case "AGGREGATOR":
      return "AGGREGATOR";
    default:
      return "OTHER";
  }
}

export function paymentSourceDisplay(order: {
  paymentSource: string | null;
  paymentSourceLabel: string | null;
  paymentMethod: string;
}): string {
  const key = effectivePaymentSource(order);
  if (key === "OTHER" && order.paymentSourceLabel) return order.paymentSourceLabel;
  return PAYMENT_SOURCE_LABEL[key] ?? key;
}

/** Normalizes untrusted form input into a storable source triple. */
export function parsePaymentSourceInput(raw: {
  source?: unknown;
  label?: unknown;
  reference?: unknown;
}): { source: PaymentSourceValue | null; label: string | null; reference: string | null } {
  const source = isPaymentSource(raw.source) ? raw.source : null;
  const label = typeof raw.label === "string" && raw.label.trim() ? raw.label.trim().slice(0, 60) : null;
  const reference = typeof raw.reference === "string" && raw.reference.trim() ? raw.reference.trim().slice(0, 80) : null;
  return { source, label: source === "OTHER" ? label : null, reference };
}

/** Loose UPI VPA check: handle@provider. */
export function isValidUpiId(value: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}$/.test(value);
}
