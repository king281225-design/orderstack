import type { DeliveryPlatform } from "@prisma/client";
import type { AggregatorOrderLine } from "@/lib/data/orders";

/**
 * Dyno (DynoAPIs) is the delivery-platform aggregation bridge this app
 * integrates with — see CLAUDE.md's aggregation note. Dyno calls INTO this
 * app (src/app/api/dyno/*) rather than the other way around: there's no
 * outbound API this app calls, no API key/secret to hold, just a restaurant
 * id (Tenant.dynoRestaurantId) to recognize an inbound call by.
 *
 * The numeric `status` codes in GET /[restaurantId]/orders/status are NOT a
 * status display — confirmed by reading the real client's own shipped
 * source (the "dapis" Electron app installed locally, resources/app/
 * utils.js:updateOrderStatus) — they're a one-time ACTION QUEUE: returning
 * ACCEPT (1) makes dapis actually call Swiggy/Zomato's real accept API on
 * this order right then, returning READY (3) calls their mark-ready API,
 * and (Zomato only — Swiggy has no code path for this in the real client)
 * REJECT (-1) calls Zomato's reject API. dapis then POSTs the confirmed
 * code back to this app's POST /orders/[orderId]/status (2/4/-2
 * respectively), and that route must echo `{ status: <same code> }` back —
 * dapis treats any other value there as "action failed" and logs an error.
 * Each action is requested at most once (Order.dynoAcceptRequestedAt etc.)
 * — dapis has no memory of what it already asked for, so if this route kept
 * returning ACCEPT for an already-accepted order, dapis would retry the
 * real Swiggy/Zomato accept call on every ~30s poll forever.
 */
export const DYNO_ACTION = { ACCEPT: 1, READY: 3, REJECT: -1 } as const;
export const DYNO_ACTION_CONFIRMED = { ACCEPT: 2, READY: 4, REJECT: -2 } as const;

export function mapDynoVendorToPlatform(vendor: string | undefined): DeliveryPlatform | null {
  switch ((vendor ?? "").toLowerCase()) {
    case "zomato":
      return "ZOMATO";
    case "swiggy":
      return "SWIGGY";
    case "magicpin":
      return "MAGICPIN";
    default:
      return null;
  }
}

/** Default kitchen prep time (minutes) sent with an ACCEPT action — dapis falls back to 30 itself if omitted; this app doesn't track a per-order prep-time estimate elsewhere, so a single reasonable constant is used for every order. */
export const DEFAULT_PREP_TIME_MINUTES = 20;

export type DynoPushedOrder = {
  data: unknown;
  orderId: string;
  resId: string;
  status: string;
  vendor: string;
};

export type ParsedDynoOrder = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  notes: string | null;
  lines: AggregatorOrderLine[];
};

/**
 * PROVISIONAL / best-effort — Dyno's own docs leave the per-order `data`
 * object's shape undocumented (shown as opaque `{}`), since it almost
 * certainly varies by vendor (Swiggy vs Zomato each have their own raw order
 * format). This tries a handful of plausible field-name shapes; whatever it
 * can't confidently extract, it leaves out rather than guessing — the
 * caller (createAggregatorOrder) always stores the raw `data` verbatim
 * alongside whatever this parses, and falls back to a single "Unparsed
 * order — see raw payload" line if no real items were found, so a wrong or
 * incomplete parse never silently loses the order. Refine this function
 * once a real sample order payload is available.
 */
export function parseDynoOrderData(data: unknown): ParsedDynoOrder {
  const d = isRecord(data) ? data : {};

  const customer = isRecord(d.customer) ? d.customer : {};
  const customerName = firstString(customer.name, d.customerName, d.customer_name) ?? "Customer";
  const customerPhone = firstString(customer.phone, customer.mobile, d.customerPhone, d.customer_phone) ?? "N/A";
  const deliveryAddress = firstString(customer.address, d.deliveryAddress, d.delivery_address, d.address);
  const notes = firstString(d.instructions, d.notes, d.specialInstructions, d.special_instructions);

  const rawItems = Array.isArray(d.items) ? d.items : Array.isArray(d.orderItems) ? d.orderItems : [];
  const lines: AggregatorOrderLine[] = rawItems
    .filter(isRecord)
    .map((item) => {
      const name = firstString(item.name, item.itemName, item.title) ?? "Item";
      const priceRupees = firstNumber(item.price, item.amount, item.unitPrice);
      const quantity = firstNumber(item.quantity, item.qty) ?? 1;
      return {
        name,
        priceCents: priceRupees != null ? Math.round(priceRupees * 100) : 0,
        quantity: Math.max(1, Math.round(quantity)),
      };
    })
    .filter((l) => l.name);

  return { customerName, customerPhone, deliveryAddress: deliveryAddress ?? null, notes: notes ?? null, lines };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function firstString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const v of values) {
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * The generic ack shape dapis expects from every Dyno-facing route EXCEPT
 * POST /orders/[orderId]/status, which must echo back the specific action
 * code it received instead (see this file's header comment) — dapis checks
 * `response.data.status === 200` for every other push (items, item/category
 * stock, order history), confirmed against its own source.
 */
export function dynoAck() {
  return { status: 200, message: "Request is Successful" };
}
