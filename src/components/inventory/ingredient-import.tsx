"use client";

import { useState, useTransition } from "react";
import { importIngredientsAction, type ImportIngredientsState } from "@/app/dashboard/inventory/actions";
import { IMPORT_UNITS, parseIngredientList } from "@/lib/inventory-import";

type Row = {
  key: number;
  name: string;
  quantity: string;
  unit: string;
  lowStock: string;
  costPerUnit: string;
  note: string | null;
};

const inputCls =
  "w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent";
const btnCls =
  "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50";

const EXAMPLE = `Paneer 5 kg
Onion - 10kg
Tomato: 8 kg
2 dozen Eggs
Milk 20 litre
Cooking Oil 500 ml
Rice, 25, kg, 5, 60
Salt`;

export function IngredientImport({ existingNames }: { existingNames: string[] }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [mode, setMode] = useState<"skip" | "add">("skip");
  const [result, setResult] = useState<ImportIngredientsState | null>(null);
  const [pending, startTransition] = useTransition();

  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()));

  function readList() {
    setResult(null);
    const parsed = parseIngredientList(text);
    setRows(
      parsed.map((p, i) => ({
        key: i,
        name: p.name,
        quantity: String(p.quantity),
        unit: p.unit,
        lowStock: String(p.lowStock),
        costPerUnit: p.costPerUnit === null ? "" : String(p.costPerUnit),
        note: p.note,
      })),
    );
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((prev) => prev?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null);
  }

  function remove(key: number) {
    setRows((prev) => prev?.filter((r) => r.key !== key) ?? null);
  }

  function save() {
    if (!rows || rows.length === 0) return;
    const payload = JSON.stringify(
      rows.map((r) => ({
        name: r.name,
        unit: r.unit,
        quantity: Number(r.quantity) || 0,
        lowStock: Number(r.lowStock) || 0,
        costPerUnit: r.costPerUnit.trim() === "" ? null : Number(r.costPerUnit),
      })),
    );
    startTransition(async () => {
      const res = await importIngredientsAction(payload, mode);
      setResult(res);
      if (!res.error) {
        setRows(null);
        setText("");
      }
    });
  }

  const summary = result?.summary;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">
        Paste your stock list — one ingredient per line, or straight from Excel / Google Sheets — and the name, quantity
        and unit are picked out for you. You review everything before it&apos;s saved.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={EXAMPLE}
        className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={readList} disabled={!text.trim()} className={btnCls}>
          Read list
        </button>
        <button type="button" onClick={() => setText(EXAMPLE)} className="text-xs font-medium text-indigo-600 hover:underline">
          Try an example
        </button>
        <span className="text-xs text-gray-500">
          Formats: <code>Paneer 5 kg</code> · <code>5 kg Paneer</code> · <code>Paneer, 5, kg, 2, 320</code> (name, qty,
          unit, low-stock alert, cost per unit)
        </span>
      </div>

      {rows && rows.length === 0 && (
        <p className="text-sm text-amber-700">No ingredients found in that text. Check each line has a name.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-900">
            Found {rows.length} ingredient{rows.length === 1 ? "" : "s"} — check and fix anything, then save.
          </p>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-1.5">Ingredient</th>
                  <th className="w-24 px-2 py-1.5">Quantity</th>
                  <th className="w-20 px-2 py-1.5">Unit</th>
                  <th className="w-24 px-2 py-1.5">Alert at</th>
                  <th className="w-24 px-2 py-1.5">Cost ₹/unit</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isExisting = existing.has(r.name.trim().toLowerCase());
                  return (
                    <tr key={r.key} className="border-b border-gray-100 align-top last:border-0">
                      <td className="px-2 py-1.5">
                        <input value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} className={inputCls} />
                        {isExisting && (
                          <p className="mt-0.5 text-xs text-indigo-600">
                            Already in inventory — {mode === "add" ? "quantity will be added" : "will be skipped"}
                          </p>
                        )}
                        {r.note && <p className="mt-0.5 text-xs text-amber-700">{r.note}</p>}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={r.quantity}
                          onChange={(e) => update(r.key, { quantity: e.target.value })}
                          className={inputCls}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={r.unit} onChange={(e) => update(r.key, { unit: e.target.value })} className={inputCls}>
                          {IMPORT_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={r.lowStock}
                          onChange={(e) => update(r.key, { lowStock: e.target.value })}
                          className={inputCls}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={r.costPerUnit}
                          onChange={(e) => update(r.key, { costPerUnit: e.target.value })}
                          className={inputCls}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => remove(r.key)} className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              If an ingredient already exists:
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "skip" | "add")}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:bg-transparent"
              >
                <option value="skip">Leave it as it is</option>
                <option value="add">Add the quantity to its stock</option>
              </select>
            </label>
            <button type="button" onClick={save} disabled={pending} className={btnCls}>
              {pending ? "Saving…" : `Save ${rows.length} ingredient${rows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
      {summary && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          <p className="font-semibold">
            Done — {summary.created} added
            {summary.restocked > 0 ? `, ${summary.restocked} restocked` : ""}
            {summary.skipped.length > 0 ? `, ${summary.skipped.length} skipped (already in inventory)` : ""}.
          </p>
          {summary.problems.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-red-700">
              {summary.problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
