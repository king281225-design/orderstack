import { NextResponse, type NextRequest } from "next/server";
import { getOrderByExternalOrderId } from "@/lib/data/orders";
import { DYNO_ACTION_CONFIRMED } from "@/lib/aggregator/dyno";

/**
 * POST /api/dyno/orders/{orderId}/status — Dyno's real client ("dapis")
 * calls this right after it actually accepted/marked-ready/rejected this
 * order on the live Swiggy/Zomato API, confirming the result. Body:
 * { statusCode, statusResponse } — statusCode is 2 (accept confirmed), 4
 * (ready confirmed), or -2 (reject confirmed), matching the action code
 * this app originally requested via GET /[restaurantId]/orders/status + 1
 * (confirmed against the real client's own shipped source).
 *
 * CRITICAL: the response here must echo back `{ status: <the exact
 * statusCode received> }` — dapis checks `response.data.status === 2` (or
 * 4/-2) to decide whether the push itself succeeded, and logs an error on
 * anything else. A generic `{status:200}` here would make dapis treat every
 * single successful accept/ready/reject as a failure.
 *
 * This app's own Order.status is already the source of truth (set by the
 * dashboard's own Accept/Ready/Cancel actions, which is what triggered this
 * action in the first place via listPendingDynoActions) — this callback
 * doesn't need to write anything back, just acknowledge correctly and log
 * for visibility (statusResponse carries whatever Swiggy/Zomato's own API
 * actually returned, useful if something needs investigating).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  let body: { statusCode?: number; statusResponse?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // tolerate a malformed body — still ack below so dapis isn't left hanging
  }

  const order = await getOrderByExternalOrderId(orderId);
  const label = order ? `BhojSetu #${order.orderNumber}` : "unrecognized order";
  console.log(`[dyno] order ${orderId} (${label}) status callback:`, JSON.stringify(body));

  const statusCode = typeof body.statusCode === "number" ? body.statusCode : DYNO_ACTION_CONFIRMED.ACCEPT;
  return NextResponse.json({ status: statusCode });
}
