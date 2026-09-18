/** Design + label helpers for the printable QR cards on /dashboard/tables. Pure — safe for server and client. */

export type QrCardDesign = {
  /** "outlet" = one QR for the whole shop (bakery/counter); "tables" = one QR per table. */
  mode: "outlet" | "tables";
  labelMode: "numbered" | "custom";
  count: number;
  startNumber: number;
  labelWord: string;
  /** Raw text, one label per line or comma-separated. */
  customLabels: string;
  outletCaption: string;
  showLogo: boolean;
  showBrand: boolean;
  brandName: string;
  showTagline: boolean;
  tagline: string;
  line1: string;
  line2: string;
  cta: string;
  bg: string;
  brand: string;
  text: string;
  accent: string;
  qr: string;
  size: "small" | "medium" | "large";
};

export type QrCardTenantDefaults = {
  name: string;
  tagline: string | null;
  colorPrimary: string;
  colorSecondary: string;
};

export function defaultQrCardDesign(t: QrCardTenantDefaults): QrCardDesign {
  return {
    mode: "tables",
    labelMode: "numbered",
    count: 10,
    startNumber: 1,
    labelWord: "Table",
    customLabels: "",
    outletCaption: "Order here",
    showLogo: true,
    showBrand: true,
    brandName: t.name,
    showTagline: true,
    tagline: t.tagline ?? "",
    line1: "",
    line2: "",
    cta: "Scan to order",
    bg: "#ffffff",
    brand: t.colorPrimary,
    text: "#374151",
    accent: t.colorSecondary,
    qr: "#111827",
    size: "medium",
  };
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function str(v: unknown, fallback: string, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function hex(v: unknown, fallback: string): string {
  return typeof v === "string" && HEX_RE.test(v) ? v.toLowerCase() : fallback;
}
function int(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), min), max) : fallback;
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Validates untrusted input (a saved JSON blob or a server-action argument) against the defaults. */
export function sanitizeQrCardDesign(input: unknown, defaults: QrCardDesign): QrCardDesign {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    mode: oneOf(o.mode, ["outlet", "tables"] as const, defaults.mode),
    labelMode: oneOf(o.labelMode, ["numbered", "custom"] as const, defaults.labelMode),
    count: int(o.count, defaults.count, 1, 100),
    startNumber: int(o.startNumber, defaults.startNumber, 0, 9999),
    labelWord: str(o.labelWord, defaults.labelWord, 20),
    customLabels: str(o.customLabels, defaults.customLabels, 4000),
    outletCaption: str(o.outletCaption, defaults.outletCaption, 40),
    showLogo: bool(o.showLogo, defaults.showLogo),
    showBrand: bool(o.showBrand, defaults.showBrand),
    brandName: str(o.brandName, defaults.brandName, 80),
    showTagline: bool(o.showTagline, defaults.showTagline),
    tagline: str(o.tagline, defaults.tagline, 120),
    line1: str(o.line1, defaults.line1, 80),
    line2: str(o.line2, defaults.line2, 80),
    cta: str(o.cta, defaults.cta, 60),
    bg: hex(o.bg, defaults.bg),
    brand: hex(o.brand, defaults.brand),
    text: hex(o.text, defaults.text),
    accent: hex(o.accent, defaults.accent),
    qr: hex(o.qr, defaults.qr),
    size: oneOf(o.size, ["small", "medium", "large"] as const, defaults.size),
  };
}

export type QrCardLabel = { value: string | null; display: string };

/** The list of cards to render. `value` is the ?table= param (null = the plain outlet link). */
export function buildQrCardLabels(d: QrCardDesign): QrCardLabel[] {
  if (d.mode === "outlet") return [{ value: null, display: d.outletCaption.trim() }];

  if (d.labelMode === "custom") {
    const seen = new Set<string>();
    const labels: QrCardLabel[] = [];
    for (const raw of d.customLabels.split(/[\n,]+/)) {
      const label = raw.trim().slice(0, 30);
      if (!label || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      labels.push({ value: label, display: label });
      if (labels.length >= 100) break;
    }
    return labels;
  }

  // Numbered: the ?table= value stays the bare number so previously printed
  // "Table 1..N" codes keep working; only the caption uses the label word.
  const word = d.labelWord.trim();
  return Array.from({ length: d.count }, (_, i) => {
    const n = d.startNumber + i;
    return { value: String(n), display: word ? `${word} ${n}` : String(n) };
  });
}

export function qrCardUrl(origin: string, slug: string, label: QrCardLabel): string {
  const base = `${origin}/r/${slug}`;
  return label.value === null ? base : `${base}?table=${encodeURIComponent(label.value)}`;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hexColor: string): number {
  const h = hexColor.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever reads better on the given background. */
export function readableTextOn(bgHex: string): string {
  return luminance(bgHex) > 0.4 ? "#111827" : "#ffffff";
}

/**
 * QR modules sit on a white tile, so a pale QR colour makes the code
 * unscannable. Below ~4:1 against white we silently fall back to near-black
 * (the UI also warns).
 */
export const QR_MIN_CONTRAST = 4;
export function safeQrColor(qrHex: string): string {
  return contrastRatio(qrHex, "#ffffff") >= QR_MIN_CONTRAST ? qrHex : "#111827";
}
