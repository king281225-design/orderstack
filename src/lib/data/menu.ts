import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Every function here takes tenantId as an explicit, required argument and
 * uses it in the `where` clause — never trust a category/item id alone.
 * Callers (server actions) must derive tenantId from the authenticated
 * session (requireTenantSession), never from client input.
 */

export async function listMenuForTenant(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
}

/** Public storefront: only available items, only for the given tenant. */
export async function listPublicMenu(tenantId: string) {
  const categories = await prisma.category.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  return categories.filter((c) => c.items.length > 0);
}

export async function createCategory(tenantId: string, name: string) {
  const last = await prisma.category.findFirst({
    where: { tenantId },
    orderBy: { sortOrder: "desc" },
  });
  return prisma.category.create({
    data: { tenantId, name, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
}

export async function renameCategory(tenantId: string, categoryId: string, name: string) {
  return prisma.category.updateMany({
    where: { id: categoryId, tenantId },
    data: { name },
  });
}

export async function deleteCategory(tenantId: string, categoryId: string) {
  return prisma.category.deleteMany({ where: { id: categoryId, tenantId } });
}

export async function createItem(
  tenantId: string,
  categoryId: string,
  data: {
    name: string;
    description?: string | null;
    priceCents: number;
    imageUrl?: string | null;
  },
) {
  // Confirm the category actually belongs to this tenant before attaching to it.
  const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
  if (!category) throw new Error("Category not found for this restaurant.");

  const last = await prisma.item.findFirst({
    where: { tenantId, categoryId },
    orderBy: { sortOrder: "desc" },
  });

  return prisma.item.create({
    data: {
      tenantId,
      categoryId,
      name: data.name,
      description: data.description ?? null,
      priceCents: data.priceCents,
      imageUrl: data.imageUrl ?? null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateItem(
  tenantId: string,
  itemId: string,
  data: Partial<{
    name: string;
    description: string | null;
    priceCents: number;
    imageUrl: string | null;
    isAvailable: boolean;
  }>,
) {
  return prisma.item.updateMany({ where: { id: itemId, tenantId }, data });
}

export async function deleteItem(tenantId: string, itemId: string) {
  return prisma.item.deleteMany({ where: { id: itemId, tenantId } });
}

/** Re-derives price/name server-side from tenant-scoped items — never trust cart prices from the client. */
export async function getItemsForOrder(tenantId: string, itemIds: string[]) {
  return prisma.item.findMany({
    where: { tenantId, id: { in: itemIds }, isAvailable: true },
  });
}
