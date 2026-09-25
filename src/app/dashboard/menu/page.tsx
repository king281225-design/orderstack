import Link from "next/link";
import { requireTenantSession } from "@/lib/auth";
import { listMenuForTenant } from "@/lib/data/menu";
import { getTenantById } from "@/lib/data/tenants";
import { AddCategoryForm } from "@/components/menu/add-category-form";
import { AddItemForm } from "@/components/menu/add-item-form";
import { UploadMenuDocumentForm } from "@/components/menu/upload-menu-document-form";
import { CategoryHeader } from "@/components/menu/category-header";
import { ItemRow } from "@/components/menu/item-row";
import { loadSampleMenuAction } from "@/app/dashboard/menu/actions";

export default async function MenuPage() {
  const session = await requireTenantSession();
  const [categories, tenant] = await Promise.all([
    listMenuForTenant(session.tenantId),
    getTenantById(session.tenantId),
  ]);

  // Flat list for the category pickers (manual "add item" / edit-item
  // dropdowns) — top-level categories plus one indented level of
  // subcategories. Subcategories are only ever *created* via the AI
  // menu-import wizard, but once they exist they're editable here too.
  const categoryOptions = categories.flatMap((c) => [
    { id: c.id, name: c.name },
    ...c.subcategories.map((sc) => ({ id: sc.id, name: `— ${sc.name}` })),
  ]);

  // ItemRow is a Client Component and only needs this narrow shape — Item
  // now also carries stockQty/lowStockThreshold (Prisma.Decimal, added for
  // direct-stock tracking), which React can't serialize across the
  // server->client boundary. Map to a plain, explicit shape here rather than
  // passing the raw Prisma row through, so a future Decimal-typed column
  // can't silently reintroduce this crash.
  function toDisplayItem(item: (typeof categories)[number]["items"][number]) {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      priceCents: item.priceCents,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      categoryId: item.categoryId,
      variants: item.variants,
      tags: item.tags,
      addOns: item.addOns,
    };
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Categories</h2>
        <AddCategoryForm />
      </section>

      <AddItemForm categories={categoryOptions} />

      <section className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        <h3 className="mb-1 text-sm font-semibold text-gray-900">AI menu import</h3>
        <p className="mb-3 text-xs text-gray-500">
          Upload photos or a PDF of your existing menu — categories, subcategories, prices,
          sizes/variants, veg/non-veg, and tags get read automatically. You&apos;ll review and edit
          everything before anything is added, and can preview + publish your digital menu at the end.
        </p>
        <Link
          href="/dashboard/menu/import"
          className="inline-block rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Import your menu with AI →
        </Link>
      </section>

      <UploadMenuDocumentForm menuDocumentUrl={tenant?.menuDocumentUrl ?? null} />

      <section className="flex flex-col gap-6">
        {categories.length === 0 && (
          <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-gray-300 p-4">
            <p className="text-sm text-gray-500">No categories yet — add one above to get started.</p>
            <form action={loadSampleMenuAction}>
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Or load a sample menu to see how it looks
              </button>
            </form>
          </div>
        )}
        {categories.map((category) => (
          <div key={category.id} className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
            <CategoryHeader categoryId={category.id} name={category.name} />

            {category.items.length === 0 ? (
              <p className="text-sm text-gray-500">No items in this category yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-gray-100">
                {category.items.map((item) => (
                  <ItemRow key={item.id} item={toDisplayItem(item)} categories={categoryOptions} />
                ))}
              </ul>
            )}

            {category.subcategories.map((sub) => (
              <div key={sub.id} className="mt-4 border-t border-gray-100 pt-4 pl-4">
                <CategoryHeader categoryId={sub.id} name={sub.name} />
                {sub.items.length === 0 ? (
                  <p className="text-sm text-gray-500">No items in this subcategory yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-gray-100">
                    {sub.items.map((item) => (
                      <ItemRow key={item.id} item={toDisplayItem(item)} categories={categoryOptions} />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
