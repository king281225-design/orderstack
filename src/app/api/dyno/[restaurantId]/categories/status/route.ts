import { NextResponse, type NextRequest } from "next/server";
import { getTenantByDynoRestaurantId } from "@/lib/data/dyno-connections";
import { dynoAck } from "@/lib/aggregator/dyno";

/**
 * POST /api/dyno/{restaurant_id}/categories/status — Dyno confirms the
 * result of pushing a category's in/out-of-stock status to Zomato/Swiggy.
 * Body shape confirmed against Dyno's docs (2026-10-01): { aggregator,
 * entityId, isProcessed, statusResponse, stockStatus }. Purely informational
 * for now — logged (a failed sync, isProcessed: false, is worth seeing in
 * logs) and acknowledged; nothing in the dashboard surfaces this yet.
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
  console.log(`[dyno] category status for restaurant ${restaurantId}:`, JSON.stringify(body));
  return NextResponse.json(dynoAck());
}
