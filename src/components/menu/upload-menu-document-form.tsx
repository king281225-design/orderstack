"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import {
  uploadMenuDocumentAction,
  removeMenuDocumentAction,
  type MenuDocActionState,
} from "@/app/dashboard/menu/actions";

const initialState: MenuDocActionState = { error: null };
// Leaves headroom under next.config.ts's 25mb Server Action body limit for
// multipart/form-data overhead — checked client-side so a too-large file
// (a real thing here: full-res phone photos and multi-page PDF scans of a
// paper menu routinely run this big) gets a clear message immediately,
// instead of the browser uploading the whole thing only for the framework
// to reject it with a raw "Body exceeded Nmb limit" error page.
const MAX_BYTES = 20 * 1024 * 1024;

export function UploadMenuDocumentForm({
  menuDocumentUrl,
}: {
  menuDocumentUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(uploadMenuDocumentAction, initialState);
  const [fileError, setFileError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

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

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Hardcopy menu (optional)</h3>
      <p className="mb-3 text-xs text-gray-500">
        Haven&apos;t added every item yet? Upload a photo or PDF of your existing menu (up to
        20MB) — customers will see a link to it on your storefront.
      </p>

      {menuDocumentUrl && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <a href={menuDocumentUrl} target="_blank" rel="noreferrer" className="font-medium underline">
            View current file ↗
          </a>
          <form action={removeMenuDocumentAction}>
            <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
              Remove
            </button>
          </form>
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
        <input
          name="menuDocument"
          type="file"
          accept="image/*,application/pdf"
          required
          onChange={handleFileChange}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs"
        />
        <button
          type="submit"
          disabled={pending || Boolean(fileError)}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Uploading…" : menuDocumentUrl ? "Replace" : "Upload"}
        </button>
      </form>
      {(fileError || state.error) && (
        <p className="mt-2 text-sm text-red-600">{fileError || state.error}</p>
      )}
    </div>
  );
}
