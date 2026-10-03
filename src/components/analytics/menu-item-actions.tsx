"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteItemAction, toggleItemAvailableAction } from "@/app/dashboard/menu/actions";

/**
 * Row actions for an item on the Menu Performance table. Nothing is ever
 * removed automatically — hiding is one click and reversible, and the
 * permanent delete asks for an explicit confirmation first.
 */
export function MenuItemActions({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) {
  const [pending, startTransition] = useTransition();
  const btn = "rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Link href={`/dashboard/menu#item-${itemId}`} className={btn}>
        View / Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        className={btn}
        onClick={() => startTransition(() => toggleItemAvailableAction(itemId, !isAvailable))}
      >
        {isAvailable ? "Hide" : "Show"}
      </button>
      <button
        type="button"
        disabled={pending}
        className="rounded border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        onClick={() => {
          if (!window.confirm("Permanently remove this item from your menu? This cannot be undone. (Use Hide to keep it.)")) return;
          startTransition(() => deleteItemAction(itemId));
        }}
      >
        Remove
      </button>
    </div>
  );
}
