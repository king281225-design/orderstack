"use client";

export type VariantRow = { label: string; price: string };

const isHalfFull = (rows: VariantRow[]) =>
  rows.length === 2 && rows[0].label === "Half" && rows[1].label === "Full";

/**
 * Shared dynamic-rows editor for an item's size/portion variants (e.g.
 * Half/Full), used by both the "Add item" form and each item's inline edit
 * form. Client-side state only — the parent form serializes `rows` to JSON
 * into a hidden `variantsJson` input at submit time (see its own
 * `<input type="hidden">` next to this component), which
 * createItemAction/updateItemAction parse server-side. When rows are
 * present, the server computes the item's own priceCents as the lowest
 * variant's price (same rule the AI-import wizard already uses), so the
 * plain "Price" field above becomes a fallback that's only used when no
 * variants are set.
 *
 * Half/Full is by far the most common case (most Indian restaurant menus
 * price starters/mains that way), so it gets its own one-click toggle that
 * shows exactly two clearly-labeled price fields — no typing "Half"/"Full"
 * by hand. "+ Add a variant" stays for anything else (Regular/Large, a
 * third size, etc.) and both can be mixed in the same item.
 */
export function VariantRowsEditor({
  rows,
  onChange,
}: {
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
}) {
  function updateRow(i: number, patch: Partial<VariantRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }
  function addRow() {
    onChange([...rows, { label: "", price: "" }]);
  }
  function addHalfFull() {
    onChange([...rows, { label: "Half", price: "" }, { label: "Full", price: "" }]);
  }

  const halfFullMode = isHalfFull(rows);

  return (
    <div className="col-span-full flex flex-col gap-1.5 text-xs font-medium text-gray-600">
      <span>Size/portion pricing (optional)</span>

      {halfFullMode ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5">
            Half price (₹)
            <input
              value={rows[0].price}
              onChange={(e) => updateRow(0, { price: e.target.value })}
              type="number"
              step="0.01"
              min="0"
              placeholder="₹"
              className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5">
            Full price (₹)
            <input
              value={rows[1].price}
              onChange={(e) => updateRow(1, { price: e.target.value })}
              type="number"
              step="0.01"
              min="0"
              placeholder="₹"
              className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </label>
          <button type="button" onClick={() => onChange([])} className="text-xs font-medium text-red-600 hover:underline">
            Remove sizes
          </button>
        </div>
      ) : (
        rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={row.label}
              onChange={(e) => updateRow(i, { label: e.target.value })}
              placeholder="Label (e.g. Regular)"
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
            <input
              value={row.price}
              onChange={(e) => updateRow(i, { price: e.target.value })}
              type="number"
              step="0.01"
              min="0"
              placeholder="Price (₹)"
              className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
            <button type="button" onClick={() => removeRow(i)} className="text-xs font-medium text-red-600 hover:underline">
              Remove
            </button>
          </div>
        ))
      )}

      {!halfFullMode && (
        <div className="flex flex-wrap gap-2">
          {rows.length === 0 && (
            <button
              type="button"
              onClick={addHalfFull}
              className="w-fit rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              🍽 Half &amp; Full pricing
            </button>
          )}
          <button
            type="button"
            onClick={addRow}
            className="w-fit rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            + Add a custom size
          </button>
        </div>
      )}
    </div>
  );
}
