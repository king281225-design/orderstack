import Link from "next/link";
import { headers } from "next/headers";
import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { defaultQrCardDesign, sanitizeQrCardDesign } from "@/lib/qr-card";
import { QrCardDesigner } from "@/components/tables/qr-card-designer";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;

  // A table's QR link (/r/<slug>?table=<label>) is a pure function of the
  // label alone — redesigning or regenerating never invalidates cards
  // already printed and on tables. The live status board's Table rows
  // (src/lib/data/tables.ts) are a separate, decoupled concern: this
  // designer works identically whether or not the owner has set up the
  // board, and doesn't require a Table row to exist for a label to work.
  const hdrs = await headers();
  const host = hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const origin = `${proto}://${host}`;

  const defaults = defaultQrCardDesign(tenant);
  const initial = sanitizeQrCardDesign(tenant.qrCardDesign, defaults);

  return (
    <div className="flex flex-col gap-3">
      <Link href="/dashboard/tables/board" className="self-start text-sm font-medium text-indigo-600 hover:underline">
        ← Table status board
      </Link>
      <QrCardDesigner
        origin={origin}
        slug={tenant.slug}
        logoUrl={tenant.logoUrl}
        tenant={{
          name: tenant.name,
          tagline: tenant.tagline,
          colorPrimary: tenant.colorPrimary,
          colorSecondary: tenant.colorSecondary,
        }}
        initial={initial}
      />
    </div>
  );
}
