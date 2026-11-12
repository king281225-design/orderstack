/**
 * Builds raw ESC/POS byte sequences for a KOT ticket or a bill, for the
 * optional local print agent (see print-agent/ at the repo root) — a small
 * helper program a restaurant can run on its own PC that sends these bytes
 * straight to a thermal printer, bypassing Windows' print dialog and paper
 * size matching entirely. Some generic/clone thermal printer drivers only
 * expose a short fixed list of paper sizes (not a true continuous roll) and
 * silently fail Chrome's --kiosk-printing silent print as a result — raw
 * ESC/POS sidesteps that completely, since the printer just executes the
 * commands directly with no Windows page-size negotiation involved.
 *
 * Pure and framework-agnostic on purpose — called from a Server Component
 * (kot/page.tsx, print/page.tsx) using the exact same data already being
 * rendered to HTML, then shipped to the browser as a base64 string prop.
 * The browser never has to rebuild this formatting itself; it just hands
 * the pre-built bytes to the local agent (see local-print-agent.ts).
 */

const ESC = 0x1b;
const GS = 0x1d;

class EscPosBuilder {
  private bytes: number[] = [];

  init() {
    this.bytes.push(ESC, 0x40);
    return this;
  }

  bold(on: boolean) {
    this.bytes.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  center(on: boolean) {
    this.bytes.push(ESC, 0x61, on ? 1 : 0);
    return this;
  }

  /** Plain ASCII text, no trailing newline. Non-ASCII (e.g. the ₹ sign) is replaced before this ever runs — see rupees() below. */
  text(s: string) {
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      this.bytes.push(code < 32 || code > 126 ? 0x3f /* '?' */ : code);
    }
    return this;
  }

