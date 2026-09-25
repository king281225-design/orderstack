import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { listRecentItemMovements, listStockItems, itemStockLevel } from "@/lib/data/inventory";
import { listMenuForTenant } from "@/lib/data/menu";
import { isProductPhotoSuggestConfigured } from "@/lib/ai/product-photo-suggest";
import { isStockPhotoSearchConfigured } from "@/lib/images/stock-photo";
import { ProductTab, type UIStockItem } from "@/components/inventory/product-tab";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await requireTenantSession();
  const isOwner = session.role === "OWNER";
  const [tenant, stockItems, itemMovements, categoryTree] = await Promise.all([
    getTenantById(session.tenantId),
    listStockItems(session.tenantId),
    listRecentItemMovements(session.tenantId),
    listMenuForTenant(session.tenantId),
  ]);
  if (!tenant) return null;

  // Flat category list (top-level + subcategories, subcategories labeled
  // "Parent / Child") for the product add/edit forms' category picker.
  const categories = categoryTree.flatMap((c) => [
    { id: c.id, name: c.name },
    ...c.subcategories.map((sc) => ({ id: sc.id, name: `${c.name} / ${sc.name}` })),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const historyByItem = new Map<string, typeof itemMovements>();
  for (const m of itemMovements) {
    const list = historyByItem.get(m.itemId) ?? [];
    if (list.length < 8) list.push(m);
    historyByItem.set(m.itemId, list);
  }

  // Prisma.Decimal instances (stockQty/lowStockThreshold/delta) can't cross
  // the server->client boundary as-is — converted to plain numbers here,
  // since ProductTab is a client component (needs client-side search/filter/sort).
  const uiStockItems: UIStockItem[] = stockItems.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    imageUrl: item.imageUrl,
    categoryId: item.categoryId,
    categoryName: categoryNameById.get(item.categoryId) ?? item.category?.name ?? "Uncategorised",
    priceCents: item.priceCents,
    purchasePriceCents: item.purchasePriceCents,
    stockQty: Number(item.stockQty ?? 0),
    lowStockThreshold: Number(item.lowStockThreshold ?? 0),
    level: itemStockLevel(item),
    history: (historyByItem.get(item.id) ?? []).map((m) => ({
      id: m.id,
      reason: m.reason,
      note: m.note,
      delta: Number(m.delta),
      createdAtLabel: m.createdAt.toLocaleString("en-IN"),
    })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
        {isOwner && (
          <Link href="/dashboard/inventory/scan" className="text-sm font-medium text-indigo-600 hover:underline">
            📷 Bill se stock jodo →
          </Link>
        )}
      </div>

      <ProductTab
        isOwner={isOwner}
        items={uiStockItems}
        categories={categories}
        aiPhotoSuggestEnabled={isProductPhotoSuggestConfigured()}
        stockPhotoSearchEnabled={isStockPhotoSearchConfigured()}
        autoHideEnabled={tenant.autoHideOutOfStock}
      />
    </div>
  );
}
