import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rupeesToCents } from "@/lib/money";

/**
 * Every function here takes tenantId as an explicit, required argument and
 * uses it in the `where` clause — never trust a category/item id alone.
 * Callers (server actions) must derive tenantId from the authenticated
 * session (requireTenantSession), never from client input.
 */

/** { label, priceCents }[] structured size/portion pricing — see Item.variants schema comment. */
export type MenuItemVariant = { label: string; priceCents: number };

export async function listMenuForTenant(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId, parentCategoryId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { addOns: { orderBy: { sortOrder: "asc" } } } },
      subcategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: { orderBy: { sortOrder: "asc" }, include: { addOns: { orderBy: { sortOrder: "asc" } } } },
        },
      },
    },
  });
}

/** Public storefront: only available items (and only available add-ons on them), only for the given tenant. */
export async function listPublicMenu(tenantId: string) {
  const itemsArgs = {
    where: { isAvailable: true },
    orderBy: { sortOrder: "asc" as const },
    include: { addOns: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" as const } } },
  };
  const categories = await prisma.category.findMany({
    where: { tenantId, parentCategoryId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      items: itemsArgs,
      subcategories: {
        orderBy: { sortOrder: "asc" },
        include: { items: itemsArgs },
      },
    },
  });
  return categories
    .map((c) => ({ ...c, subcategories: c.subcategories.filter((sc) => sc.items.length > 0) }))
    .filter((c) => c.items.length > 0 || c.subcategories.length > 0);
}

export async function createCategory(
  tenantId: string,
  name: string,
  opts?: { parentCategoryId?: string | null },
) {
  const last = await prisma.category.findFirst({
    where: { tenantId },
    orderBy: { sortOrder: "desc" },
  });
  return prisma.category.create({
    data: {
      tenantId,
      name,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      parentCategoryId: opts?.parentCategoryId ?? null,
    },
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
    isVeg?: boolean | null;
    tags?: string[] | null;
    variants?: MenuItemVariant[] | null;
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
      isVeg: data.isVeg ?? null,
      tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
      variants: data.variants && data.variants.length > 0 ? data.variants : undefined,
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
    categoryId: string;
    isVeg: boolean | null;
    tags: string[] | null;
    variants: MenuItemVariant[] | null;
  }>,
) {
  if (data.categoryId) {
    // Same ownership check as createItem — never let an update attach an
    // item to a category belonging to a different tenant.
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, tenantId },
    });
    if (!category) throw new Error("Category not found for this restaurant.");
  }
  // Json fields need Prisma.DbNull (not a plain `null`) to explicitly clear
  // them, and mixing a plain string[] with the rest of `data` otherwise
  // confuses Prisma's checked/unchecked update-input union — built
  // separately here rather than spreading the whole partial through as-is.
  const { tags, variants, ...rest } = data;
  return prisma.item.updateMany({
    where: { id: itemId, tenantId },
    data: {
      ...rest,
      ...(tags !== undefined ? { tags: tags && tags.length > 0 ? tags : Prisma.DbNull } : {}),
      ...(variants !== undefined ? { variants: variants && variants.length > 0 ? variants : Prisma.DbNull } : {}),
    },
  });
}

export async function deleteItem(tenantId: string, itemId: string) {
  return prisma.item.deleteMany({ where: { id: itemId, tenantId } });
}

/** Add/remove only (no rename) — same MVP scope as the rest of this file. */
export async function createItemAddOn(
  tenantId: string,
  itemId: string,
  data: { name: string; priceCents: number },
) {
  const item = await prisma.item.findFirst({ where: { id: itemId, tenantId } });
  if (!item) throw new Error("Item not found for this restaurant.");

  const last = await prisma.itemAddOn.findFirst({ where: { tenantId, itemId }, orderBy: { sortOrder: "desc" } });
  return prisma.itemAddOn.create({
    data: {
      tenantId,
      itemId,
      name: data.name,
      priceCents: data.priceCents,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
}

export async function toggleItemAddOnAvailable(tenantId: string, addOnId: string, isAvailable: boolean) {
  return prisma.itemAddOn.updateMany({ where: { id: addOnId, tenantId }, data: { isAvailable } });
}

export async function deleteItemAddOn(tenantId: string, addOnId: string) {
  return prisma.itemAddOn.deleteMany({ where: { id: addOnId, tenantId } });
}

/** Re-derives price/name server-side from tenant-scoped items — never trust cart prices from the client. */
export async function getItemsForOrder(tenantId: string, itemIds: string[]) {
  return prisma.item.findMany({
    where: { tenantId, id: { in: itemIds }, isAvailable: true },
    include: { addOns: { where: { isAvailable: true } } },
  });
}

export async function hasAnyMenuItems(tenantId: string): Promise<boolean> {
  const count = await prisma.item.count({ where: { tenantId } });
  return count > 0;
}

/**
 * A realistic starter menu — no photos (mock data, not real dishes to
 * photograph). Only offered on the dashboard when the tenant has zero items,
 * so it can't silently duplicate an owner's real menu.
 */
const SAMPLE_MENU: {
  category: string;
  items: { name: string; priceRupees: number; description: string }[];
}[] = [
  {
    category: "Starters",
    items: [
      {
        name: "Paneer Tikka",
        priceRupees: 249,
        description: "Char-grilled cottage cheese marinated in yogurt and spices.",
      },
      {
        name: "Chicken 65",
        priceRupees: 279,
        description: "Spicy, deep-fried chicken tossed with curry leaves.",
      },
      {
        name: "Veg Spring Rolls",
        priceRupees: 199,
        description: "Crispy rolls stuffed with mixed vegetables.",
      },
    ],
  },
  {
    category: "Mains",
    items: [
      {
        name: "Butter Chicken",
        priceRupees: 399,
        description: "Tandoori chicken simmered in a creamy tomato gravy.",
      },
      {
        name: "Dal Makhani",
        priceRupees: 249,
        description: "Black lentils slow-cooked overnight with butter and cream.",
      },
      {
        name: "Veg Biryani",
        priceRupees: 279,
        description: "Fragrant basmati rice layered with spiced vegetables.",
      },
      {
        name: "Palak Paneer",
        priceRupees: 269,
        description: "Cottage cheese cubes in a smooth spinach gravy.",
      },
    ],
  },
  {
    category: "Beverages",
    items: [
      { name: "Masala Chai", priceRupees: 49, description: "Spiced Indian tea." },
      { name: "Sweet Lassi", priceRupees: 89, description: "Chilled yogurt-based sweet drink." },
      {
        name: "Fresh Lime Soda",
        priceRupees: 69,
        description: "Refreshing lime soda, sweet or salted.",
      },
    ],
  },
];

export async function seedSampleMenu(tenantId: string): Promise<void> {
  for (const group of SAMPLE_MENU) {
    const category = await createCategory(tenantId, group.category);
    for (const item of group.items) {
      await createItem(tenantId, category.id, {
        name: item.name,
        description: item.description,
        priceCents: rupeesToCents(item.priceRupees),
      });
    }
  }
}
