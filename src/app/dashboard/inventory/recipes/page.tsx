import Link from "next/link";
import { requireOwnerSession } from "@/lib/auth";
import { listMenuForTenant } from "@/lib/data/menu";
import { listIngredients, listRecipeLinesForTenant } from "@/lib/data/inventory";
import { RecipeEditor } from "@/components/inventory/inventory-forms";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const session = await requireOwnerSession();
  const [categories, ingredients, recipeLines] = await Promise.all([
    listMenuForTenant(session.tenantId),
    listIngredients(session.tenantId),
    listRecipeLinesForTenant(session.tenantId),
  ]);

  const linesByItem = new Map<string, { ingredientId: string; quantity: string }[]>();
  for (const l of recipeLines) {
    const list = linesByItem.get(l.itemId) ?? [];
    list.push({ ingredientId: l.ingredientId, quantity: String(Number(l.quantity)) });
    linesByItem.set(l.itemId, list);
  }
  const ingredientOptions = ingredients.map((i) => ({ id: i.id, name: i.name, unit: i.unit }));

  const groups = categories.flatMap((c) => [
    { name: c.name, items: c.items },
    ...c.subcategories.map((sc) => ({ name: `${c.name} › ${sc.name}`, items: sc.items })),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Item recipes</h2>
        <Link href="/dashboard/inventory" className="text-sm font-medium text-indigo-600 hover:underline">
          ← Back to inventory
        </Link>
      </div>
      <p className="-mt-2 text-sm text-gray-500">
        For each dish, list how much of each ingredient one serving uses. Every order then deducts that amount
        automatically. Items without a recipe don&apos;t affect stock. Half/Full variants deduct the same recipe per
        unit ordered.
      </p>

      {ingredients.length === 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add some ingredients on the{" "}
          <Link href="/dashboard/inventory" className="font-medium underline">
            Inventory page
          </Link>{" "}
          first.
        </p>
      )}

      {groups.map((group) => (
        <section key={group.name} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{group.name}</h3>
          {group.items.length === 0 && <p className="text-xs text-gray-500">No items.</p>}
          {group.items.map((item) => {
            const initial = linesByItem.get(item.id) ?? [];
            return (
              <details
                key={item.id}
                className="rounded-lg border border-gray-200 bg-white p-3 dark:bg-[#241d17]"
                open={false}
              >
                <summary className="cursor-pointer text-sm font-medium text-gray-900">
                  {item.name}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {initial.length > 0 ? `${initial.length} ingredient${initial.length === 1 ? "" : "s"}` : "no recipe"}
                  </span>
                </summary>
                <div className="mt-3">
                  <RecipeEditor itemId={item.id} ingredients={ingredientOptions} initialLines={initial} />
                </div>
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
}
