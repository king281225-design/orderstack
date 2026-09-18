import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { listIngredients, listRecentMovements, stockLevel } from "@/lib/data/inventory";
import {
  AddIngredientForm,
  AutoHideToggle,
  DeleteIngredientButton,
  EditIngredientForm,
  StockAdjustForm,
} from "@/components/inventory/inventory-forms";

export const dynamic = "force-dynamic";

const LEVEL_STYLE = {
  OK: "bg-green-100 text-green-800",
  LOW: "bg-amber-100 text-amber-800",
  OUT: "bg-red-100 text-red-800",
} as const;
const LEVEL_LABEL = { OK: "In stock", LOW: "Low stock", OUT: "Out of stock" } as const;

const REASON_LABEL: Record<string, string> = {
  PURCHASE: "Received",
  ORDER: "Used by order",
  ORDER_CANCEL: "Returned (order cancelled)",
  WASTE: "Wastage",
  ADJUSTMENT: "Correction",
};

export default async function InventoryPage() {
  const session = await requireTenantSession();
  const isOwner = session.role === "OWNER";
  const [tenant, ingredients, movements] = await Promise.all([
    getTenantById(session.tenantId),
    listIngredients(session.tenantId),
    listRecentMovements(session.tenantId),
  ]);
  if (!tenant) return null;

  const movementsByIngredient = new Map<string, typeof movements>();
  for (const m of movements) {
    const list = movementsByIngredient.get(m.ingredientId) ?? [];
    if (list.length < 8) list.push(m);
    movementsByIngredient.set(m.ingredientId, list);
  }

  const attention = ingredients.filter((i) => stockLevel(i.currentStock, i.lowStockThreshold) !== "OK");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
        {isOwner && (
          <Link href="/dashboard/inventory/recipes" className="text-sm font-medium text-indigo-600 hover:underline">
            Set item recipes →
          </Link>
        )}
      </div>
      <p className="-mt-3 text-sm text-gray-500">
        Track raw materials, link them to menu items through recipes, and stock is deducted automatically as orders
        come in (and returned if an order is cancelled). You&apos;re alerted when something runs low.
      </p>

      {attention.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Needs restocking ({attention.length})</p>
          <p>
            {attention
              .map((i) => `${i.name} (${Number(i.currentStock)} ${i.unit})`)
              .join(" · ")}
          </p>
        </div>
      )}

      {isOwner && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Add an ingredient</h3>
            <AddIngredientForm />
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
            <AutoHideToggle enabled={tenant.autoHideOutOfStock} />
          </section>
        </>
      )}

      <section className="flex flex-col gap-3">
        {ingredients.length === 0 ? (
          <p className="text-sm text-gray-500">
            No ingredients yet.{isOwner ? " Add your first one above, then link it to menu items via recipes." : ""}
          </p>
        ) : (
          ingredients.map((ing) => {
            const level = stockLevel(ing.currentStock, ing.lowStockThreshold);
            const history = movementsByIngredient.get(ing.id) ?? [];
            return (
              <div key={ing.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{ing.name}</p>
                    <p className="text-sm text-gray-600">
                      <span className="text-lg font-semibold">{Number(ing.currentStock)}</span> {ing.unit}
                      {Number(ing.lowStockThreshold) > 0 && (
                        <span className="text-xs text-gray-500">
                          {" "}
                          · alert at {Number(ing.lowStockThreshold)} {ing.unit}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_STYLE[level]}`}>
                    {LEVEL_LABEL[level]}
                  </span>
                </div>

                {isOwner && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
                    <StockAdjustForm ingredientId={ing.id} unit={ing.unit} />
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-gray-600">Edit details</summary>
                      <div className="mt-2 flex flex-col gap-2">
                        <EditIngredientForm
                          id={ing.id}
                          name={ing.name}
                          unit={ing.unit}
                          lowStockThreshold={String(Number(ing.lowStockThreshold))}
                          costPerUnit={ing.costPerUnitCents != null ? String(ing.costPerUnitCents / 100) : ""}
                        />
                        <div>
                          <DeleteIngredientButton id={ing.id} name={ing.name} />
                        </div>
                      </div>
                    </details>
                  </div>
                )}

                {history.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-gray-600">Recent activity</summary>
                    <ul className="mt-2 flex flex-col gap-1 text-xs text-gray-600">
                      {history.map((m) => (
                        <li key={m.id} className="flex flex-wrap justify-between gap-2">
                          <span>
                            {REASON_LABEL[m.reason] ?? m.reason}
                            {m.note ? ` — ${m.note}` : ""}
                          </span>
                          <span>
                            <span className={Number(m.delta) < 0 ? "text-red-600" : "text-green-600"}>
                              {Number(m.delta) > 0 ? "+" : ""}
                              {Number(m.delta)} {ing.unit}
                            </span>{" "}
                            · {m.createdAt.toLocaleString("en-IN")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
