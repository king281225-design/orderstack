import { requireTenantSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import { isAiMenuImportConfigured } from "@/lib/ai/menu-import";
import { isStockPhotoSearchConfigured } from "@/lib/images/stock-photo";
import { MenuImportWizard } from "@/components/menu/import-wizard/menu-import-wizard";

export default async function MenuImportPage() {
  const session = await requireTenantSession();
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Import your menu with AI</h1>
        <p className="text-sm text-gray-500">
          Upload photos or a PDF of your existing menu, review what gets read, preview how it&apos;ll
          look, then publish.
        </p>
      </div>
      <MenuImportWizard
        claudeConfigured={isAiMenuImportConfigured()}
        stockPhotoConfigured={isStockPhotoSearchConfigured()}
        tenantSlug={tenant.slug}
        theme={{
          colorPrimary: tenant.colorPrimary,
          colorSecondary: tenant.colorSecondary,
          colorAccent: tenant.colorAccent,
          colorHeaderText: tenant.colorHeaderText,
          colorCardBackground: tenant.colorCardBackground,
        }}
      />
    </div>
  );
}
