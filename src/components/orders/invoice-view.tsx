"use client";

import { useState } from "react";
import { formatINR } from "@/lib/money";
import { PrintControls } from "@/components/orders/print-button";

type InvoiceLine = { id: string; nameSnapshot: string; priceCentsSnapshot: number; quantity: number };

export function InvoiceView({
  tenantName,
  businessAddress,
  gstin,
  invoiceNumber,
  createdAt,
  customerName,
  customerPhone,
  customerEmail,
  lines,
  subtotalCents,
  discountCents,
  couponCode,
  taxCents,
  totalCents,
  paymentMethod,
  paymentStatus,
}: {
  tenantName: string;
  businessAddress: string | null;
  gstin: string | null;
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  lines: InvoiceLine[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  taxCents: number;
  totalCents: number;
  paymentMethod: string;
  paymentStatus: string;
}) {
  const [thermal, setThermal] = useState(false);

  return (
    <div className={thermal ? "invoice-thermal mx-auto" : "mx-auto max-w-2xl"}>
      <PrintControls onThermalChange={setThermal} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-900 print:rounded-none print:border-0 print:p-0">
        <header className="mb-4 flex flex-col gap-1 border-b border-gray-200 pb-4">
          <h1 className="text-xl font-bold">{tenantName}</h1>
          {businessAddress && <p className="text-xs text-gray-600 whitespace-pre-line">{businessAddress}</p>}
          {gstin && <p className="text-xs text-gray-600">GSTIN: {gstin}</p>}
        </header>

        <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm">
          <div>
            <p className="font-semibold">Invoice {invoiceNumber}</p>
            <p className="text-xs text-gray-500">{createdAt}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Bill to</p>
            <p>{customerName}</p>
            <p className="text-xs text-gray-500">{customerPhone}</p>
            {customerEmail && <p className="text-xs text-gray-500">{customerEmail}</p>}
          </div>
        </div>

        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-1.5">Item</th>
              <th className="py-1.5 text-right">Qty</th>
              <th className="py-1.5 text-right">Rate</th>
              <th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-1.5">{l.nameSnapshot}</td>
                <td className="py-1.5 text-right">{l.quantity}</td>
                <td className="py-1.5 text-right">{formatINR(l.priceCentsSnapshot)}</td>
                <td className="py-1.5 text-right">{formatINR(l.priceCentsSnapshot * l.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
          <Row label="Subtotal" value={formatINR(subtotalCents)} />
          {discountCents > 0 && (
            <Row label={`Discount${couponCode ? ` (${couponCode})` : ""}`} value={`− ${formatINR(discountCents)}`} />
          )}
          {taxCents > 0 && <Row label="Tax / GST" value={`+ ${formatINR(taxCents)}`} />}
          <Row label="Grand total" value={formatINR(totalCents)} bold />
          <Row label="Payment method" value={paymentMethod} />
          <Row label="Payment status" value={paymentStatus} />
        </div>

        <p className="mt-6 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          Thank you for your business!
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-gray-300 pt-1 text-base font-semibold" : "text-gray-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
