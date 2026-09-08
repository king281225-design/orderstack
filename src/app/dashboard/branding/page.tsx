import { requireOwnerSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { BrandingForm } from "@/components/branding-form";
import { CustomDomainForm } from "@/components/custom-domain-form";
import { DeliveryZoneForm } from "@/components/delivery-zone-form";

export default async function BrandingPage() {
  const session = await requireOwnerSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Branding</h2>
        <BrandingForm tenant={tenant} />
      </div>
      <CustomDomainForm customDomain={tenant.customDomain} />
      <DeliveryZoneForm
        latitude={tenant.latitude}
        longitude={tenant.longitude}
        deliveryRadiusKm={tenant.deliveryRadiusKm}
      />
    </div>
  );
}
