"use client";

import { useActionState, useState, useTransition } from "react";
import {
  previewAiMenuImportAction,
  confirmAiMenuImportAction,
  type AiMenuImportState,
} from "@/app/dashboard/menu/actions";

const initialState: AiMenuImportState = { error: null, categories: null };

type EditableItem = { name: string; description: string; priceRupees: number; include: boolean };
type EditableCategory = { name: string; items: EditableItem[] };

// Same guard as UploadMenuDocumentForm, for the same reason — a real photo
// or PDF of a paper menu routinely runs this big, and without a client-side
// check the browser uploads the whole thing before the framework's own
// body-size limit rejects it with a raw, confusing error.
const MAX_BYTES = 20 * 1024 * 1024;

export function AiMenuImportForm({ claudeConfigured }: { claudeConfigured: boolean }) {
  const [state, formAction, extracting] = useActionState(previewAiMenuImportAction, initialState);
  const [edited, setEdited] = useState<EditableCategory[] | null>(null);
  const [isConfirming, startConfirm] = useTransition();
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.size > MAX_BYTES) {
      setFileError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — please use one under 20MB (a lower-resolution photo, or a smaller PDF).`,
      );
    } else {
      setFileError(null);
    }
  }

  // Seed the editable review state the moment a new extraction succeeds.
  // Comparing against the last-seen categories array (rather than syncing in
  // a useEffect) is the render-time-adjust pattern already used elsewhere in
  // this codebase for exactly this reason — satisfies both
  // react-hooks/set-state-in-effect and react-hooks/refs.
  const [seededFrom, setSeededFrom] = useState<AiMenuImportState["categories"]>(null);
  if (state.categories && state.categories !== seededFrom) {
    setSeededFrom(state.categories);
    setEdited(
      state.categories.map((c) => ({
        name: c.name,
        items: c.items.map((i) => ({ ...i, include: true })),
      })),
    );
    setJustAdded(null);
  }

  function updateItem(catIdx: number, itemIdx: number, patch: Partial<EditableItem>) {
    setEdited((prev) => {
      if (!prev) return prev;
      const next = prev.map((c) => ({ ...c, items: [...c.items] }));
      next[catIdx].items[itemIdx] = { ...next[catIdx].items[itemIdx], ...patch };
      return next;
    });
  }

  function updateCategoryName(catIdx: number, name: string) {
    setEdited((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[catIdx] = { ...next[catIdx], name };
      return next;
    });
  }

  function handleConfirm() {
    if (!edited) return;
    const payload = edited
      .map((c) => ({ name: c.name, items: c.items.filter((i) => i.include) }))
      .filter((c) => c.items.length > 0);
    const includedCount = payload.reduce((n, c) => n + c.items.length, 0);
    const formData = new FormData();
    formData.set("categoriesJson", JSON.stringify(payload));
    startConfirm(async () => {
      await confirmAiMenuImportAction(formData);
      setEdited(null);
      // Mark this extraction as already handled by pointing seededFrom at
      // it, rather than resetting to null — state.categories itself still
      // holds the same extraction result (confirming doesn't clear it), so
      // resetting seededFrom to null would make the very next render's
      // seed-guard (state.categories !== seededFrom) true again and
      // silently repopulate `edited`, undoing this close. Hit for real:
      // this is the same bug that made Cancel appear broken below.
      setSeededFrom(state.categories);
      setJustAdded(includedCount);
    });
  }

  function handleCancel() {
    setEdited(null);
    // See the comment in handleConfirm above — must point at the current
    // extraction, not null, or the next render immediately reopens the
    // review screen this was just meant to close.
    setSeededFrom(state.categories);
  }

  if (edited) {
    const includedCount = edited.reduce((n, c) => n + c.items.filter((i) => i.include).length, 0);
    return (
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Review AI-extracted menu</h3>
        <p className="mb-3 text-xs text-gray-500">
          Everything below is already grouped into categories and checked — if it looks right, add
          it all with one click. Only expand the list if something needs fixing (AI reading of a
          photo can misjudge a price or split/merge an item).
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-gray-50 p-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming || includedCount === 0}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isConfirming
              ? "Adding…"
              : `Add all ${includedCount} item${includedCount === 1 ? "" : "s"} now`}
          </button>
          <span className="text-xs text-gray-500">
            Adds every category and item below exactly as extracted.
          </span>
        </div>
        <div className="flex max-h-96 flex-col gap-4 overflow-y-auto">
          {edited.map((cat, catIdx) => (
            <div key={catIdx} className="rounded-md border border-gray-100 p-3">
              <input
                value={cat.name}
                onChange={(e) => updateCategoryName(catIdx, e.target.value)}
                className="mb-2 w-full rounded border border-gray-200 px-2 py-1 text-sm font-semibold"
              />
              <ul className="flex flex-col gap-2">
                {cat.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex flex-wrap items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.include}
                      onChange={(e) => updateItem(catIdx, itemIdx, { include: e.target.checked })}
                    />
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(catIdx, itemIdx, { name: e.target.value })}
                      className="min-w-[8rem] flex-1 rounded border border-gray-200 px-2 py-1"
                      placeholder="Item name"
                    />
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(catIdx, itemIdx, { description: e.target.value })}
                      className="min-w-[10rem] flex-[2] rounded border border-gray-200 px-2 py-1 text-gray-500"
                      placeholder="Description (optional)"
                    />
                    <span className="text-gray-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.priceRupees}
                      onChange={(e) =>
                        updateItem(catIdx, itemIdx, { priceRupees: Number(e.target.value) })
                      }
                      className="w-20 rounded border border-gray-200 px-2 py-1"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming || includedCount === 0}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isConfirming ? "Adding…" : `Add ${includedCount} reviewed item${includedCount === 1 ? "" : "s"} to menu`}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isConfirming}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">AI menu import</h3>
      <p className="mb-3 text-xs text-gray-500">
        Upload a photo or PDF of your existing menu and let it get read into categories and items —
        you&apos;ll review and edit the result before anything is added.
      </p>
      <form action={formAction} className="flex flex-col gap-2">
        {claudeConfigured ? (
          <fieldset className="flex flex-wrap gap-4 text-xs text-gray-600">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="method" value="free" defaultChecked />
              Free (built-in OCR reader)
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="method" value="claude" />
              Claude AI (more accurate, uses API credits)
            </label>
          </fieldset>
        ) : (
          <p className="text-xs text-gray-400">Using the free, built-in OCR reader — no API key needed.</p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <input
            name="menuPhoto"
            type="file"
            accept="image/*,application/pdf"
            required
            onChange={handleFileChange}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs"
          />
          <button
            type="submit"
            disabled={extracting || Boolean(fileError)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {extracting ? "Reading menu…" : "Extract menu"}
          </button>
        </div>
      </form>
      {(fileError || state.error) && (
        <p className="mt-2 text-sm text-red-600">{fileError || state.error}</p>
      )}
      {justAdded !== null && (
        <p className="mt-2 text-sm text-green-600">
          Added {justAdded} item{justAdded === 1 ? "" : "s"} to your menu.
        </p>
      )}
    </div>
  );
}
