"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { MatchCandidate } from "@/lib/data/purchases";
import {
  scanPurchaseBillAction,
  confirmPurchaseAction,
  undoPurchaseAction,
  type ScanBillState,
  type ConfirmBillState,
} from "@/app/dashboard/inventory/scan/actions";
import { usePurchaseLang, type PurchaseLang, type PurchaseLangKey } from "@/lib/purchase-scan-lang";
import { fileToDataUrl, dataUrlToFile, savePendingScan, loadPendingScan, clearPendingScan } from "@/lib/purchase-offline-queue";
import { formatINR, rupeesToCents } from "@/lib/money";
import { NewItemSheet, type NewProductDraft, type CategoryOption } from "@/components/purchases/new-item-sheet";
import { MatchPicker } from "@/components/purchases/match-picker";
import { nowMs } from "@/lib/time";

const MAX_IMAGES = 3;
const UNDO_WINDOW_MS = 10 * 60 * 1000;

type UiLine = {
  id: string;
  nameOnBill: string;
  matchedId: string | null;
  matchedName: string | null;
  /** Set instead of matchedId when this line will create a brand-new sellable Product ("Naya item banao"). */
  newProduct: NewProductDraft | null;
  quantity: number | null;
  rateCents: number | null;
  note: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  skipped: boolean;
  editedByUser: boolean;
};

let uiLineCounter = 0;
const nextLineId = () => `line-${++uiLineCounter}`;

const initialScanState: ScanBillState = { error: null, scanId: null, candidates: null, extraction: null };
const initialConfirmState: ConfirmBillState = { error: null, isDuplicate: false, result: null };

function lineIsResolved(l: UiLine) {
  return l.skipped || l.matchedId !== null || l.newProduct !== null;
}
function lineNeedsAttention(l: UiLine) {
  if (l.skipped) return false;
  if (!lineIsResolved(l)) return true;
  if (l.quantity === null || l.quantity <= 0) return true;
  if (l.rateCents === null || l.rateCents < 0) return true;
  if (l.confidence === "LOW") return true;
  return false;
}