  line(s = "") {
    this.text(s);
    this.bytes.push(0x0a);
    return this;
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) this.bytes.push(0x0a);
    return this;
  }

  hr(cols: number, char = "-") {
    this.line(char.repeat(cols));
    return this;
  }

  /** Feed a few lines then partial-cut — verified against a real printer before this file was written, see the chat history. */
  cut() {
    this.feed(2);
    this.bytes.push(GS, 0x56, 0x42, 0x00);
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

/** Most clone thermal printers' built-in code page has no ₹ glyph — garbles to a box or '?'. */
function rupees(cents: number): string {
  return `Rs ${(cents / 100).toFixed(2)}`;
}

/**
 * Characters-per-line for a given roll width, calibrated against the two
 * widths nearly every thermal printer actually uses (58mm → 32 cols, 80mm →
 * 48 cols at the printer's default Font A) and interpolated/extrapolated
 * linearly for anything else — there's no way to ask the printer its real
 * font metrics over a raw byte stream, so this is deliberately the same
 * "let the owner's chosen roll width drive the math" approach print-prefs.ts
 * already uses for the CSS @page size.
 */
function columnsForWidth(widthMm: number): number {
  const cols = 32 + (widthMm - 58) * (16 / 22);
  return Math.max(20, Math.round(cols));
}

/** Left part left-aligned, right part right-aligned — wraps to its own line if both don't fit together. */
function twoCol(b: EscPosBuilder, left: string, right: string, cols: number) {
  if (left.length + 1 + right.length <= cols) {
    b.line(left + " ".repeat(cols - left.length - right.length) + right);
  } else {
    b.line(left);
    b.line(" ".repeat(Math.max(0, cols - right.length)) + right);
  }
}

export function buildKotEscPos(input: {
  widthMm: number;
  orderNumber: number;
  dateLabel: string;
  stationLabel: string | null;
  fulfillmentType: string;
  tableLabel: string | null;
  items: { nameSnapshot: string; quantity: number }[];
  notes: string | null;
}): Uint8Array {
  const cols = columnsForWidth(input.widthMm);
  const b = new EscPosBuilder().init();

  b.line(`KOT No: ${input.orderNumber}`);
  b.line(`Date: ${input.dateLabel}`);
  b.line(`Bill No: ${input.orderNumber}`);
  if (input.stationLabel) b.line(`Station: ${input.stationLabel}`);
  if (input.fulfillmentType === "DINE_IN") {
    b.line(`Table: ${input.tableLabel ?? "-"}`);
  } else {
    b.line(`Type: ${input.fulfillmentType === "DELIVERY" ? "Delivery" : "Takeaway"}`);
  }
  b.hr(cols);
  b.bold(true);
  for (const item of input.items) {
    b.line(`${item.nameSnapshot} (${item.quantity})`);
  }
  b.bold(false);
  if (input.notes) {
    b.hr(cols);
    b.line(`Note: ${input.notes}`);
  }
  b.cut();
  return b.toBytes();
}

export function buildInvoiceEscPos(input: {
  widthMm: number;
  tenantName: string;
  businessAddress: string | null;
  businessState: string | null;
  gstin: string | null;
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  lines: { nameSnapshot: string; priceCentsSnapshot: number; quantity: number }[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  taxCents: number;
  gstRatePercent: number | null;
  totalCents: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentSource?: string | null;
  upiId?: string | null;
}): Uint8Array {
  const cols = columnsForWidth(input.widthMm);
  const showGstSplit = input.taxCents > 0 && !!input.businessState && input.gstRatePercent != null;
  const halfRate = showGstSplit ? input.gstRatePercent! / 2 : 0;
  const sgstCents = showGstSplit ? Math.floor(input.taxCents / 2) : 0;
  const cgstCents = showGstSplit ? input.taxCents - sgstCents : 0;

  const b = new EscPosBuilder().init();

  b.center(true);
  b.bold(true);
  b.line(input.tenantName);
  b.bold(false);
  if (input.businessAddress) for (const l of input.businessAddress.split("\n")) b.line(l);
  if (input.gstin) b.line(`GSTIN: ${input.gstin}`);
  if (input.businessState) b.line(`Place of supply: ${input.businessState}`);
  b.center(false);
  b.hr(cols);

  b.line(`Invoice ${input.invoiceNumber}`);
  b.line(input.createdAt);
  b.line(`Bill to: ${input.customerName}`);
  if (input.customerPhone) b.line(input.customerPhone);
  b.hr(cols);

  for (const l of input.lines) {
    twoCol(b, l.nameSnapshot, rupees(l.priceCentsSnapshot * l.quantity), cols);
    b.line(`  ${l.quantity} x ${rupees(l.priceCentsSnapshot)}`);
  }
  b.hr(cols);

  twoCol(b, "Subtotal", rupees(input.subtotalCents), cols);
  if (input.discountCents > 0) {
    twoCol(b, `Discount${input.couponCode ? ` (${input.couponCode})` : ""}`, `-${rupees(input.discountCents)}`, cols);
  }
  if (input.taxCents > 0 && !showGstSplit) {
    twoCol(b, "Tax / GST", `+${rupees(input.taxCents)}`, cols);
  }
  if (showGstSplit) {
    twoCol(b, `CGST @ ${halfRate}%`, `+${rupees(cgstCents)}`, cols);
    twoCol(b, `SGST @ ${halfRate}%`, `+${rupees(sgstCents)}`, cols);
  }
  b.bold(true);
  twoCol(b, "Grand total", rupees(input.totalCents), cols);
  b.bold(false);
  twoCol(b, "Payment method", input.paymentMethod, cols);
  if (input.paymentSource) twoCol(b, "Paid via", input.paymentSource, cols);
  twoCol(b, "Payment status", input.paymentStatus, cols);

  if (input.upiId) {
    b.hr(cols);
    b.center(true);
    b.line(`Scan to pay via UPI: ${input.upiId}`);
    b.center(false);
  }

  b.hr(cols);
  b.center(true);
  b.line(`Thank you for visiting ${input.tenantName}.`);
  b.line("Powered by bhojsetu.in");
  b.center(false);
  b.cut();
  return b.toBytes();
}

/** Works identically in the browser and in Node (both have a global btoa) — no Buffer import needed. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
