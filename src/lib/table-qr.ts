import "server-only";
import QRCode from "qrcode";

/** Same idea as buildUpiQr (src/lib/upi.ts) — a plain data URL, no external service. */
export async function buildTableQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 220 });
}
