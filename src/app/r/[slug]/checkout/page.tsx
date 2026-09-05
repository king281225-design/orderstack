import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/data/tenants";
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
      <CheckoutForm slug={slug} hasUpi={Boolean(tenant.upiId)} />
    </div>
  );
}
