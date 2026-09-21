"use client";

import { useState, useTransition } from "react";
import { deleteInvoiceAction } from "@/app/dashboard/invoices/actions";

export function DeleteInvoiceButton({ orderId, invoiceNumber }: { orderId: string; invoiceNumber: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const ok = window.confirm(
      `Delete invoice ${invoiceNumber}?\n\nThis permanently removes the bill and its order from your records, sales reports and customer totals. This cannot be undone.`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteInvoiceAction(orderId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
