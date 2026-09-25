import Link from "next/link";
import { requireOwnerSession } from "@/lib/auth";
import { buildMatchCandidates } from "@/lib/data/purchases";
import { isPurchaseScanConfigured } from "@/lib/ai/purchase-scan";
import { isStockPhotoSearchConfigured } from "@/lib/images/stock-photo";
import { listMenuForTenant } from "@/lib/data/menu";
import { BillScanner } from "@/components/purchases/bill-scanner";

export const dynamic = "force-dynamic";

export default async function ScanBillPage() {
  const session = await requireOwnerSession();

  if (!isPurchaseScanConfigured()) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/inventory" className="text-sm font-medium text-indigo-600 hover:underline">
          ← Inventory
        </Link>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Bill scanning isn&apos;t enabled yet</p>
          <p className="mt-1">This needs ANTHROPIC_API_KEY to be set — the same key the AI menu-import feature uses.</p>
        </div>
      </div>
    );
  }

  const [candidates, categoryTree] = await Promise.all([
    buildMatchCandidates(session.tenantId),
    listMenuForTenant(session.tenantId),
  ]);
  // Flat category list (top-level + subcategories) for the "create new
  // product" sheet's category picker — same shape as the Inventory page's own.
  const categories = categoryTree.flatMap((c) => [
    { id: c.id, name: c.name },
    ...c.subcategories.map((sc) => ({ id: sc.id, name: `${c.name} / ${sc.name}` })),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/dashboard/inventory" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Inventory
      </Link>
      <BillScanner candidates={candidates} categories={categories} stockPhotoSearchEnabled={isStockPhotoSearchConfigured()} />
    </div>
  );
}
