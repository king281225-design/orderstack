import { requireTenantSession } from "@/lib/auth";
import { listMenuForTenant, type MenuItemVariant } from "@/lib/data/menu";
import { getTenantById } from "@/lib/data/tenants";
import { listCustomersForTenant } from "@/lib/data/customers";
import { listTables } from "@/lib/data/tables";
import { ManualOrderForm, type PickableMenuItem } from "@/components/orders/manual-order-form";

function isVariantArray(v: unknown): v is MenuItemVariant[] {
  return Array.isArray(v) && v.every((r) => typeof r?.label === "string" && typeof r?.priceCents === "number");
}

type RawItem = {
  id: string;
  name: string;
  priceCents: number;
  variants: unknown;
  imageUrl: string | null;
  categoryId: string;
  trackStock: boolean;
  stockQty: unknown; // Prisma.Decimal | null — converted to number below
};

/**
 * Expands each item into one pickable entry per Half/Full-style variant
 * (labeled "Item (Half)"/"Item (Full)" so they're distinct, searchable
 * options) instead of the single flat item.priceCents — which is just the
 * *lowest* variant's price (see variant-rows-editor.tsx) and previously left
 * staff with no way to actually pick Full from the "+ Add from menu" quick-
 * pick or the inline search. Every variant of the same item shares the same
 * itemId, imageUrl, category and stock — a variant is a price/name label on
 * the same underlying stock-tracked (or not) Item.
 */
function toPickableItems(items: RawItem[], categoryId: string, categoryName: string): PickableMenuItem[] {
  return items.flatMap((i) => {
    const base = {
      itemId: i.id,
      imageUrl: i.imageUrl,
      categoryId,
      categoryName,
      trackStock: i.trackStock,
      stockQty: i.trackStock ? Number(i.stockQty ?? 0) : null,
    };
    if (isVariantArray(i.variants) && i.variants.length > 0) {
      return i.variants.map((v) => ({ ...base, name: `${i.name} (${v.label})`, priceCents: v.priceCents }));
    }
    return [{ ...base, name: i.name, priceCents: i.priceCents }];
  });
}

export default async function NewOrderPage() {
  const session = await requireTenantSession();
  const [categories, tenant, customers, tables] = await Promise.all([
    listMenuForTenant(session.tenantId),
    getTenantById(session.tenantId),
    listCustomersForTenant(session.tenantId),
    listTables(session.tenantId),
  ]);

  const menuItems = categories.flatMap((c) => [
    ...toPickableItems(c.items, c.id, c.name),
    ...c.subcategories.flatMap((sc) => toPickableItems(sc.items, sc.id, `${c.name} / ${sc.name}`)),
  ]);
  const menuCategories = categories.flatMap((c) => [
    { id: c.id, name: c.name },
    ...c.subcategories.map((sc) => ({ id: sc.id, name: `${c.name} / ${sc.name}` })),
  ]);
  const customerOptions = customers.map((c) => ({ name: c.name, phone: c.phone, email: c.email }));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Create a bill</h2>
      <p className="text-sm text-gray-500">
        For a walk-in or phone-in order — pick products, adjust quantities, then print or save the invoice.
      </p>
      <ManualOrderForm
        menuItems={menuItems}
        menuCategories={menuCategories}
        customers={customerOptions}
        defaultGstRate={tenant?.gstRate ?? null}
        tables={tables.map((t) => ({ id: t.id, label: t.label, status: t.status }))}
      />
    </div>
  );
}