export function BillScanner({
  candidates,
  categories,
  stockPhotoSearchEnabled,
}: {
  candidates: MatchCandidate[];
  categories: CategoryOption[];
  stockPhotoSearchEnabled: boolean;
}) {
  const [lang, setLang, t] = usePurchaseLang();

  const [screen, setScreen] = useState<"capture" | "confirm" | "saved">("capture");
  const [images, setImages] = useState<{ file: File; previewUrl: string }[]>([]);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const [readingStep, setReadingStep] = useState(0);

  const [scanState, scanFormAction, scanPending] = useActionState(scanPurchaseBillAction, initialScanState);
  // useActionState's dispatch only tracks isPending correctly when invoked
  // via a <form action={...}> submit — calling it directly from a plain
  // button's onClick (needed here since we build the FormData ourselves
  // from picked File objects) must be wrapped in startTransition, or React
  // warns "called outside of a transition" and isPending stops updating.
  const [, startScanTransition] = useTransition();
  const [, startConfirmTransition] = useTransition();
  const [lastAppliedScan, setLastAppliedScan] = useState<ScanBillState | null>(null);

  const [uiLines, setUiLines] = useState<UiLine[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [extraCharges, setExtraCharges] = useState<{ label: string; amountRupees: string }[]>([]);
  const [billGrandTotalCents, setBillGrandTotalCents] = useState<number | null>(null);
  const [totalMismatch, setTotalMismatch] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);

  const [newItemSheetFor, setNewItemSheetFor] = useState<string | null>(null);
  const [matchPickerFor, setMatchPickerFor] = useState<string | null>(null);

  const [confirmState, confirmFormAction, confirmPending] = useActionState(confirmPurchaseAction, initialConfirmState);
  const [lastAppliedConfirm, setLastAppliedConfirm] = useState<ConfirmBillState | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  // --- derive UI state from the scan action's result (React's documented
  // "adjust state during render" pattern — avoids a synchronous setState
  // inside a useEffect body, a lint rule this codebase hits often). ---
  if (scanState !== lastAppliedScan) {
    setLastAppliedScan(scanState);
    if (scanState.extraction) {
      const ext = scanState.extraction;
      setUiLines(
        ext.lines.map((l) => ({
          id: nextLineId(),
          nameOnBill: l.nameOnBill,
          matchedId: l.matchedId,
          matchedName: l.matchedName,
          newProduct: null,
          quantity: l.quantity,
          rateCents: l.rateCents,
          note: l.note,
          confidence: l.confidence,
          skipped: false,
          editedByUser: false,
        })),
      );
      setSupplierName(ext.supplierName ?? "");
      setBillNumber(ext.billNumber ?? "");
      setBillDate(ext.billDate ?? "");
      setExtraCharges(ext.extraCharges.map((c) => ({ label: c.label, amountRupees: String(c.amountCents / 100) })));
      setBillGrandTotalCents(ext.billGrandTotalCents);
      setTotalMismatch(ext.totalMismatch);
      setScanId(scanState.scanId);
      setCaptureError(null);
      setScreen("confirm");
    } else if (scanState.error) {
      setCaptureError(scanState.error);
    }
  }

  if (confirmState !== lastAppliedConfirm) {
    setLastAppliedConfirm(confirmState);
    if (confirmState.result) {
      setScreen("saved");
    }
  }

  // --- reading-screen step animation while the scan action is in flight ---
  useEffect(() => {
    if (!scanPending) {
      // Resets the animation for the *next* scan — the reading screen
      // itself is already unmounted at this point (render logic only shows
      // it while scanPending is true), so this doesn't affect what's on
      // screen right now; it just keeps the timer from resuming mid-way.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReadingStep(0);
      return;
    }
    const id = window.setInterval(() => setReadingStep((s) => (s + 1) % 3), 1400);
    return () => window.clearInterval(id);
  }, [scanPending]);

  // --- revoke object URLs when images change/unmount ---
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  // --- offline queue: auto-flush once back online ---
  const flushingRef = useRef(false);
  useEffect(() => {
    async function tryFlush() {
      if (flushingRef.current || !navigator.onLine) return;
      const pending = loadPendingScan();
      if (!pending) return;
      flushingRef.current = true;
      const files = pending.images.map(dataUrlToFile);
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      clearPendingScan();
      setOfflineNotice(false);
      startScanTransition(() => scanFormAction(fd));
    }
    void tryFlush();
    window.addEventListener("online", tryFlush);
    return () => window.removeEventListener("online", tryFlush);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scanFormAction identity is stable per React's own useActionState contract
  }, []);

  async function handlePick(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setCaptureError(null);
    const picked = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const room = MAX_IMAGES - images.length;
    if (picked.length > room) setCaptureError(`Max ${MAX_IMAGES} photos per bill — baaki chhod diye.`);
    const toAdd = picked.slice(0, room).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...toAdd]);
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleScanNow() {
    if (images.length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const pending = await Promise.all(images.map((img) => fileToDataUrl(img.file)));
      savePendingScan(pending);
      setOfflineNotice(true);
      return;
    }
    const fd = new FormData();
    images.forEach((img) => fd.append("images", img.file));
    startScanTransition(() => scanFormAction(fd));
  }

  function updateLine(id: string, patch: Partial<UiLine>) {
    setUiLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch, editedByUser: true } : l)));
  }

  function addManualLine() {
    setUiLines((prev) => [
      ...prev,
      {
        id: nextLineId(),
        nameOnBill: "",
        matchedId: null,
        matchedName: null,
        newProduct: null,
        quantity: null,
        rateCents: null,
        note: null,
        confidence: "HIGH",
        skipped: false,
        editedByUser: true,
      },
    ]);
  }

  function addExtraCharge() {
    setExtraCharges((prev) => [...prev, { label: "", amountRupees: "" }]);
  }

  const parsedExtraCharges = extraCharges
    .map((c) => ({ label: c.label.trim(), amountCents: rupeesToCents(c.amountRupees || 0) }))
    .filter((c) => c.label && c.amountCents > 0);

  const activeLines = uiLines.filter((l) => !l.skipped);
  const runningSubtotalCents = activeLines.reduce((s, l) => s + Math.round((l.quantity ?? 0) * (l.rateCents ?? 0)), 0);
  const runningTotalCents = runningSubtotalCents + parsedExtraCharges.reduce((s, c) => s + c.amountCents, 0);
  const pendingCount = uiLines.filter(lineNeedsAttention).length;
  const canSave = uiLines.length > 0 && pendingCount === 0;

  const okCount = uiLines.filter((l) => !l.skipped && l.matchedId !== null && l.confidence === "HIGH" && !lineNeedsAttention(l)).length;
  const checkCount = uiLines.filter((l) => !l.skipped && (l.matchedId !== null || l.newProduct) && lineNeedsAttention(l)).length;
  const newItemCount = uiLines.filter((l) => !l.skipped && !l.matchedId && !l.newProduct).length;

  function buildConfirmPayload(allow: boolean) {
    return {
      scanId,
      supplierName: supplierName.trim() || null,
      supplierPhone: supplierPhone.trim() || null,
      billNumber: billNumber.trim() || null,
      billDate: billDate || null,
      extraCharges: parsedExtraCharges,
      lines: uiLines.map((l) => ({
        nameOnBill: l.nameOnBill.trim() || "Item",
        matchedId: l.newProduct ? null : l.matchedId,
        newProduct: l.newProduct
          ? {
              name: l.newProduct.name,
              categoryId: l.newProduct.categoryId,
              sku: l.newProduct.sku,
              sellingPriceCents: rupeesToCents(l.newProduct.sellingPriceRupees || 0),
              lowStockThreshold: l.newProduct.lowStockThreshold,
              imageUrl: l.newProduct.imageUrl,
            }
          : null,
        quantity: l.quantity ?? 0,
        unit: "pcs",
        rateCents: l.rateCents ?? 0,
        note: l.note,
        editedByUser: l.editedByUser,
      })),
      allowDuplicate: allow,
    };
  }

  function handleSave() {
    setAllowDuplicate(false);
    const fd = new FormData();
    fd.set("payload", JSON.stringify(buildConfirmPayload(false)));
    startConfirmTransition(() => confirmFormAction(fd));
  }

  function handleSaveAnyway() {
    setAllowDuplicate(true);
    const fd = new FormData();
    fd.set("payload", JSON.stringify(buildConfirmPayload(true)));
    startConfirmTransition(() => confirmFormAction(fd));
  }

  function resetToCapture() {
    // Deliberately NOT resetting lastAppliedScan/lastAppliedConfirm here —
    // those still point at scanState/confirmState (the useActionState hooks'
    // own state, which useActionState never clears on its own). Clearing
    // them would make the very next render see scanState/confirmState as
    // "new" again and immediately re-derive uiLines/screen from the STALE
    // previous result, undoing this reset on the next tick.
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setUiLines([]);
    setScanId(null);
    setCaptureError(null);
    setScreen("capture");
  }

  // ---------------------------------------------------------------- render

  if (scanPending) {
    return <ReadingScreen step={readingStep} t={t} />;
  }

  if (screen === "saved" && confirmState.result) {
    return <SavedScreen result={confirmState.result} t={t} onScanAnother={resetToCapture} />;
  }

  if (screen === "confirm") {
    return (
      <>
        {newItemSheetFor && (
          <NewItemSheet
            initialName={uiLines.find((l) => l.id === newItemSheetFor)?.nameOnBill ?? ""}
            categories={categories}
            stockPhotoSearchEnabled={stockPhotoSearchEnabled}
            t={t}
            onCancel={() => setNewItemSheetFor(null)}
            onSave={(draft) => {
              updateLine(newItemSheetFor, { newProduct: draft, matchedId: null, matchedName: null, confidence: "HIGH" });
              setNewItemSheetFor(null);
            }}
          />
        )}
        {matchPickerFor && (
          <MatchPicker
            candidates={candidates}
            t={t}
            onCancel={() => setMatchPickerFor(null)}
            onPick={(c) => {
              updateLine(matchPickerFor, {
                matchedId: c.id,
                matchedName: c.name,
                newProduct: null,
                confidence: "HIGH",
              });
              setMatchPickerFor(null);
            }}
          />
        )}

        <div className="flex flex-col gap-4 pb-28">
          <LangSwitcher lang={lang} setLang={setLang} />

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  {t("supplierName")}
                  <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  Phone (optional)
                  <input
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  {t("billNumber")}
                  <input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                  {t("billDate")}
                  <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className={inputCls} />
                </label>
              </div>
              {images[0] && (
                <a href={images[0].previewUrl} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[0].previewUrl} alt="Bill" className="h-16 w-16 rounded-md border border-gray-200 object-cover" />
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <SummaryChip label={t("billOk")} count={okCount} color="bg-green-100 text-green-800" />
            <SummaryChip label={t("needsCheck")} count={checkCount} color="bg-amber-100 text-amber-800" />
            <SummaryChip label={t("newItem")} count={newItemCount} color="bg-orange-100 text-orange-800" />
          </div>

          {totalMismatch && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-semibold">
                {t("totalMismatch")}
                {billGrandTotalCents !== null && (
                  <span className="font-normal"> — bill: {formatINR(billGrandTotalCents)}, calculated: {formatINR(runningTotalCents)}</span>
                )}
              </p>
              <button type="button" onClick={addExtraCharge} className="mt-1 text-xs font-medium text-red-700 underline">
                {t("addExtraCharge")}
              </button>
            </div>
          )}

          {extraCharges.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:bg-[#241d17]">
              {extraCharges.map((c, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={c.label}
                    onChange={(e) =>
                      setExtraCharges((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                    }
                    placeholder="Transport, loading…"
                    className={`${inputCls} flex-1`}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={c.amountRupees}
                    onChange={(e) =>
                      setExtraCharges((prev) => prev.map((x, i) => (i === idx ? { ...x, amountRupees: e.target.value } : x)))
                    }
                    placeholder="₹"
                    className={`${inputCls} w-24`}
                  />
                  <button
                    type="button"
                    onClick={() => setExtraCharges((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {uiLines.map((line) => (
              <LineCard key={line.id} line={line} t={t} onUpdate={(patch) => updateLine(line.id, patch)} onOpenNewItem={() => setNewItemSheetFor(line.id)} onOpenMatchPicker={() => setMatchPickerFor(line.id)} />
            ))}
          </div>

          <button
            type="button"
            onClick={addManualLine}
            className="min-h-[44px] rounded-md border border-dashed border-gray-300 text-sm font-medium text-gray-600"
          >
            + {t("addMissingItem")}
          </button>

          {confirmState.error && !confirmState.isDuplicate && (
            <p className="text-sm text-red-600">{confirmState.error}</p>
          )}

          {confirmState.isDuplicate && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p>{t("duplicateBill")}</p>
              <button
                type="button"
                onClick={handleSaveAnyway}
                disabled={confirmPending}
                className="mt-2 min-h-[40px] rounded-md bg-amber-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("saveAnyway")}
              </button>
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] dark:bg-[#1c150f]">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold text-gray-900">
                {uiLines.length} {t("items")} · {formatINR(runningTotalCents)}
              </p>
              {!canSave && <p className="text-xs text-amber-700">{pendingCount} {t("pendingHelper")}</p>}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || confirmPending || allowDuplicate}
              className="min-h-[48px] rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {confirmPending ? "…" : t("saveAndConfirm")}
            </button>
          </div>
        </div>
      </>
    );
  }

  // -------------------------------------------------------------- capture screen

  return (
    <div className="flex flex-col gap-4">
      <LangSwitcher lang={lang} setLang={setLang} />
      <h2 className="text-lg font-semibold text-gray-900">{t("scanTitle")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-[3/4] overflow-hidden rounded-lg border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.previewUrl} alt={`Page ${idx + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
            >
              ✕
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400">
            <span className="text-3xl">📷</span>
            <span className="text-xs">{images.length === 0 ? "" : t("addAnotherPage")}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="min-h-[48px] flex-1 cursor-pointer rounded-md bg-indigo-600 text-center text-sm font-semibold leading-[48px] text-white">
          {t("takePhoto")}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void handlePick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label className="min-h-[48px] flex-1 cursor-pointer rounded-md border border-gray-300 text-center text-sm font-semibold leading-[48px] text-gray-700">
          {t("chooseFromGallery")}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void handlePick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {offlineNotice && <p className="text-sm text-amber-700">{t("offlineQueued")}</p>}
      {captureError && <p className="text-sm text-red-600">{captureError}</p>}

      <button
        type="button"
        onClick={handleScanNow}
        disabled={images.length === 0}
        className="min-h-[52px] rounded-md bg-green-600 text-base font-semibold text-white disabled:opacity-40"
      >
        {t("scanNow")}
      </button>
    </div>
  );
}

const inputCls = "min-h-[40px] rounded-md border border-gray-300 px-2.5 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent";

function LangSwitcher({ lang, setLang }: { lang: PurchaseLang; setLang: (l: PurchaseLang) => void }) {
  return (
    <div className="flex justify-end gap-1 text-xs">
      {(["hinglish", "hindi", "english"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`rounded-full px-2 py-0.5 ${lang === l ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          {l === "hinglish" ? "Hinglish" : l === "hindi" ? "हिंदी" : "English"}
        </button>
      ))}
    </div>
  );
}

function SummaryChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {label}: {count}
    </span>
  );
}

function ReadingScreen({ step, t }: { step: number; t: (k: PurchaseLangKey) => string }) {
  const steps = [t("uploaded"), t("reading"), t("matching")];
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      <div className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <p key={s} className={i <= step ? "font-medium text-gray-900" : "text-gray-400"}>
            {i < step ? "✓ " : ""}
            {s}
          </p>
        ))}
      </div>
    </div>
  );
}

function LineCard({
  line,
  t,
  onUpdate,
  onOpenNewItem,
  onOpenMatchPicker,
}: {
  line: UiLine;
  t: (k: PurchaseLangKey) => string;
  onUpdate: (patch: Partial<UiLine>) => void;
  onOpenNewItem: () => void;
  onOpenMatchPicker: () => void;
}) {
  if (line.skipped) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
        <span className="line-through">{line.nameOnBill}</span>
        <button type="button" onClick={() => onUpdate({ skipped: false })} className="text-xs font-medium text-indigo-600">
          Undo
        </button>
      </div>
    );
  }

  const unresolved = !lineIsResolved(line);
  const attention = lineNeedsAttention(line);
  const resolvedName = line.newProduct?.name || line.matchedName || line.nameOnBill;

  if (unresolved) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 p-3">
        <p className="text-sm font-medium text-gray-900">{line.nameOnBill}</p>
        <p className="text-xs text-gray-500">
          {t("onBill")} {line.nameOnBill}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenNewItem} className="min-h-[40px] rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white">
            {t("createNewItem")}
          </button>
          <button type="button" onClick={onOpenMatchPicker} className="min-h-[40px] rounded-md border border-gray-300 px-3 text-xs font-semibold text-gray-700">
            {t("matchExisting")}
          </button>
          <button type="button" onClick={() => onUpdate({ skipped: true })} className="min-h-[40px] rounded-md px-3 text-xs font-medium text-gray-500">
            {t("skipThisTime")}
          </button>
        </div>
      </div>
    );
  }

  const cardTone = attention ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white dark:bg-[#241d17]";

  return (
    <div className={`flex flex-col gap-2 rounded-lg border p-3 ${cardTone}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {!attention && "✓ "}
            {resolvedName}
          </p>
          <p className="text-xs text-gray-500">
            {t("onBill")} {line.nameOnBill}
          </p>
        </div>
        <button type="button" onClick={onOpenMatchPicker} className="text-xs font-medium text-indigo-600">
          {t("change")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5 text-[11px] text-gray-500">
          {t("quantity")} (pcs)
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            autoFocus={line.quantity === null}
            value={line.quantity ?? ""}
            onChange={(e) => onUpdate({ quantity: e.target.value === "" ? null : Number(e.target.value) })}
            className={`${inputCls} ${line.quantity === null ? "border-amber-400" : ""}`}
          />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-gray-500">
          {t("rate")} (₹)
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={line.rateCents === null ? "" : (line.rateCents / 100).toString()}
            onChange={(e) => onUpdate({ rateCents: e.target.value === "" ? null : rupeesToCents(e.target.value) })}
            className={`${inputCls} ${line.rateCents === null ? "border-amber-400" : ""}`}
          />
        </label>
      </div>

      {line.quantity !== null && line.rateCents !== null && (
        <p className="text-right text-sm font-semibold text-gray-700">{formatINR(Math.round(line.quantity * line.rateCents))}</p>
      )}

      {line.note && <p className="text-xs text-amber-700">{line.note}</p>}
    </div>
  );
}

function SavedScreen({
  result,
  t,
  onScanAnother,
}: {
  result: ConfirmBillState["result"];
  t: (k: PurchaseLangKey) => string;
  onScanAnother: () => void;
}) {
  const [createdAtMs] = useState(() => nowMs());
  const [now, setNow] = useState(createdAtMs);
  const [undoState, setUndoState] = useState<{ pending: boolean; done: boolean; error: string | null }>({
    pending: false,
    done: false,
    error: null,
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!result) return null;
  const msLeft = UNDO_WINDOW_MS - (now - createdAtMs);
  const canUndo = msLeft > 0 && !undoState.done;
  const secondsLeft = Math.max(0, Math.ceil(msLeft / 1000));

  async function handleUndo() {
    setUndoState({ pending: true, done: false, error: null });
    const res = await undoPurchaseAction(result!.purchaseId);
    if (res.error) setUndoState({ pending: false, done: false, error: res.error });
    else setUndoState({ pending: false, done: true, error: null });
  }

  const clearedAlerts = result.stockChanges.filter((c) => c.alertCleared);

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-center">
        <p className="text-lg font-semibold text-green-900">✓ {t("savedTitle")}</p>
        <p className="text-sm text-green-800">{formatINR(result.grandTotalCents)}</p>
      </div>

      <div className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
        {result.stockChanges.map((c, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="font-medium text-gray-900">{c.name}</span>
            <span className="text-gray-600">
              {c.before} → <span className="font-semibold text-green-700">{c.after}</span> pcs
            </span>
          </div>
        ))}
      </div>

      {clearedAlerts.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-medium">{t("alertsCleared")}</p>
          <p>{clearedAlerts.map((c) => c.name).join(", ")}</p>
        </div>
      )}

      {undoState.done ? (
        <p className="text-center text-sm text-gray-600">{t("undoDone")}</p>
      ) : (
        canUndo && (
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoState.pending}
            className="min-h-[44px] rounded-md border border-red-300 text-sm font-semibold text-red-700 disabled:opacity-50"
          >
            {undoState.pending ? t("undoing") : `${t("undo")} (${secondsLeft}s)`}
          </button>
        )
      )}
      {undoState.error && <p className="text-center text-xs text-red-600">{undoState.error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/dashboard/inventory" className="min-h-[48px] flex-1 rounded-md bg-indigo-600 text-center text-sm font-semibold leading-[48px] text-white">
          {t("viewStock")}
        </Link>
        <button
          type="button"
          onClick={onScanAnother}
          className="min-h-[48px] flex-1 rounded-md border border-gray-300 text-sm font-semibold text-gray-700"
        >
          {t("scanAnother")}
        </button>
      </div>
    </div>
  );
}
