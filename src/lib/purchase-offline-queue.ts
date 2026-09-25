"use client";

/**
 * "Internet aane par padh lenge" — queues a bill's photos in the browser
 * when offline, and resubmits automatically once back online. No service
 * worker: this app has no PWA/SW infrastructure today, and installing one
 * just for this feature would be a much bigger, riskier change to a live
 * app than this queue needs. A plain localStorage slot + online/offline
 * listeners gets the same real behavior (queue while offline, auto-submit
 * when back) without touching how the rest of the app loads or caches.
 * Only ever holds one pending scan at a time — a second offline attempt
 * simply replaces the first, which matches how this screen is used in
 * practice (one bill at a time, right after taking the photos).
 */

const STORAGE_KEY = "bhojsetu_pending_bill_scan";

export type PendingImage = { dataUrl: string; name: string; type: string };

export function fileToDataUrl(file: File): Promise<PendingImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: String(reader.result), name: file.name, type: file.type });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function dataUrlToFile(img: PendingImage): File {
  const [, base64] = img.dataUrl.split(",");
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], img.name, { type: img.type });
}

export function savePendingScan(images: PendingImage[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ images, savedAt: Date.now() }));
  } catch {
    // Quota exceeded or storage blocked — the owner can just retake/resubmit
    // once back online; nothing else depends on this succeeding.
  }
}

export function loadPendingScan(): { images: PendingImage[]; savedAt: number } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.images)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingScan(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — worst case a stale queued scan gets offered again.
  }
}
