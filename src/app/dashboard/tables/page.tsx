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

  // No persisted Table entity — a table's "identity" is just its QR link
  // (/r/<slug>?table=<label>), a pure function of the label. Redesigning or
  // regenerating never invalidates cards that are already printed and on tables.
  const hdrs = await headers();
  const host = hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const origin = `${proto}://${host}`;

  const defaults = defaultQrCardDesign(tenant);
  const initial = sanitizeQrCardDesign(tenant.qrCardDesign, defaults);

  return (
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
  );
}
