"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  uploadMenuDocumentAction,
  removeMenuDocumentAction,
  type MenuDocActionState,
} from "@/app/dashboard/menu/actions";

const initialState: MenuDocActionState = { error: null };

export function UploadMenuDocumentForm({
  menuDocumentUrl,
}: {
  menuDocumentUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(uploadMenuDocumentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Hardcopy menu (optional)</h3>
      <p className="mb-3 text-xs text-gray-500">
        Haven&apos;t added every item yet? Upload a photo or PDF of your existing menu — customers
        will see a link to it on your storefront.
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
          className="rounded-md border border-gray-300 px-3 py-1 text-sm file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Uploading…" : menuDocumentUrl ? "Replace" : "Upload"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
