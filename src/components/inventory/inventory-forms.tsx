"use client";

import { useActionState, useState, useTransition } from "react";
import {
  adjustStockAction,
  createIngredientAction,
  createStationAction,
  deleteIngredientAction,
  saveRecipeAction,
  setAutoHideAction,
  updateIngredientAction,
  type InventoryActionState,
} from "@/app/dashboard/inventory/actions";

const initial: InventoryActionState = { error: null };
const UNITS = ["g", "kg", "ml", "l", "pcs"];

const inputCls =
  "rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent";
const btnCls =
  "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50";

function Msg({ state }: { state: InventoryActionState }) {
  if (state.error) return <p className="text-xs text-red-600">{state.error}</p>;
  if (state.ok) return <p className="text-xs text-green-600">Saved.</p>;
  return null;
}

export function AddIngredientForm() {
  const [state, action, pending] = useActionState(createIngredientAction, initial);
  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-6" key={state.ok ? "reset" : "form"}>
      <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-gray-600">
        Ingredient
        <input name="name" required placeholder="e.g. Paneer" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Unit
        <select name="unit" defaultValue="kg" className={inputCls}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Opening stock
        <input name="openingStock" type="number" step="any" min="0" defaultValue="0" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Alert at or below
        <input name="lowStockThreshold" type="number" step="any" min="0" defaultValue="0" className={inputCls} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Cost / unit (₹, optional)
        <input name="costPerUnit" type="number" step="any" min="0" className={inputCls} />
      </label>
      <div className="col-span-full flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Adding…" : "Add ingredient"}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function StockAdjustForm({ ingredientId, unit }: { ingredientId: string; unit: string }) {
  const [state, action, pending] = useActionState(adjustStockAction.bind(null, ingredientId), initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2" key={state.ok ? "reset" : "form"}>
      <select name="kind" defaultValue="PURCHASE" className={inputCls} aria-label="Change type">
        <option value="PURCHASE">Received stock (+)</option>
        <option value="WASTE">Wastage (−)</option>
        <option value="ADJUSTMENT">Stock count correction (+/−)</option>
      </select>
      <input
        name="quantity"
        type="number"
        step="any"
        required
        placeholder={`Qty (${unit})`}
        aria-label="Quantity"
        className={`${inputCls} w-28`}
      />
      <input name="note" placeholder="Note (optional)" aria-label="Note" className={`${inputCls} w-40`} />
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "…" : "Update"}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function EditIngredientForm({
  id,
  name,
  unit,
  lowStockThreshold,
  costPerUnit,
}: {
  id: string;
  name: string;
  unit: string;
  lowStockThreshold: string;
  costPerUnit: string;
}) {
  const [state, action, pending] = useActionState(updateIngredientAction.bind(null, id), initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="name" defaultValue={name} required aria-label="Name" className={`${inputCls} w-40`} />
      <select name="unit" defaultValue={unit} className={inputCls} aria-label="Unit">
        {UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      <label className="flex flex-col gap-0.5 text-[11px] text-gray-500">
        Alert at or below
        <input
          name="lowStockThreshold"
          type="number"
          step="any"
          min="0"
          defaultValue={lowStockThreshold}
          className={`${inputCls} w-28`}
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[11px] text-gray-500">
        Cost / unit (₹)
        <input name="costPerUnit" type="number" step="any" min="0" defaultValue={costPerUnit} className={`${inputCls} w-24`} />
      </label>
      <button type="submit" disabled={pending} className={btnCls}>
        Save
      </button>
      <Msg state={state} />
    </form>
  );
}

export function DeleteIngredientButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Delete "${name}"? Its recipe usage and stock history are removed too.`)) {
          startTransition(() => deleteIngredientAction(id));
        }
      }}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      Delete
    </button>
  );
}

export function AutoHideToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={enabled}
        disabled={pending}
        onChange={(e) => startTransition(() => setAutoHideAction(e.target.checked))}
        className="mt-0.5"
      />
      <span>
        Automatically mark a menu item unavailable when one of its ingredients runs out
        <span className="block text-xs text-gray-500">
          Off by default — stock counts never block orders unless you turn this on. Turning items back on is manual.
        </span>
      </span>
    </label>
  );
}

type RecipeIngredient = { id: string; name: string; unit: string };
type RecipeRow = { ingredientId: string; quantity: string };

export function RecipeEditor({
  itemId,
  ingredients,
  initialLines,
}: {
  itemId: string;
  ingredients: RecipeIngredient[];
  initialLines: RecipeRow[];
}) {
  const [state, action, pending] = useActionState(saveRecipeAction.bind(null, itemId), initial);
  const [rows, setRows] = useState<RecipeRow[]>(initialLines);
  const unitOf = (id: string) => ingredients.find((i) => i.id === id)?.unit ?? "";
  const used = new Set(rows.map((r) => r.ingredientId));

  return (
    <form action={action} className="flex flex-col gap-2">
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(rows.filter((r) => r.ingredientId).map((r) => ({ ...r, quantity: Number(r.quantity) })))}
      />
      {rows.length === 0 && <p className="text-xs text-gray-500">No recipe yet — this item won&apos;t deduct any stock.</p>}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            value={row.ingredientId}
            onChange={(e) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ingredientId: e.target.value } : r)))}
            className={inputCls}
            aria-label="Ingredient"
          >
            <option value="">Choose ingredient…</option>
            {ingredients.map((ing) => (
              <option key={ing.id} value={ing.id} disabled={used.has(ing.id) && ing.id !== row.ingredientId}>
                {ing.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            min="0"
            value={row.quantity}
            onChange={(e) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r)))}
            placeholder="Qty per serving"
            aria-label="Quantity per serving"
            className={`${inputCls} w-32`}
          />
          <span className="text-xs text-gray-500">{unitOf(row.ingredientId)} per serving</span>
          <button
            type="button"
            onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { ingredientId: "", quantity: "" }])}
          disabled={ingredients.length === 0}
          className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
        >
          + Add ingredient
        </button>
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Saving…" : "Save recipe"}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function AddStationForm() {
  const [state, action, pending] = useActionState(createStationAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" key={state.ok ? "reset" : "form"}>
      <input name="name" required placeholder="e.g. Grill, Tandoor, Bar" className={`${inputCls} w-56`} />
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Adding…" : "Add station"}
      </button>
      <Msg state={state} />
    </form>
  );
}
