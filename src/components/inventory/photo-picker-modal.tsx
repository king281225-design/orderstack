"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  searchProductStockPhotosAction,
  uploadProductPhotoAction,
  type StockPhotoState,
  type UploadPhotoState,
} from "@/app/dashboard/inventory/actions";

const initialStockPhotoState: StockPhotoState = { error: null, results: null };
const initialUploadState: UploadPhotoState = { error: null, imageUrl: null };

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

export type PhotoPick = { url: string; file?: File };

/**
 * A single modal for setting a product's photo, either by uploading one or
 * by searching Pexels stock photos — used by the Add/Edit Product forms and
 * the bill-scan "new item" sheet alike. Always a modal (fixed, full-viewport)
 * rather than an inline panel: an earlier inline version rendered its own
 * <form> inside the surrounding Add/Edit Product <form>, which is invalid
 * HTML — the browser silently breaks a nested <form> apart, so Search never
 * actually fired. A modal sidesteps that regardless of how cramped the
 * calling form's own layout is, and gives real room for photo thumbnails.
 *
 * onPick receives the original File too when the photo came from a local
 * upload (not when it came from Pexels) — callers that want to run AI vision
 * on the exact bytes (see product-forms.tsx's "Suggest from photo") can
 * reuse that File directly instead of re-fetching the now-uploaded URL,
 * which would otherwise risk a CORS-blocked read for a cross-origin URL.
 */
export function PhotoPickerModal({
  stockPhotoSearchEnabled,
  onPick,
  onClose,
}: {
  stockPhotoSearchEnabled: boolean;
  onPick: (pick: PhotoPick) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"upload" | "search">("upload");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full flex-col gap-3 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-2xl dark:bg-[#1c150f]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Add a photo</h3>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            ✕
          </button>
        </div>

        {stockPhotoSearchEnabled && (
          <div className="flex gap-1 rounded-md bg-gray-100 p-1 text-sm dark:bg-white/5">
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`flex-1 rounded px-3 py-1.5 font-medium ${tab === "upload" ? "bg-white shadow dark:bg-black/40" : "text-gray-600"}`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setTab("search")}
              className={`flex-1 rounded px-3 py-1.5 font-medium ${tab === "search" ? "bg-white shadow dark:bg-black/40" : "text-gray-600"}`}
            >
              🔍 Search photos
            </button>
          </div>
        )}

        {tab === "upload" ? <UploadTab onPick={onPick} /> : <SearchTab onPick={onPick} />}
      </div>
    </div>
  );
}

function UploadTab({ onPick }: { onPick: (pick: PhotoPick) => void }) {
  const [state, dispatch, pending] = useActionState(uploadProductPhotoAction, initialUploadState);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);

  function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Use a JPEG, PNG, WEBP, GIF or HEIC photo.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That photo is too large — up to 8MB.");
      return;
    }
    setPickedFile(file);
    const fd = new FormData();
    fd.append("photo", file);
    startTransition(() => dispatch(fd));
  }

  // Fires onPick once the upload action resolves with a real URL — an
  // effect (not a call during render) since it's reacting to the action
  // state settling, same "external state -> callback" shape any other
  // useEffect here follows.
  useEffect(() => {
    if (state.imageUrl) onPick({ url: state.imageUrl, file: pickedFile ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onPick closes the modal on first call; re-running for a stable pickedFile/onPick identity is not needed
  }, [state.imageUrl]);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
      />
      {pending && <p className="text-xs text-gray-500">Uploading…</p>}
      {(error || state.error) && <p className="text-xs text-red-600">{error ?? state.error}</p>}
      <p className="text-xs text-gray-500">JPEG, PNG, WEBP, GIF or HEIC — up to 8MB.</p>
    </div>
  );
}

function SearchTab({ onPick }: { onPick: (pick: PhotoPick) => void }) {
  const [query, setQuery] = useState("");
  const [state, dispatch, pending] = useActionState(searchProductStockPhotosAction, initialStockPhotoState);
  const [, startTransition] = useTransition();

  function runSearch() {
    const fd = new FormData();
    fd.set("query", query);
    startTransition(() => dispatch(fd));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="e.g. chocolate croissant"
          autoFocus
          className="min-h-[40px] flex-1 rounded-md border border-gray-300 px-2.5 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={pending || !query.trim()}
          className="min-h-[40px] rounded-md bg-indigo-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "…" : "Search"}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.results && state.results.length === 0 && <p className="text-xs text-gray-500">No photos found — try a different search.</p>}
      {state.results && state.results.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {state.results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick({ url: r.fullUrl })}
              className="aspect-square overflow-hidden rounded-md border border-gray-200 hover:ring-2 hover:ring-indigo-500"
              title={`Photo by ${r.photographer}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.thumbUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
