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

  /**
   * Word-wraps free-form text to `cols` and emits one line() per wrapped
   * line — a plain line() of text longer than the printer's physical width
   * isn't wrapped by every clone printer's firmware the way a real terminal
   * would; some just silently drop (truncate) whatever doesn't fit,
   * especially mid-centered text. Any line this builder can't guarantee
   * fits cols (a business name, an address, the footer) should go through
   * this instead of line() directly.
   */
  wrapped(s: string, cols: number) {
    for (const l of wrapText(s, cols)) this.line(l);
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

/** Same as rupees() but without the "Rs" prefix — used inside the tabular item columns, where the amount header column already establishes it's money. */
function plainAmount(cents: number): string {
  return (cents / 100).toFixed(2);
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

/** Plain word-wrap; a single word longer than cols on its own is hard-broken rather than left overflowing. */
function wrapText(text: string, cols: number): string[] {
  if (text.length <= cols) return [text];
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    let w = word;
    while (w.length > cols) {
      if (cur.length > 0) {
        lines.push(cur);
        cur = "";
      }
      lines.push(w.slice(0, cols));
      w = w.slice(cols);
    }
    if (cur.length === 0) {
      cur = w;
    } else if (cur.length + 1 + w.length <= cols) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

function padRight(s: string, w: number): string {
  const t = s.length > w ? s.slice(0, w) : s;
  return t + " ".repeat(w - t.length);
}
function padLeft(s: string, w: number): string {
  const t = s.length > w ? s.slice(0, w) : s;
  return " ".repeat(w - t.length) + t;
}

/**
 * Fixed-width columns (Product / Qty / Rate / Amount, one line per item) —
 * matching a clean billing-software receipt layout a restaurant owner sent
 * as a reference, rather than this file's original two-line-per-item style
 * (name + total on one line, qty × rate below). Long item names are
 * truncated rather than wrapped, so every item stays on exactly one line.
 */
function itemColumns(cols: number) {
  const qty = 4;
  const rate = 7;
  const amount = 8;
  const product = Math.max(6, cols - qty - rate - amount);
  return { product, qty, rate, amount };
}

function itemRow(w: ReturnType<typeof itemColumns>, name: string, qty: string, rate: string, amount: string): string {
  return padRight(name, w.product) + padLeft(qty, w.qty) + padLeft(rate, w.rate) + padLeft(amount, w.amount);
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
    b.wrapped(`${item.nameSnapshot} (${item.quantity})`, cols);
  }
  b.bold(false);
  if (input.notes) {
    b.hr(cols);
    b.wrapped(`Note: ${input.notes}`, cols);
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
  b.wrapped(input.tenantName, cols);
  b.bold(false);
  if (input.businessAddress) for (const l of input.businessAddress.split("\n")) b.wrapped(l, cols);
  if (input.gstin) b.wrapped(`GSTIN: ${input.gstin}`, cols);
  if (input.businessState) b.wrapped(`Place of supply: ${input.businessState}`, cols);
  b.center(false);
  b.hr(cols);

  b.line(`Invoice ${input.invoiceNumber}`);
  b.line(input.createdAt);
  b.wrapped(`Bill to: ${input.customerName}`, cols);
  if (input.customerPhone) b.line(input.customerPhone);
  b.hr(cols);

  const cw = itemColumns(cols);
  b.bold(true);
  b.line(itemRow(cw, "Product", "Qty", "Rate", "Amount"));
  b.bold(false);
  b.hr(cols);
  for (const l of input.lines) {
    b.line(
      itemRow(
        cw,
        l.nameSnapshot,
        String(l.quantity),
        plainAmount(l.priceCentsSnapshot),
        plainAmount(l.priceCentsSnapshot * l.quantity),
      ),
    );
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
    b.wrapped(`Scan to pay via UPI: ${input.upiId}`, cols);
    b.center(false);
  }

  b.hr(cols);
  b.center(true);
  b.wrapped(`Thank you for visiting ${input.tenantName}.`, cols);
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
