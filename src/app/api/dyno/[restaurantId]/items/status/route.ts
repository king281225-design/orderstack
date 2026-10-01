import { NextResponse, type NextRequest } from "next/server";
import { getTenantByDynoRestaurantId } from "@/lib/data/dyno-connections";
import { dynoAck } from "@/lib/aggregator/dyno";

/**
 * POST /api/dyno/{restaurant_id}/items/status — same shape and purpose as
 * .../categories/status (see that route's comment), for an individual item
 * instead of a category.
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
    // tolerate
  }
  console.log(`[dyno] item status for restaurant ${restaurantId}:`, JSON.stringify(body));
  return NextResponse.json(dynoAck());
}
