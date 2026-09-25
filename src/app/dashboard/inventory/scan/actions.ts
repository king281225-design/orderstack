"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";
import { extractPurchaseBill, validateExtraction, isPurchaseScanConfigured, PurchaseScanError, type ValidatedExtraction } from "@/lib/ai/purchase-scan";
import {
  buildMatchCandidates,
  createPurchaseScan,
  markPurchaseScanResult,
  checkDuplicateBill,
  confirmPurchase,
  undoPurchase,
  PurchaseError,
  DuplicatePurchaseError,
  type MatchCandidate,
  type ConfirmPurchaseInput,
  type ConfirmPurchaseResult,
  type UndoPurchaseResult,
} from "@/lib/data/purchases";

const MAX_IMAGES = 3;

export type ScanBillState = {
  error: string | null;
  scanId: string | null;
  candidates: MatchCandidate[] | null;
  extraction: ValidatedExtraction | null;
};

const emptyScanState: ScanBillState = { error: null, scanId: null, candidates: null, extraction: null };

export async function scanPurchaseBillAction(_prev: ScanBillState, formData: FormData): Promise<ScanBillState> {
  const session = await requireOwnerSession();
  if (!isPurchaseScanConfigured()) {
    return { ...emptyScanState, error: "Bill scanning isn't enabled yet (ANTHROPIC_API_KEY is not set)." };
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ...emptyScanState, error: "Ek photo chuno pehle — choose a photo first." };
  if (files.length > MAX_IMAGES) return { ...emptyScanState, error: `Ek bill mein max ${MAX_IMAGES} photos.` };
  for (const f of files) {
    if (!f.type.startsWith("image/")) return { ...emptyScanState, error: `"${f.name}" is not a photo.` };
  }

  const candidates = await buildMatchCandidates(session.tenantId);

  let imageUrls: string[];
  let buffers: { bytes: Buffer; mimeType: string }[];
  try {
    buffers = await Promise.all(files.map(async (f) => ({ bytes: Buffer.from(await f.arrayBuffer()), mimeType: f.type })));
    imageUrls = await Promise.all(files.map((f) => saveUpload(f, "purchase-scans")));
  } catch {
    return { ...emptyScanState, error: "Photo upload failed — try again." };
  }

  const scan = await createPurchaseScan(session.tenantId, imageUrls);

  try {
    const raw = await extractPurchaseBill(buffers, candidates);
    const extraction = validateExtraction(raw, candidates);
    await markPurchaseScanResult(session.tenantId, scan.id, {
      status: "READY",
      rawModelOutput: raw as unknown,
      modelName: "claude-opus-5",
    });
    return { error: null, scanId: scan.id, candidates, extraction };
  } catch (err) {
    const message = err instanceof PurchaseScanError || err instanceof Error ? err.message : "Bill nahi padh paye — try again.";
    await markPurchaseScanResult(session.tenantId, scan.id, { status: "FAILED", errorMessage: message });
    return { ...emptyScanState, error: message };
  }
}

export type DuplicateCheckResult = { duplicate: boolean };

export async function checkDuplicateBillAction(
  supplierName: string | null,
  billNumber: string | null,
  billDateIso: string | null,
): Promise<DuplicateCheckResult> {
  const session = await requireOwnerSession();
  const duplicate = await checkDuplicateBill(
    session.tenantId,
    supplierName,
    billNumber,
    billDateIso ? new Date(`${billDateIso}T00:00:00`) : null,
  );
  return { duplicate };
}

export type ConfirmBillState = {
  error: string | null;
  isDuplicate: boolean;
  result: ConfirmPurchaseResult | null;
};

const emptyConfirmState: ConfirmBillState = { error: null, isDuplicate: false, result: null };

export async function confirmPurchaseAction(_prev: ConfirmBillState, formData: FormData): Promise<ConfirmBillState> {
  const session = await requireOwnerSession();
  const raw = String(formData.get("payload") ?? "");
  let input: ConfirmPurchaseInput;
  try {
    input = JSON.parse(raw);
  } catch {
    return { ...emptyConfirmState, error: "Could not read the confirm screen's data — go back and try again." };
  }

  try {
    const result = await confirmPurchase(session.tenantId, session.sub, input);
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/inventory/scan");
    revalidatePath("/dashboard/menu");
    revalidatePath("/dashboard/orders/new");
    return { error: null, isDuplicate: false, result };
  } catch (err) {
    if (err instanceof DuplicatePurchaseError) {
      return { error: err.message, isDuplicate: true, result: null };
    }
    if (err instanceof PurchaseError) {
      return { ...emptyConfirmState, error: err.message };
    }
    console.error(err);
    return { ...emptyConfirmState, error: "Could not save this purchase — try again." };
  }
}

export type UndoBillState = { error: string | null; result: UndoPurchaseResult | null };

export async function undoPurchaseAction(purchaseId: string): Promise<UndoBillState> {
  const session = await requireOwnerSession();
  try {
    const result = await undoPurchase(session.tenantId, purchaseId);
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/inventory/scan");
    return { error: null, result };
  } catch (err) {
    return { error: err instanceof PurchaseError ? err.message : "Could not undo this purchase.", result: null };
  }
}
