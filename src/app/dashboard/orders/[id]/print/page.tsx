import { notFound } from "next/navigation";
import { requireTenantSession } from "@/lib/auth";
import { getOrderForPrint } from "@/lib/data/orders";
import { getTenantById } from "@/lib/data/tenants";
import { invoiceCode } from "@/lib/kot";
import { InvoiceView } from "@/components/orders/invoice-view";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  UPI: "UPI",
  COD: "Cash",
  RAZORPAY: "Online",
};

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireTenantSession();
  const { id } = await params;

  // getOrderForPrint filters by tenantId — an order id from another
  // restaurant simply doesn't match and 404s, never leaking billing data
  // across tenants.
  const [order, tenant] = await Promise.all([
    getOrderForPrint(session.tenantId, id),
    getTenantById(session.tenantId),
  ]);
  if (!order || !tenant) notFound();

  return (
    <InvoiceView
      tenantName={tenant.name}
      businessAddress={tenant.businessAddress}
      businessState={tenant.businessState}
      gstin={tenant.gstin}
      invoiceNumber={invoiceCode(tenant.name, order.orderNumber)}
      createdAt={order.createdAt.toLocaleString("en-IN")}
      customerName={order.customerName}
      customerPhone={order.customerPhone}
      customerEmail={order.customerEmail}
      lines={order.items}
      subtotalCents={order.subtotalCents}
      discountCents={order.discountCents}
      couponCode={order.couponCode}
      taxCents={order.taxCents}
      gstRatePercent={order.gstRatePercent}
      totalCents={order.totalCents}
      paymentMethod={PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
      paymentStatus={order.paymentStatus}
    />
  );
}
