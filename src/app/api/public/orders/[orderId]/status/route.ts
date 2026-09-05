import { NextResponse, type NextRequest } from "next/server";
import { getTenantBySlug } from "@/lib/data/tenants";
import { getOrderForTenant } from "@/lib/data/orders";

// Lightweight polling endpoint for the public order-status page. Scoped by
// slug -> tenantId -> order, same as every other tenant-scoped query, so one
// restaurant's order ids can't be probed against another's data.
export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const order = await getOrderForTenant(tenant.id, orderId);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ status: order.status, updatedAt: order.updatedAt });
}
