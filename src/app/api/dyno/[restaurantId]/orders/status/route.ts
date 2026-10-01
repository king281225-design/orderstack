import { NextResponse, type NextRequest } from "next/server";
import { getTenantByDynoRestaurantId } from "@/lib/data/dyno-connections";
import { listPendingDynoActions } from "@/lib/data/orders";
import { DYNO_ACTION, DEFAULT_PREP_TIME_MINUTES } from "@/lib/aggregator/dyno";

/**
 * GET /api/dyno/{restaurantId}/orders/status — Dyno's real client (the
 * "dapis" app) polls this to learn which of this restaurant's orders need a
 * real action performed on Swiggy/Zomato. This is a one-time action queue,
 * not a status display — see src/lib/aggregator/dyno.ts's header comment
 * and src/lib/data/orders.ts's listPendingDynoActions, confirmed by reading
 * the real client's own shipped source. `prepTime` is only meaningful
 * alongside an ACCEPT action (dapis defaults to 30 itself if omitted).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  const tenant = await getTenantByDynoRestaurantId(restaurantId);
  if (!tenant) {
    return NextResponse.json({ status: 404, message: "Unknown restaurant" }, { status: 404 });
  }

  const actions = await listPendingDynoActions(tenant.id);

  return NextResponse.json({
    orderHistory: false,
    orders: actions.map((a) => ({
      orderId: a.externalOrderId,
      resId: restaurantId,
      status: a.actionCode,
      ...(a.actionCode === DYNO_ACTION.ACCEPT ? { prepTime: DEFAULT_PREP_TIME_MINUTES } : {}),
    })),
  });
}
