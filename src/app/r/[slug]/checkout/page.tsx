import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/data/tenants";
import { isRazorpayConfigured, isCustomerCheckoutRazorpayEnabled } from "@/lib/payments/razorpay";
import { CheckoutForm } from "@/components/storefront/checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Checkout</h1>
      <CheckoutForm
        slug={slug}
        restaurantName={tenant.name}
        hasUpi={Boolean(tenant.upiId)}
        hasRazorpay={isCustomerCheckoutRazorpayEnabled() && isRazorpayConfigured()}
        gstRate={tenant.gstRate}
        businessState={tenant.businessState}
        deliveryZone={
          tenant.latitude != null && tenant.longitude != null && tenant.deliveryRadiusKm != null
            ? { latitude: tenant.latitude, longitude: tenant.longitude, radiusKm: tenant.deliveryRadiusKm }
            : null
        }
      />
    </div>
  );
}
