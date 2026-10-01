import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getTenantByDynoRestaurantId } from "@/lib/data/dyno-connections";
import { createAggregatorOrder } from "@/lib/data/orders";
import { mapDynoVendorToPlatform, parseDynoOrderData, dynoAck, type DynoPushedOrder } from "@/lib/aggregator/dyno";

/**
 * POST /api/dyno/orders — Dyno's real client ("dapis") pushes new order(s)
 * from Zomato/Swiggy here. Body: { orders: [{ data, orderId, resId, status,
 * vendor }] } — confirmed against the real client's own shipped source
 * (resources/app/routes.js's /postorders handler, which does exactly
 * `axios.post(`${url}/orders`, { orders: payload })` with this exact shape).
 * Only checks HTTP 200/201 on its end, not the response body — matches this
 * route's plain dynoAck(). `resId` is Dyno's restaurant id, matched against
 * Tenant.dynoRestaurantId; an order for an unrecognized resId is skipped
 * (not an error for the whole batch) rather than guessing a tenant. See
 * src/lib/aggregator/dyno.ts for what's still provisional (the `data`
 * object's inner shape — genuinely vendor-raw and undocumented anywhere,
 * confirmed by the client's own source too).
 *
 * No authentication/signature scheme exists anywhere in the real client's
 * source for this inbound call — flagged, not silently accepted: this route
 * is currently reachable by anyone who knows a real dynoRestaurantId.
 */
export async function POST(request: NextRequest) {
  let body: { orders?: DynoPushedOrder[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 400, message: "Malformed JSON" }, { status: 400 });
  }

  const orders = Array.isArray(body.orders) ? body.orders : [];
  for (const o of orders) {
    if (!o?.orderId || !o?.resId) continue;
    const tenant = await getTenantByDynoRestaurantId(o.resId);
    if (!tenant) continue; // unrecognized restaurant id — nothing to do, but don't fail the whole batch
    const platform = mapDynoVendorToPlatform(o.vendor);
    if (!platform) continue;

    const parsed = parseDynoOrderData(o.data);
    await createAggregatorOrder(tenant.id, platform, o.orderId, {
      customerName: parsed.customerName,
      customerPhone: parsed.customerPhone,
      fulfillmentType: "DELIVERY",
      deliveryAddress: parsed.deliveryAddress,
      notes: parsed.notes,
      lines: parsed.lines,
      rawPayload: (o.data ?? {}) as Prisma.InputJsonValue,
    });
  }

  return NextResponse.json(dynoAck());
}
