"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  createTableAction,
  deleteTableAction,
  setTableStatusAction,
  transferTableAction,
  type TableBoardState,
} from "@/app/dashboard/tables/actions";

type Status = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "BILLING";
export type BoardTable = { id: string; label: string; seats: number | null; status: Status };

const STATUS_STYLE: Record<Status, string> = {
  AVAILABLE: "border-green-300 bg-green-50 text-green-900",
  OCCUPIED: "border-red-300 bg-red-50 text-red-900",
  RESERVED: "border-blue-300 bg-blue-50 text-blue-900",
  BILLING: "border-amber-300 bg-amber-50 text-amber-900",
};
const STATUS_DOT: Record<Status, string> = {
  AVAILABLE: "bg-green-500",
  OCCUPIED: "bg-red-500",
  RESERVED: "bg-blue-500",
  BILLING: "bg-amber-500",
};
const STATUS_LABEL: Record<Status, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  BILLING: "Billing",
};

const initialCreateState: TableBoardState = { error: null };

export function TableStatusBoard({ tables }: { tables: BoardTable[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tables.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <AddTableForm />

      {tables.length === 0 ? (
        <p className="text-sm text-gray-500">No tables set up yet — add your first one above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {tables.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={`flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-transform active:scale-[0.98] ${STATUS_STYLE[t.status]}`}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[t.status]}`} />
                {STATUS_LABEL[t.status]}
              </span>
              <span className="text-lg font-bold">{t.label}</span>
              {t.seats != null && <span className="text-xs opacity-75">{t.seats} seats</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <TableDetailModal
          table={selected}
          allTables={tables}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function AddTableForm() {
  const [state, action, pending] = useActionState(createTableAction, initialCreateState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:bg-[#241d17]" key={state.error ? "err" : "form"}>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Table name/number
        <input
          name="label"
          required
          placeholder="e.g. 12 or Patio 1"
          className="min-h-[40px] rounded-md border border-gray-300 px-2.5 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Seats (optional)
        <input
          name="seats"
          type="number"
          min="1"
          step="1"
          className="min-h-[40px] w-24 rounded-md border border-gray-300 px-2.5 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent"
        />
      </label>
      <button type="submit" disabled={pending} className="min-h-[40px] rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Adding…" : "+ Add table"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function TableDetailModal({
  table,
  allTables,
  onClose,
}: {
  table: BoardTable;
  allTables: BoardTable[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState("");

  const destinations = allTables.filter((t) => t.id !== table.id && t.status === "AVAILABLE");

  function changeStatus(status: Status) {
    setError(null);
    startTransition(async () => {
      const res = await setTableStatusAction(table.id, status);
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  function handleTransfer() {
    if (!transferTo) return;
    setError(null);
    startTransition(async () => {
      const res = await transferTableAction(table.id, transferTo);
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  function handleDelete() {
    if (!window.confirm(`Remove table "${table.label}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteTableAction(table.id);
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl dark:bg-[#1c150f]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Table {table.label}</h3>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-600">Status</span>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => changeStatus(s)}
                className={`min-h-[44px] rounded-md border-2 text-sm font-semibold disabled:opacity-50 ${
                  table.status === s ? STATUS_STYLE[s] : "border-gray-200 text-gray-600"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-600">Transfer to another table</span>
          <div className="flex gap-2">
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              className="min-h-[40px] flex-1 rounded-md border border-gray-300 px-2.5 text-sm dark:bg-transparent"
            >
              <option value="">Choose…</option>
              {destinations.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleTransfer}
              disabled={pending || !transferTo}
              className="min-h-[40px] rounded-md bg-indigo-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Transfer
            </button>
          </div>
          {destinations.length === 0 && <p className="text-xs text-gray-500">No other available tables to transfer to.</p>}
        </div>

        <Link
          href={`/dashboard?table=${encodeURIComponent(table.label)}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          View orders at this table →
        </Link>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending || table.status !== "AVAILABLE"}
            title={table.status !== "AVAILABLE" ? "Mark the table available before removing it" : undefined}
            className="min-h-[44px] flex-1 rounded-md border border-red-300 text-sm font-medium text-red-700 disabled:opacity-40"
          >
            Remove table
          </button>
          <button type="button" onClick={onClose} className="min-h-[44px] flex-1 rounded-md bg-gray-100 text-sm font-medium text-gray-700 dark:bg-white/10">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
