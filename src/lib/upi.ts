import "server-only";
import QRCode from "qrcode";

/**
 * Builds a UPI deep link (`upi://pay?...`) and renders it as a QR code data
 * URL. Any UPI app can scan this to pay directly — no payment gateway or
 * merchant account needed, matching the plan's "UPI QR / Cash on Delivery,
 * reconciled manually" launch approach.
 */
export async function buildUpiQr(input: {
  upiId: string;
  payeeName: string;
  amountCents: number;
  note: string;
}): Promise<{ uri: string; qrDataUrl: string }> {
  const amount = (input.amountCents / 100).toFixed(2);
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.payeeName,
    am: amount,
    cu: "INR",
    tn: input.note,
  });
  const uri = `upi://pay?${params.toString()}`;
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 280 });
  return { uri, qrDataUrl };
}
