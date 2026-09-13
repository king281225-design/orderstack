import { requireTenantSession } from "@/lib/auth";
import { listMenuForTenant } from "@/lib/data/menu";
import { getTenantById } from "@/lib/data/tenants";
import { ManualOrderForm } from "@/components/orders/manual-order-form";

export default async function NewOrderPage() {
  const session = await requireTenantSession();
  const [categories, tenant] = await Promise.all([
    listMenuForTenant(session.tenantId),
    getTenantById(session.tenantId),
  ]);

  const menuItems = categories.flatMap((c) =>
    c.items.map((i) => ({ name: i.name, priceCents: i.priceCents })),
  );

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
