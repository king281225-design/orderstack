import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantSession } from "@/lib/auth";
import { getOrderForPrint } from "@/lib/data/orders";
import { listRevisionsForOrder, type OrderRevisionSnapshot } from "@/lib/data/order-revisions";
import { getTenantById } from "@/lib/data/tenants";
import { buildTenantWhatsAppUrl } from "@/lib/contact";
import { formatINR } from "@/lib/money";

/**
 * A separate route from /dashboard/orders/[id]/edit on purpose — the edit
 * page blocks completed/cancelled/paid orders entirely, but their edit
 * history should still be visible. See OrderRevision's schema comment for
 * why each revision stores a full items+totals snapshot rather than a diff.
 */
export default async function OrderHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireTenantSession();
  const { id } = await params;

  const order = await getOrderForPrint(session.tenantId, id);
  if (!order) notFound();

  const [revisions, tenant] = await Promise.all([
    listRevisionsForOrder(session.tenantId, id),
    getTenantById(session.tenantId),
  ]);

  const latest = revisions[0];
  const waLink =
    tenant?.ownerWhatsapp && latest
      ? buildTenantWhatsAppUrl(
          tenant.ownerWhatsapp,
          `${tenant.name}: bill #${order.orderNumber} was edited${latest.editedByName ? ` by ${latest.editedByName}` : ""} — new total ${formatINR((latest.afterSnapshot as unknown as OrderRevisionSnapshot).totalCents)}.`,
        )
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Edit history — bill #{order.orderNumber}</h2>
        <p className="text-sm text-gray-500">{order.customerName}{order.customerPhone ? ` (${order.customerPhone})` : ""}</p>
      </div>

      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-800 hover:bg-green-100"
        >
          📲 Notify owner on WhatsApp
        </a>
      )}
      {!tenant?.ownerWhatsapp && (
        <p className="text-xs text-gray-400">
          Set a WhatsApp number in <Link href="/dashboard/branding" className="underline">Settings</Link> to get a one-click notify link here.
        </p>
      )}

      {revisions.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:bg-[#241d17]">
          No edits yet — this bill is still exactly as it was created.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {revisions.map((rev) => {
            const before = rev.beforeSnapshot as unknown as OrderRevisionSnapshot;
            const after = rev.afterSnapshot as unknown as OrderRevisionSnapshot;
            return (
              <div key={rev.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                  <span>
                    {rev.createdAt.toLocaleString()} · {rev.editedByName ?? "Unknown"}
                  </span>
                  <span className="font-semibold text-gray-700">
                    {formatINR(before.totalCents)} → {formatINR(after.totalCents)}
                  </span>
                </div>
                {rev.reason && <p className="mb-2 text-sm text-gray-600">&quot;{rev.reason}&quot;</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SnapshotCard label="Before" snapshot={before} />
                  <SnapshotCard label="After" snapshot={after} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link href={`/dashboard/orders/${order.id}/print`} className="text-sm font-semibold text-indigo-700 hover:underline">
        View invoice →
      </Link>
    </div>
  );
}

function SnapshotCard({ label, snapshot }: { label: string; snapshot: OrderRevisionSnapshot }) {
  return (
    <div className="rounded-md border border-gray-100 p-2 text-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <ul className="mb-2 flex flex-col gap-0.5 text-gray-700">
        {snapshot.items.map((l, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="truncate">{l.quantity} × {l.name}</span>
            <span className="shrink-0 text-gray-500">{formatINR(l.priceCents * l.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="font-semibold text-gray-900">Total: {formatINR(snapshot.totalCents)}</p>
    </div>
  );
}
