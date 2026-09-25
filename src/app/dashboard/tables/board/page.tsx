import Link from "next/link";
import { requireOwnerSession } from "@/lib/auth";
import { listTables } from "@/lib/data/tables";
import { AutoRefresh } from "@/components/auto-refresh";
import { TableStatusBoard } from "@/components/tables/table-status-board";

export const dynamic = "force-dynamic";

export default async function TableBoardPage() {
  const session = await requireOwnerSession();
  const tables = await listTables(session.tenantId);

  return (
    <div className="flex flex-col gap-4">
      <AutoRefresh intervalMs={5000} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Table status board</h2>
          <p className="text-sm text-gray-500">Live occupancy — open/close a table, or move it to another.</p>
        </div>
        <Link href="/dashboard/tables" className="text-sm font-medium text-indigo-600 hover:underline">
          🖨️ Print QR cards →
        </Link>
      </div>
      <TableStatusBoard
        tables={tables.map((t) => ({ id: t.id, label: t.label, seats: t.seats, status: t.status }))}
      />
    </div>
  );
}
