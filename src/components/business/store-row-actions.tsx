"use client";

import { useTransition } from "react";
import { setStoreStatusAction, switchStoreAction } from "@/app/dashboard/business/actions";

export function StoreRowActions({ storeId, status, isActive }: { storeId: string; status: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const btn = "rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {!isActive && (
        <button type="button" disabled={pending} className={btn} onClick={() => startTransition(() => switchStoreAction(storeId))}>
          Open store
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        className={btn}
        onClick={() => {
          if (status === "ACTIVE" && !window.confirm("Disable this store? Its public page and ordering stop until you enable it again.")) return;
          startTransition(() => setStoreStatusAction(storeId, status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"));
        }}
      >
        {status === "ACTIVE" ? "Disable" : "Activate"}
      </button>
    </div>
  );
}
