import { NextResponse, type NextRequest } from "next/server";
import { getTenantByDynoRestaurantId } from "@/lib/data/dyno-connections";
import { listMenuForTenant } from "@/lib/data/menu";
import { dynoAck } from "@/lib/aggregator/dyno";

/**
 * GET /api/dyno/{restaurantId}/items — confirmed against the real Dyno
 * client's own shipped source (resources/app/utils.js,
 * updateItemController/updateItemStatus): dapis calls this every ~30s and,
 * for EVERY item/category in the returned arrays, actually pushes that exact
 * in-stock/out-of-stock value to Swiggy/Zomato's real API — this is a sync
 * action, not just a display read. That's resent on every poll regardless
 * of whether it changed (unlike the one-time order-status action queue),
 * which is fine since toggling the same stock state twice on the platform
 * side is harmless. `getAllItems: false` — when true, dapis additionally
 * fetches the vendor's own full catalog and POSTs it to this app's own
 * POST handler below; this app has no use for that yet (the owner's own
 * menu stays the single source of truth), so there's no reason to ask for
 * the extra round-trip. `aggregator` (which platform a stock value applies
 * to) isn't something this app tracks per-item — Item.isAvailable is a
 * single, platform-agnostic flag — so it's left as an empty string; a known
 * v1 limit (stock is the same across the storefront and every connected
 * platform), not a bug. Name/price/category are included as extra fields
 * beyond the minimal id/aggregator/stockStatus shape dapis itself reads,
 * since a real menu sync needs more than that and extra JSON fields are
 * harmless for a consumer that only reads what it expects.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  const tenant = await getTenantByDynoRestaurantId(restaurantId);
  if (!tenant) {
    return NextResponse.json({ status: 404, message: "Unknown restaurant" }, { status: 404 });
  }

  const menu = await listMenuForTenant(tenant.id);
  const allCategories = menu.flatMap((c) => [c, ...c.subcategories]);
  const allItems = allCategories.flatMap((c) => c.items);

  return NextResponse.json({
    getAllItems: false,
    restaurantId,
    categories: allCategories.map((c) => ({
      id: c.id,
      aggregator: "",
      stockStatus: true,
      name: c.name,
    })),
    items: allItems.map((i) => ({
      id: i.id,
      aggregator: "",
      stockStatus: i.isAvailable,
      name: i.name,
      priceCents: i.priceCents,
      categoryId: i.categoryId,
    })),
  });
}

/**
 * POST /api/dyno/{restaurantId}/items — only ever called when this app's own
 * GET handler above sets getAllItems: true (currently always false, so this
 * is dormant in practice). Real body shape per the client's own source:
 * { status: boolean, statusResponse: <vendor's raw catalog> }, not the
 * `allItemsJson` field name Dyno's hosted docs show — same docs-vs-source
 * mismatch as the order-history route. No established use for ingesting
 * this yet — the owner's own menu (built through /dashboard/menu) stays the
 * single source of truth rather than letting an external push silently
 * rewrite it — so this just acknowledges and logs, same as order-history.
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
  console.log(`[dyno] items push for restaurant ${restaurantId}:`, JSON.stringify(body)?.slice(0, 2000));
  return NextResponse.json(dynoAck());
}
