import { requireTenantSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { BrandingForm } from "@/components/branding-form";

export default async function BrandingPage() {
  const session = await requireTenantSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Branding</h2>
      <BrandingForm tenant={tenant} />
    </div>
  );
}
