import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/auth";
import { listCustomersForTenant, customersToCsv } from "@/lib/data/customers";

// Not covered by src/proxy.ts's dashboard gate (that only matches
// /dashboard, not /api/dashboard) — re-checked here directly, same as every
// other tenant-scoped route/action in this app.
export async function GET() {
  const session = await requireTenantSession();
  const customers = await listCustomersForTenant(session.tenantId);
  const csv = customersToCsv(customers);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="customers.csv"',
    },
  });
}
