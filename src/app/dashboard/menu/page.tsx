import Image from "next/image";
import { requireTenantSession } from "@/lib/auth";
import { listMenuForTenant } from "@/lib/data/menu";
import { getTenantById } from "@/lib/data/tenants";
import { formatINR } from "@/lib/money";
import { AddCategoryForm } from "@/components/menu/add-category-form";
import { AddItemForm } from "@/components/menu/add-item-form";
import { UploadMenuDocumentForm } from "@/components/menu/upload-menu-document-form";
import {
  deleteCategoryAction,
  deleteItemAction,
  loadSampleMenuAction,
  toggleItemAvailableAction,
} from "@/app/dashboard/menu/actions";

export default async function MenuPage() {
  const session = await requireTenantSession();
  const [categories, tenant] = await Promise.all([
    listMenuForTenant(session.tenantId),
    getTenantById(session.tenantId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Categories</h2>
        <AddCategoryForm />
      </section>

      <AddItemForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

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
          <div key={category.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">{category.name}</h3>
              <form action={deleteCategoryAction.bind(null, category.id)}>
                <button
                  type="submit"
                  className="text-xs font-medium text-red-600 hover:underline"
                  title="Deletes the category and all its items"
                >
                  Delete category
                </button>
              </form>
            </div>

            {category.items.length === 0 ? (
              <p className="text-sm text-gray-500">No items in this category yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-gray-100">
                {category.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-md object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-md bg-gray-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="truncate text-xs text-gray-500">{item.description}</p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {formatINR(item.priceCents)}
                    </span>
                    <form action={toggleItemAvailableAction.bind(null, item.id, !item.isAvailable)}>
                      <button
                        type="submit"
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.isAvailable
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </button>
                    </form>
                    <form action={deleteItemAction.bind(null, item.id)}>
                      <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
