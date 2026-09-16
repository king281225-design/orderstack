"use client";

import { useActionState, useState } from "react";
import {
  extractMenuWizardAction,
  publishMenuWizardAction,
  type ExtractWizardState,
  type PublishWizardState,
} from "@/app/dashboard/menu/import/actions";
import type { ExtractionMethod, PageThumbnail } from "@/lib/ai/menu-import";
import { MAX_UPLOAD_BYTES, MAX_WIZARD_FILES } from "@/lib/menu-wizard/constants";
import { VerifyStep } from "./verify-step";
import { DesignStep } from "./design-step";
import { PublishStep } from "./publish-step";
import { toEditableCategories, type EditableCategory, type ThemeColors } from "./types";

const initialExtractState: ExtractWizardState = { error: null, result: null };
const initialPublishState: PublishWizardState = { error: null, publishedCount: null, skippedItems: [] };

type Step = "upload" | "verify" | "design" | "publish";
const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "verify", label: "Verify" },
  { key: "design", label: "Design" },
  { key: "publish", label: "Publish" },
];

function StepIndicator({ step }: { step: Step }) {
  const activeIdx = STEP_LABELS.findIndex((s) => s.key === step);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500">
      {STEP_LABELS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
              i <= activeIdx ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
            }`}
          >
            {i + 1}
          </span>
          <span className={i === activeIdx ? "font-semibold text-gray-900" : ""}>{s.label}</span>
          {i < STEP_LABELS.length - 1 && <span className="text-gray-300">—</span>}
        </li>
      ))}
    </ol>
  );
}

export function MenuImportWizard({
  claudeConfigured,
  stockPhotoConfigured,
  tenantSlug,
  theme,
}: {
  claudeConfigured: boolean;
  stockPhotoConfigured: boolean;
  tenantSlug: string;
  theme: ThemeColors;
}) {
  const [step, setStep] = useState<Step>("upload");
  // Claude AI is now the only extraction method offered in this wizard (the
  // owner has real Anthropic API credit) — the free OCR reader stays as a
  // silent fallback only, in case ANTHROPIC_API_KEY is ever unset again, so
  // the feature degrades gracefully instead of breaking outright rather
  // than being offered as a user-facing choice.
  const method: ExtractionMethod = claudeConfigured ? "claude" : "free";
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  // Kept purely for the Verify step's "original" pane (object URLs for image
  // files) — separate from the native input's own files, which is what
  // actually gets submitted to the server.
  const [originalFiles, setOriginalFiles] = useState<File[]>([]);

  const [extractState, extractAction, extracting] = useActionState(extractMenuWizardAction, initialExtractState);
  const [categories, setCategories] = useState<EditableCategory[] | null>(null);
  const [pageThumbnails, setPageThumbnails] = useState<PageThumbnail[]>([]);

  // Seed guard (render-time comparison, not useEffect — the established
  // pattern in this codebase for "adjust state the moment an action
  // succeeds" without tripping react-hooks/set-state-in-effect).
  const [seededFrom, setSeededFrom] = useState(extractState.result);
  if (extractState.result && extractState.result !== seededFrom) {
    setSeededFrom(extractState.result);
    setCategories(toEditableCategories(extractState.result.categories));
    setPageThumbnails(extractState.result.pageThumbnails);
    setStep("verify");
  }
  const [seededErrorFrom, setSeededErrorFrom] = useState<string | null>(null);
  if (extractState.error && extractState.error !== seededErrorFrom) {
    setSeededErrorFrom(extractState.error);
    setStep("upload");
  }

  const [publishState, publishAction, publishing] = useActionState(publishMenuWizardAction, initialPublishState);

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    setSelectedCount(list.length);
    setOriginalFiles(list);
    if (list.length === 0) {
      setFileError(null);
      return;
    }
    if (list.length > MAX_WIZARD_FILES) {
      setFileError(`Choose up to ${MAX_WIZARD_FILES} files at a time.`);
      return;
    }
    const tooBig = list.find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      setFileError(
        `"${tooBig.name}" is ${(tooBig.size / 1024 / 1024).toFixed(1)}MB — please use files under 20MB each.`,
      );
      return;
    }
    setFileError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator step={step} />

      {step === "upload" && !extracting && (
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Upload your menu</h2>
          <p className="mb-3 text-xs text-gray-500">
            Photos and/or a PDF — you can select multiple pages/photos at once. Everything is reviewed
            before anything is saved.
          </p>
          <form action={extractAction} className="flex flex-col gap-3">
            {claudeConfigured ? (
              <p className="text-xs text-gray-500">Reading your menu with Claude AI.</p>
            ) : (
              <p className="text-xs text-amber-600">
                Claude AI isn&apos;t configured right now — falling back to the free, built-in OCR reader.
              </p>
            )}
            <input type="hidden" name="method" value={method} />
            <input
              name="files"
              type="file"
              multiple
              accept="image/*,application/pdf"
              required
              onChange={handleFilesChange}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs"
            />
            {selectedCount > 0 && !fileError && (
              <p className="text-xs text-gray-500">{selectedCount} file{selectedCount === 1 ? "" : "s"} selected.</p>
            )}
            <button
              type="submit"
              disabled={Boolean(fileError) || selectedCount === 0}
              className="w-fit rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Extract menu
            </button>
          </form>
          {(fileError || extractState.error) && (
            <p className="mt-2 text-sm text-red-600">{fileError || extractState.error}</p>
          )}
        </div>
      )}

      {extracting && (
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-8 text-center">
          <p className="text-sm font-medium text-gray-900">
            Reading {selectedCount} file{selectedCount === 1 ? "" : "s"}…
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {method === "claude"
              ? "Claude is reading your menu — this can take a moment for several files."
              : "Running the free OCR reader…"}
          </p>
        </div>
      )}

      {step === "verify" && categories && !extracting && (
        <VerifyStep
          categories={categories}
          onChange={setCategories}
          pageThumbnails={pageThumbnails}
          originalFiles={originalFiles}
          onBack={() => setStep("upload")}
          onNext={() => setStep("design")}
        />
      )}

      {step === "design" && categories && (
        <DesignStep
          categories={categories}
          onChange={setCategories}
          theme={theme}
          stockPhotoConfigured={stockPhotoConfigured}
          onBack={() => setStep("verify")}
          onNext={() => setStep("publish")}
        />
      )}

      {step === "publish" && categories && (
        <PublishStep
          categories={categories}
          tenantSlug={tenantSlug}
          publishAction={publishAction}
          publishState={publishState}
          publishing={publishing}
          onBack={() => setStep("design")}
        />
      )}
    </div>
  );
}
