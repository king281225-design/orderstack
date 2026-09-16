"use client";

import { useEffect, useMemo, useState } from "react";
import type { PageThumbnail } from "@/lib/ai/menu-import";
import { ALLOWED_TAGS, REVIEW_CONFIDENCE_THRESHOLD, type MenuItemTag } from "@/lib/menu-wizard/constants";
import { findDuplicateGroups, type DuplicateGroup } from "@/lib/menu-wizard/duplicates";
import { findCategorySynonymHint } from "@/lib/menu-wizard/category-synonyms";
import {
  cloneCategories,
  getItemAtPath,
  setItemAtPath,
  removeItemAtPath,
  type EditableCategory,
  type EditableItem,
} from "./types";

function comparePaths(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? -1;
    const bv = b[i] ?? -1;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function mergeIsVeg(a: boolean | null, b: boolean | null): boolean | null {
  if (a === b) return a;
  if (a === null) return b;
  if (b === null) return a;
  return null;
}

function mergeTwoItems(a: EditableItem, b: EditableItem): EditableItem {
  const variants = a.variants && a.variants.length > 0 ? a.variants : b.variants && b.variants.length > 0 ? b.variants : null;
  const priceRupees = variants ? null : a.priceRupees ?? b.priceRupees;
  const hasPrice = priceRupees !== null || Boolean(variants && variants.length > 0);
  const confidence = Math.max(a.confidence, b.confidence);
  return {
    ...a,
    description: a.description.length >= b.description.length ? a.description : b.description,
    priceRupees,
    variants,
    tags: Array.from(new Set([...a.tags, ...b.tags])) as MenuItemTag[],
    isVeg: mergeIsVeg(a.isVeg, b.isVeg),
    confidence,
    needsReview: !hasPrice || confidence < REVIEW_CONFIDENCE_THRESHOLD,
    imageUrl: a.imageUrl ?? b.imageUrl,
  };
}

function mergeDuplicateGroup(categories: EditableCategory[], group: DuplicateGroup<EditableItem>): EditableCategory[] {
  let next = cloneCategories(categories);
  const [primaryRef, ...restRefs] = group.refs;
  let merged = getItemAtPath(next, primaryRef.path);
  for (const r of restRefs) merged = mergeTwoItems(merged, getItemAtPath(next, r.path));
  next = setItemAtPath(next, primaryRef.path, merged);
  const sortedRest = [...restRefs].sort((x, y) => comparePaths(y.path, x.path));
  for (const r of sortedRest) next = removeItemAtPath(next, r.path);
  return next;
}

function nestCategoryUnder(categories: EditableCategory[], catIndex: number, targetName: string): EditableCategory[] {
  const next = cloneCategories(categories);
  const targetIndex = next.findIndex((c, i) => i !== catIndex && c.name === targetName);
  if (targetIndex === -1) return next;
  const moved = next.splice(catIndex, 1)[0];
  const adjustedTarget = targetIndex > catIndex ? targetIndex - 1 : targetIndex;
  next[adjustedTarget].subcategories.push({ name: moved.name, items: moved.items, subcategories: [] });
  return next;
}

function ItemEditor({
  item,
  path,
  onUpdate,
}: {
  item: EditableItem;
  path: number[];
  onUpdate: (path: number[], patch: Partial<EditableItem>) => void;
}) {
  const hasVariants = Boolean(item.variants && item.variants.length > 0);

  return (
    <li
      className={`flex flex-col gap-2 rounded-md border p-2.5 text-sm ${
        item.needsReview ? "border-amber-300 bg-amber-50" : "border-gray-100"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="checkbox"
          checked={item.include}
          onChange={(e) => onUpdate(path, { include: e.target.checked })}
          title="Include this item"
        />
        <input
          value={item.name}
          onChange={(e) => onUpdate(path, { name: e.target.value })}
          placeholder="Item name"
          className="min-w-[9rem] flex-1 rounded border border-gray-200 px-2 py-1"
        />
        <select
          value={item.isVeg === null ? "unknown" : item.isVeg ? "veg" : "nonveg"}
          onChange={(e) =>
            onUpdate(path, { isVeg: e.target.value === "unknown" ? null : e.target.value === "veg" })
          }
          className="rounded border border-gray-200 px-1.5 py-1 text-xs"
        >
          <option value="unknown">Veg? Unknown</option>
          <option value="veg">Veg</option>
          <option value="nonveg">Non-veg</option>
        </select>
        {item.needsReview && (
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            ⚠ Needs review
          </span>
        )}
        <span className="text-[11px] text-gray-400">{Math.round(item.confidence * 100)}% confidence</span>
      </div>

      <textarea
        value={item.description}
        onChange={(e) => onUpdate(path, { description: e.target.value })}
        rows={1}
        placeholder="Description"
        className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600"
      />

      {!hasVariants ? (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">₹</span>
          <input
            type="number"
            min="0"
            step="1"
            value={item.priceRupees ?? ""}
            placeholder="Price needs verification ⚠"
            onChange={(e) =>
              onUpdate(path, { priceRupees: e.target.value === "" ? null : Number(e.target.value) })
            }
            className={`w-40 rounded border px-2 py-1 ${
              item.priceRupees === null ? "border-amber-400 placeholder:text-amber-600" : "border-gray-200"
            }`}
          />
          <button
            type="button"
            onClick={() =>
              onUpdate(path, {
                variants: [
                  { label: "Half", priceRupees: item.priceRupees ?? 0 },
                  { label: "Full", priceRupees: item.priceRupees ?? 0 },
                ],
                priceRupees: null,
              })
            }
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            + Add sizes/variants
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {item.variants!.map((v, vi) => (
            <div key={vi} className="flex items-center gap-2">
              <input
                value={v.label}
                onChange={(e) => {
                  const next = [...item.variants!];
                  next[vi] = { ...next[vi], label: e.target.value };
                  onUpdate(path, { variants: next });
                }}
                className="w-24 rounded border border-gray-200 px-2 py-1 text-xs"
              />
              <span className="text-gray-400">₹</span>
              <input
                type="number"
                min="0"
                value={v.priceRupees}
                onChange={(e) => {
                  const next = [...item.variants!];
                  next[vi] = { ...next[vi], priceRupees: Number(e.target.value) };
                  onUpdate(path, { variants: next });
                }}
                className="w-24 rounded border border-gray-200 px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  const next = item.variants!.filter((_, i) => i !== vi);
                  onUpdate(path, { variants: next.length > 0 ? next : null, priceRupees: next.length > 0 ? null : 0 });
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onUpdate(path, { variants: [...item.variants!, { label: "", priceRupees: 0 }] })}
            className="w-fit text-xs font-medium text-indigo-600 hover:underline"
          >
            + Add another size
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {ALLOWED_TAGS.map((tag) => (
          <label key={tag} className="flex items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={item.tags.includes(tag)}
              onChange={(e) =>
                onUpdate(path, {
                  tags: e.target.checked ? [...item.tags, tag] : item.tags.filter((t) => t !== tag),
                })
              }
            />
            {tag}
          </label>
        ))}
      </div>
    </li>
  );
}

export function VerifyStep({
  categories,
  onChange,
  pageThumbnails,
  originalFiles,
  onBack,
  onNext,
}: {
  categories: EditableCategory[];
  onChange: (next: EditableCategory[]) => void;
  pageThumbnails: PageThumbnail[];
  originalFiles: File[];
  onBack: () => void;
  onNext: () => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [focusedFileIndex, setFocusedFileIndex] = useState(0);
  const [focusedPage, setFocusedPage] = useState(1);

  const duplicateGroups = useMemo(
    () => findDuplicateGroups(categories).filter((g) => !dismissed.has(g.key)),
    [categories, dismissed],
  );

  function updateItem(path: number[], patch: Partial<EditableItem>) {
    const current = getItemAtPath(categories, path);
    onChange(setItemAtPath(categories, path, { ...current, ...patch }));
  }

  function updateCategoryName(index: number, name: string) {
    const next = cloneCategories(categories);
    next[index].name = name;
    onChange(next);
  }

  function updateSubcategoryName(catIndex: number, subIndex: number, name: string) {
    const next = cloneCategories(categories);
    next[catIndex].subcategories[subIndex].name = name;
    onChange(next);
  }

  const totalIncluded = categories.reduce(
    (n, c) =>
      n +
      c.items.filter((i) => i.include).length +
      c.subcategories.reduce((sn, sc) => sn + sc.items.filter((i) => i.include).length, 0),
    0,
  );

  const thumbsForFile = useMemo(
    () => pageThumbnails.filter((t) => t.fileIndex === focusedFileIndex),
    [pageThumbnails, focusedFileIndex],
  );
  const focusedThumb = useMemo(
    () => thumbsForFile.find((t) => t.page === focusedPage) ?? thumbsForFile[0],
    [thumbsForFile, focusedPage],
  );
  const focusedOriginalFile = originalFiles[focusedFileIndex];
  const focusedIsImage = Boolean(focusedOriginalFile && focusedOriginalFile.type.startsWith("image/"));

  // Object URLs are a real browser resource — derived (not set via an
  // effect's setState) and only when there's no server-rendered data-URL
  // thumbnail to use instead; the effect below only ever revokes, on
  // cleanup, never calls setState.
  const objectUrl = useMemo(() => {
    if (focusedThumb || !focusedIsImage || !focusedOriginalFile) return null;
    return URL.createObjectURL(focusedOriginalFile);
  }, [focusedThumb, focusedIsImage, focusedOriginalFile]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const focusedImageUrl = focusedThumb?.dataUrl ?? objectUrl;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-3 lg:w-2/5">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Original</h3>
        {originalFiles.length > 1 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {originalFiles.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setFocusedFileIndex(i);
                  setFocusedPage(1);
                }}
                className={`rounded px-2 py-0.5 text-xs ${
                  i === focusedFileIndex ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                File {i + 1}
              </button>
            ))}
          </div>
        )}
        {thumbsForFile.length > 1 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {thumbsForFile.map((t) => (
              <button
                key={t.page}
                type="button"
                onClick={() => setFocusedPage(t.page)}
                className={`rounded px-2 py-0.5 text-xs ${
                  t.page === focusedPage ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                Page {t.page}
              </button>
            ))}
          </div>
        )}
        {focusedImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={focusedImageUrl} alt="Original menu page" className="max-h-[70vh] w-full rounded object-contain" />
        ) : (
          <p className="text-xs text-gray-500">No preview available for this file.</p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {duplicateGroups.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <h3 className="mb-2 text-sm font-semibold text-amber-900">
              Possible duplicates ({duplicateGroups.length})
            </h3>
            <ul className="flex flex-col gap-2">
              {duplicateGroups.map((group) => (
                <li key={group.key} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-amber-800">
                    {group.refs.map((r) => r.item.name).join(" ≈ ")}
                    {group.reason === "similar" ? " (similar names)" : " (same name)"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange(mergeDuplicateGroup(categories, group))}
                    className="rounded bg-amber-600 px-2 py-0.5 font-medium text-white"
                  >
                    Merge into one
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissed((prev) => new Set(prev).add(group.key))}
                    className="rounded border border-amber-400 px-2 py-0.5 font-medium text-amber-800"
                  >
                    Not a duplicate
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-3">
          {categories.map((cat, ci) => {
            const synonymHint = findCategorySynonymHint(cat.name);
            const otherTopLevel = categories.filter((_, i) => i !== ci).map((c) => c.name);
            return (
              <div key={ci} className="rounded-md border border-gray-100 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <input
                    value={cat.name}
                    onChange={(e) => updateCategoryName(ci, e.target.value)}
                    className="rounded border border-gray-200 px-2 py-1 text-sm font-semibold"
                  />
                  {synonymHint && (
                    <span className="text-xs text-gray-400">
                      Commonly also called &quot;{synonymHint}&quot; —{" "}
                      <button
                        type="button"
                        onClick={() => updateCategoryName(ci, synonymHint)}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        rename
                      </button>
                    </span>
                  )}
                  {cat.subcategories.length === 0 && otherTopLevel.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) onChange(nestCategoryUnder(categories, ci, e.target.value));
                      }}
                      className="ml-auto rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-500"
                    >
                      <option value="">Nest under…</option>
                      {otherTopLevel.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <ul className="flex flex-col gap-2">
                  {cat.items.map((item, ii) => (
                    <ItemEditor key={ii} item={item} path={[ci, ii]} onUpdate={updateItem} />
                  ))}
                </ul>
                {cat.subcategories.map((sub, si) => (
                  <div key={si} className="mt-3 ml-3 border-l-2 border-gray-100 pl-3">
                    <input
                      value={sub.name}
                      onChange={(e) => updateSubcategoryName(ci, si, e.target.value)}
                      className="mb-2 rounded border border-gray-200 px-2 py-1 text-xs font-semibold"
                    />
                    <ul className="flex flex-col gap-2">
                      {sub.items.map((item, ii) => (
                        <ItemEditor key={ii} item={item} path={[ci, si, ii]} onUpdate={updateItem} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={totalIncluded === 0}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Continue with {totalIncluded} item{totalIncluded === 1 ? "" : "s"} →
          </button>
        </div>
      </div>
    </div>
  );
}
