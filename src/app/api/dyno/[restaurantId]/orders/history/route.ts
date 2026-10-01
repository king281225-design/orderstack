import { NextResponse, type NextRequest } from "next/server";
import { getTenantByDynoRestaurantId } from "@/lib/data/dyno-connections";
import { dynoAck } from "@/lib/aggregator/dyno";

/**
 * POST /api/dyno/{restaurantId}/orders/history — confirmed against the real
 * Dyno client's own shipped source (resources/app/utils.js,
 * updateOrderController): only called when this app's own GET
 * /[restaurantId]/orders/status response sets `orderHistory: true` (this
 * app always sends false — see that route), and the real body shape is
 * `{ status: boolean, statusResponse: <vendor's raw order-history payload> }`,
 * not the `orderHistoryJson` field name shown in Dyno's hosted docs — the
 * docs appear stale on this point, so the real client's source wins. Every
 * real order this app needs already arrives via POST /api/dyno/orders and
 * is idempotent on externalOrderId, so there's no missing-order gap to
 * backfill from this; acknowledged and logged only (same `{status:200}` ack
 * as the items/stock routes) until a real use for it surfaces.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  const tenant = await getTenantByDynoRestaurantId(restaurantId);
  if (!tenant) {
    return NextResponse.json({ status: 404, message: "Unknown restaurant" }, { status: 404 });
  }
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // tolerate — see this file's header comment
  }
  console.log(`[dyno] order history for restaurant ${restaurantId}:`, JSON.stringify(body));
  return NextResponse.json(dynoAck());
}
