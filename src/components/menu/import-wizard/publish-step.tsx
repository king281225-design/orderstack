"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PublishWizardState } from "@/app/dashboard/menu/import/actions";
import { getMenuQrDataUrlAction } from "@/app/dashboard/menu/import/actions";
import { PrintButton } from "@/components/print-button";
import type { EditableCategory, EditableItem } from "./types";

function buildPublishPayload(categories: EditableCategory[]) {
  const mapItems = (items: EditableItem[]) =>
    items
      .filter((i) => i.include)
      .map((i) => ({
        name: i.name,
        description: i.description,
        priceRupees: i.variants && i.variants.length > 0 ? null : i.priceRupees,
        variants: i.variants && i.variants.length > 0 ? i.variants : null,
        isVeg: i.isVeg,
        tags: i.tags,
        imageUrl: i.imageUrl,
      }));

  return categories
    .map((c) => ({
      name: c.name,
      items: mapItems(c.items),
      subcategories: c.subcategories
        .map((sc) => ({ name: sc.name, items: mapItems(sc.items), subcategories: [] }))
        .filter((sc) => sc.items.length > 0),
    }))
    .filter((c) => c.items.length > 0 || c.subcategories.length > 0);
}

export function PublishStep({
  categories,
  tenantSlug,
  publishAction,
  publishState,
  publishing,
  onBack,
}: {
  categories: EditableCategory[];
  tenantSlug: string;
  publishAction: (formData: FormData) => void;
  publishState: PublishWizardState;
  publishing: boolean;
  onBack: () => void;
}) {
  const included = categories.reduce(
    (n, c) =>
      n +
      c.items.filter((i) => i.include).length +
      c.subcategories.reduce((sn, sc) => sn + sc.items.filter((i) => i.include).length, 0),
    0,
  );

  const published = publishState.publishedCount !== null && publishState.publishedCount > 0 && !publishState.error;
  const menuUrl = typeof window !== "undefined" ? `${window.location.origin}/r/${tenantSlug}` : `/r/${tenantSlug}`;

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // A ref (not state) tracks what's already been requested — setState only
  // ever happens inside the async .then() callback below, the pattern the
  // set-state-in-effect rule itself calls out as fine ("calling setState in
  // a callback function when external state changes"), never synchronously
  // in the effect body.
  const qrRequestedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!published || qrRequestedFor.current === menuUrl) return;
    qrRequestedFor.current = menuUrl;
    getMenuQrDataUrlAction(menuUrl).then(setQrDataUrl);
  }, [published, menuUrl]);

  if (published) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Published {publishState.publishedCount} item{publishState.publishedCount === 1 ? "" : "s"} 🎉
        </h2>
        {publishState.skippedItems.length > 0 && (
          <p className="mt-2 text-sm text-amber-700">
            {publishState.skippedItems.length} item{publishState.skippedItems.length === 1 ? "" : "s"} needed a
            price and were skipped: {publishState.skippedItems.map((s) => s.name).join(", ")}.
          </p>
        )}
        <p className="mt-3 text-sm text-gray-600">Your live menu is ready to share:</p>
        <a
          href={menuUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block text-sm font-medium text-indigo-600 hover:underline"
        >
          {menuUrl}
        </a>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="QR code for your live menu" className="mx-auto mt-4 h-40 w-40" />
        )}
        <div className="mt-4 flex items-center justify-center gap-2">
          <PrintButton>Print this page</PrintButton>
          <Link
            href="/dashboard/menu"
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <h2 className="mb-1 text-sm font-semibold text-gray-900">Ready to publish</h2>
      <p className="mb-3 text-xs text-gray-500">
        {included} item{included === 1 ? "" : "s"} will be added to your live menu at{" "}
        <span className="font-medium">/r/{tenantSlug}</span>.
      </p>
      <form
        action={(formData) => {
          formData.set("categoriesJson", JSON.stringify(buildPublishPayload(categories)));
          publishAction(formData);
        }}
      >
        {publishState.error && <p className="mb-2 text-sm text-red-600">{publishState.error}</p>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={publishing || included === 0}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {publishing ? "Publishing…" : `Publish ${included} item${included === 1 ? "" : "s"}`}
          </button>
        </div>
      </form>
    </div>
  );
}
