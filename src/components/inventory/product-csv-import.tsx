"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { importStockItemsAction, type ImportProductsState } from "@/app/dashboard/inventory/actions";
import { parseProductCsv, type ProductCsvRow } from "@/lib/product-csv-import";

type Row = ProductCsvRow & { key: number };

const inputCls =
  "w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent";
const btnCls =
  "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50";

export function ProductCsvImport({ existingSkus }: { existingSkus: string[] }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [unknownHeaders, setUnknownHeaders] = useState<string[]>([]);
  const [result, setResult] = useState<ImportProductsState | null>(null);
  const [pending, startTransition] = useTransition();

  const knownSkus = new Set(existingSkus.map((s) => s.toLowerCase()));

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after fixing it
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    const { rows: parsed, unknownHeaders: unknown } = parseProductCsv(text);
    setUnknownHeaders(unknown);
    setRows(parsed.map((p, i) => ({ ...p, key: i })));
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((prev) => prev?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null);
  }

  function remove(key: number) {
    setRows((prev) => prev?.filter((r) => r.key !== key) ?? null);
  }

  function save() {
    const valid = rows?.filter((r) => r.name.trim() && r.sellingPriceRupees != null && r.sellingPriceRupees > 0);
    if (!valid || valid.length === 0) return;
    const payload = JSON.stringify(
      valid.map((r) => ({
        name: r.name,
        sku: r.sku,
        categoryName: r.category,
        purchasePriceRupees: r.purchasePriceRupees,
        sellingPriceRupees: r.sellingPriceRupees,
        stockQty: r.stockQty ?? 0,
        lowStockThreshold: r.lowStockThreshold ?? 0,
      })),
    );
    startTransition(async () => {
      const res = await importStockItemsAction(payload);
      setResult(res);
      if (!res.error) {
        setRows(null);
        setFileName(null);
      }
    });
  }

  const summary = result?.summary;
  const readyCount = rows?.filter((r) => r.problems.length === 0).length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">
        Upload a .csv file — one product per row, any column order. Recognised columns: name, SKU, category, purchase
        price, selling price, stock quantity, low-stock alert level. You review everything before it&apos;s saved.
        (Excel files: export as CSV first.)
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className={`${btnCls} cursor-pointer`}>
          Choose CSV file
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </label>
        {fileName && <span className="text-xs text-gray-500">{fileName}</span>}
      </div>

      {unknownHeaders.length > 0 && (
        <p className="text-xs text-amber-700">
          Column{unknownHeaders.length === 1 ? "" : "s"} not recognised and ignored: {unknownHeaders.join(", ")}
        </p>
      )}

      {rows && rows.length === 0 && <p className="text-sm text-amber-700">No product rows found in that file.</p>}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-900">
            Found {rows.length} row{rows.length === 1 ? "" : "s"} ({readyCount} ready) — check and fix anything, then
            save.
          </p>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-1.5">Product</th>
                  <th className="w-28 px-2 py-1.5">SKU</th>
                  <th className="w-32 px-2 py-1.5">Category</th>
                  <th className="w-24 px-2 py-1.5">Purchase ₹</th>
                  <th className="w-24 px-2 py-1.5">Selling ₹</th>
                  <th className="w-20 px-2 py-1.5">Stock</th>
                  <th className="w-20 px-2 py-1.5">Alert at</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const skuTaken = r.sku ? knownSkus.has(r.sku.toLowerCase()) : false;
                  return (
                    <tr key={r.key} className="border-b border-gray-100 align-top last:border-0">
                      <td className="px-2 py-1.5">
                        <input value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} className={inputCls} />
                        {r.problems.length > 0 && (
                          <ul className="mt-0.5 list-disc pl-4 text-xs text-red-600">
                            {r.problems.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        )}
                        {skuTaken && <p className="mt-0.5 text-xs text-indigo-600">Existing SKU — this will update that product.</p>}
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.sku ?? ""} onChange={(e) => update(r.key, { sku: e.target.value || null })} className={inputCls} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={r.category ?? ""} onChange={(e) => update(r.key, { category: e.target.value || null })} className={inputCls} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={r.purchasePriceRupees ?? ""}
                          onChange={(e) => update(r.key, { purchasePriceRupees: e.target.value === "" ? null : Number(e.target.value) })}
                          className={inputCls}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={r.sellingPriceRupees ?? ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : Number(e.target.value);
                            const problems = r.problems.filter((p) => p !== "Missing or invalid selling price");
                            if (value === null || value <= 0) problems.push("Missing or invalid selling price");
                            update(r.key, { sellingPriceRupees: value, problems });
                          }}
                          className={inputCls}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={r.stockQty ?? ""}
                          onChange={(e) => update(r.key, { stockQty: e.target.value === "" ? null : Number(e.target.value) })}
                          className={inputCls}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={r.lowStockThreshold ?? ""}
                          onChange={(e) => update(r.key, { lowStockThreshold: e.target.value === "" ? null : Number(e.target.value) })}
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
            <button type="button" onClick={save} disabled={pending || readyCount === 0} className={btnCls}>
              {pending ? "Saving…" : `Save ${readyCount} product${readyCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
      {summary && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          <p className="font-semibold">
            Done — {summary.created} added{summary.updated > 0 ? `, ${summary.updated} updated` : ""}.
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
