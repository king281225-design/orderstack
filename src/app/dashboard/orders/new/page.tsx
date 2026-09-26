import { requireTenantSession } from "@/lib/auth";
import { listMenuForTenant } from "@/lib/data/menu";
import { getTenantById } from "@/lib/data/tenants";
import { listCustomersForTenant } from "@/lib/data/customers";
import { listTables } from "@/lib/data/tables";
import { buildPickableMenu } from "@/lib/pickable-menu-items";
import { ManualOrderForm } from "@/components/orders/manual-order-form";

export default async function NewOrderPage() {
  const session = await requireTenantSession();
  const [categories, tenant, customers, tables] = await Promise.all([
    listMenuForTenant(session.tenantId),
    getTenantById(session.tenantId),
    listCustomersForTenant(session.tenantId),
    listTables(session.tenantId),
  ]);

  const { menuItems, menuCategories } = buildPickableMenu(categories);
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
