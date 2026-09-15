import { headers } from "next/headers";
import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { buildTableQrDataUrl } from "@/lib/table-qr";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function TablesPage({
  searchParams,
}: {
  searchParams: Promise<{ count?: string }>;
}) {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;

  const { count: countParam } = await searchParams;
  const count = Math.min(Math.max(Number(countParam) || 10, 1), 100);

  // No persisted Table entity — a table's "identity" is just this URL.
  // Regenerating with a different count is safe; existing table numbers
  // keep the same link (and existing printed QR codes keep working) since
  // it's a pure function of the number, not anything stored.
  const hdrs = await headers();
  const host = hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const origin = `${proto}://${host}`;

  const tables = await Promise.all(
    Array.from({ length: count }, (_, i) => i + 1).map(async (n) => {
      const url = `${origin}/r/${tenant.slug}?table=${n}`;
      const qrDataUrl = await buildTableQrDataUrl(url);
      return { n, qrDataUrl };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4 print:hidden">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Table QR codes</h2>
        <p className="mb-4 text-sm text-gray-500">
          Print these and put one per table. Scanning opens your storefront with &quot;Dine-in&quot;
          and the table number already filled in — the customer doesn&apos;t type anything.
        </p>
        <form className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Number of tables
            <input
              type="number"
              name="count"
              min={1}
              max={100}
              defaultValue={count}
              className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Generate
          </button>
          <PrintButton>Print</PrintButton>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3">
        {tables.map(({ n, qrDataUrl }) => (
          <div
            key={n}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4 text-center break-inside-avoid"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR code for table ${n}`} className="h-40 w-40" />
            <p className="text-sm font-semibold text-gray-900">Table {n}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
