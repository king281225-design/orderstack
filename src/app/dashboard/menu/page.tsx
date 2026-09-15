import { requireTenantSession } from "@/lib/auth";
import { listMenuForTenant } from "@/lib/data/menu";
import { getTenantById } from "@/lib/data/tenants";
import { AddCategoryForm } from "@/components/menu/add-category-form";
import { AddItemForm } from "@/components/menu/add-item-form";
import { UploadMenuDocumentForm } from "@/components/menu/upload-menu-document-form";
import { AiMenuImportForm } from "@/components/menu/ai-menu-import-form";
import { CategoryHeader } from "@/components/menu/category-header";
import { ItemRow } from "@/components/menu/item-row";
import { isAiMenuImportConfigured } from "@/lib/ai/menu-import";
import { loadSampleMenuAction } from "@/app/dashboard/menu/actions";

export default async function MenuPage() {
  const session = await requireTenantSession();
  const [categories, tenant] = await Promise.all([
    listMenuForTenant(session.tenantId),
    getTenantById(session.tenantId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Categories</h2>
        <AddCategoryForm />
      </section>

      <AddItemForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

      <AiMenuImportForm claudeConfigured={isAiMenuImportConfigured()} />

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
                  <ItemRow
                    key={item.id}
                    item={item}
                    categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
