import { requireTenantSession } from "@/lib/auth";
import { listMenuForTenant, type MenuItemVariant } from "@/lib/data/menu";
import { getTenantById } from "@/lib/data/tenants";
import { ManualOrderForm, type PickableMenuItem } from "@/components/orders/manual-order-form";

function isVariantArray(v: unknown): v is MenuItemVariant[] {
  return Array.isArray(v) && v.every((r) => typeof r?.label === "string" && typeof r?.priceCents === "number");
}

/**
 * Expands each item into one pickable entry per Half/Full-style variant
 * (labeled "Item (Half)"/"Item (Full)" so they're distinct, searchable
 * options) instead of the single flat item.priceCents — which is just the
 * *lowest* variant's price (see variant-rows-editor.tsx) and previously left
 * staff with no way to actually pick Full from the "+ Add from menu" quick-
 * pick or the inline search.
 */
function toPickableItems(items: { name: string; priceCents: number; variants: unknown }[]): PickableMenuItem[] {
  return items.flatMap((i) => {
    if (isVariantArray(i.variants) && i.variants.length > 0) {
      return i.variants.map((v) => ({ name: `${i.name} (${v.label})`, priceCents: v.priceCents }));
    }
    return [{ name: i.name, priceCents: i.priceCents }];
  });
}

export default async function NewOrderPage() {
  const session = await requireTenantSession();
  const [categories, tenant] = await Promise.all([
    listMenuForTenant(session.tenantId),
    getTenantById(session.tenantId),
  ]);

  const menuItems = categories.flatMap((c) => [
    ...toPickableItems(c.items),
    ...c.subcategories.flatMap((sc) => toPickableItems(sc.items)),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">Create a bill</h2>
      <p className="text-sm text-gray-500">
        For a walk-in or phone-in order — add products/services, quantities and pricing, then
        print or save the invoice.
      </p>
      <ManualOrderForm menuItems={menuItems} defaultGstRate={tenant?.gstRate ?? null} />
    </div>
  );
}
