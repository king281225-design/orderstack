"use client";

import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import QRCode from "qrcode";
import { saveQrCardDesignAction } from "@/app/dashboard/tables/actions";
import {
  QR_MIN_CONTRAST,
  buildQrCardLabels,
  contrastRatio,
  defaultQrCardDesign,
  qrCardUrl,
  readableTextOn,
  safeQrColor,
  type QrCardDesign,
  type QrCardTenantDefaults,
} from "@/lib/qr-card";

const inputCls =
  "rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent";
const labelCls = "flex flex-col gap-1 text-xs font-medium text-gray-600";

const PRINT_EXACT = { printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as CSSProperties;

const GRID: Record<QrCardDesign["size"], string> = {
  small: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-4",
  medium: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3",
  large: "grid-cols-1 sm:grid-cols-2 print:grid-cols-2",
};
const QR_PX: Record<QrCardDesign["size"], string> = { small: "h-28 w-28", medium: "h-40 w-40", large: "h-56 w-56" };

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className={labelCls}>
      {label}
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-transparent p-0.5"
        />
        <span className="font-mono text-xs text-gray-500">{value}</span>
      </span>
      <span className="text-[11px] font-normal text-gray-400">{hint}</span>
    </label>
  );
}

export function QrCardDesigner({
  origin,
  slug,
  logoUrl,
  tenant,
  initial,
}: {
  origin: string;
  slug: string;
  logoUrl: string | null;
  tenant: QrCardTenantDefaults;
  initial: QrCardDesign;
}) {
  const [d, setD] = useState<QrCardDesign>(initial);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const set = <K extends keyof QrCardDesign>(key: K, value: QrCardDesign[K]) => {
    setSaveMsg(null);
    setD((prev) => ({ ...prev, [key]: value }));
  };

  const labels = useMemo(() => buildQrCardLabels(d), [d]);
  const qrColor = safeQrColor(d.qr);
  const qrTooLight = contrastRatio(d.qr, "#ffffff") < QR_MIN_CONTRAST;
  const urls = useMemo(() => labels.map((l) => qrCardUrl(origin, slug, l)), [labels, origin, slug]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const entries = await Promise.all(
        urls.map(
          async (url) =>
            [
              url,
              await QRCode.toDataURL(url, {
                margin: 0,
                width: 480,
                errorCorrectionLevel: "M",
                color: { dark: qrColor, light: "#ffffff" },
              }),
            ] as const,
        ),
      );
      if (!cancelled) setQrs(Object.fromEntries(entries));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [urls, qrColor]);

  const defaults = defaultQrCardDesign(tenant);
  const pillText = readableTextOn(d.accent);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17] print:hidden">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">QR codes</h2>
          <p className="text-sm text-gray-500">
            Design the cards you print for your tables or counter. Scanning opens your storefront — for a table code,
            with Dine-in and that table already filled in.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => set("mode", "outlet")}
            className={`rounded-md border px-4 py-2 text-left text-sm ${d.mode === "outlet" ? "border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200" : "border-gray-300 text-gray-700"}`}
          >
            <span className="block font-semibold">One QR for my outlet</span>
            <span className="block text-xs text-gray-500">Bakery, café counter, takeaway shop — a single code</span>
          </button>
          <button
            type="button"
            onClick={() => set("mode", "tables")}
            className={`rounded-md border px-4 py-2 text-left text-sm ${d.mode === "tables" ? "border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200" : "border-gray-300 text-gray-700"}`}
          >
            <span className="block font-semibold">A QR per table</span>
            <span className="block text-xs text-gray-500">Dine-in — each table gets its own code</span>
          </button>
        </div>

        {d.mode === "outlet" ? (
          <label className={`${labelCls} max-w-xs`}>
            Caption under the QR
            <input
              value={d.outletCaption}
              maxLength={40}
              onChange={(e) => set("outletCaption", e.target.value)}
              placeholder="e.g. Order here, Counter"
              className={inputCls}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={d.labelMode === "numbered"}
                  onChange={() => set("labelMode", "numbered")}
                />
                Numbered tables
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={d.labelMode === "custom"} onChange={() => set("labelMode", "custom")} />
                My own table names (A1, Garden 2, Counter…)
              </label>
            </div>
            {d.labelMode === "numbered" ? (
              <div className="flex flex-wrap gap-3">
                <label className={labelCls}>
                  How many
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={d.count}
                    onChange={(e) => set("count", Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                    className={`${inputCls} w-24`}
                  />
                </label>
                <label className={labelCls}>
                  Start from
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={d.startNumber}
                    onChange={(e) => set("startNumber", Math.min(9999, Math.max(0, Number(e.target.value) || 0)))}
                    className={`${inputCls} w-24`}
                  />
                </label>
                <label className={labelCls}>
                  Word before the number
                  <input
                    value={d.labelWord}
                    maxLength={20}
                    onChange={(e) => set("labelWord", e.target.value)}
                    placeholder="Table, Seat, Cabin…"
                    className={`${inputCls} w-44`}
                  />
                </label>
              </div>
            ) : (
              <label className={labelCls}>
                Table names — one per line or separated by commas (up to 100)
                <textarea
                  value={d.customLabels}
                  rows={4}
                  onChange={(e) => set("customLabels", e.target.value)}
                  placeholder={"Counter\nA1\nA2\nGarden 1"}
                  className={`${inputCls} max-w-md`}
                />
                <span className="text-[11px] font-normal text-gray-400">
                  {labels.length} card{labels.length === 1 ? "" : "s"}. The name is what shows on the order.
                </span>
              </label>
            )}
          </div>
        )}

        <hr className="border-gray-100" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Text on the card</h3>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={d.showBrand} onChange={(e) => set("showBrand", e.target.checked)} />
              Show brand name
            </label>
            <input
              value={d.brandName}
              maxLength={80}
              disabled={!d.showBrand}
              onChange={(e) => set("brandName", e.target.value)}
              aria-label="Brand name"
              className={`${inputCls} disabled:opacity-50`}
            />
            {logoUrl && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={d.showLogo} onChange={(e) => set("showLogo", e.target.checked)} />
                Show my logo
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={d.showTagline} onChange={(e) => set("showTagline", e.target.checked)} />
              Show tagline
            </label>
            <input
              value={d.tagline}
              maxLength={120}
              disabled={!d.showTagline}
              onChange={(e) => set("tagline", e.target.value)}
              aria-label="Tagline"
              placeholder="Your tagline"
              className={`${inputCls} disabled:opacity-50`}
            />
            <label className={labelCls}>
              Extra line 1 (below the tagline)
              <input
                value={d.line1}
                maxLength={80}
                onChange={(e) => set("line1", e.target.value)}
                placeholder="e.g. Fresh bakes every morning"
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              Extra line 2
              <input
                value={d.line2}
                maxLength={80}
                onChange={(e) => set("line2", e.target.value)}
                placeholder="e.g. Free Wi-Fi: cafe123"
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              Call to action (under the QR)
              <input
                value={d.cta}
                maxLength={60}
                onChange={(e) => set("cta", e.target.value)}
                placeholder="Scan to order"
                className={inputCls}
              />
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Colours &amp; size</h3>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Card background" hint="Behind the text" value={d.bg} onChange={(v) => set("bg", v)} />
              <ColorField label="Brand name" hint="Name colour" value={d.brand} onChange={(v) => set("brand", v)} />
              <ColorField label="Other text" hint="Tagline & lines" value={d.text} onChange={(v) => set("text", v)} />
              <ColorField label="Accent" hint="Border & table tag" value={d.accent} onChange={(v) => set("accent", v)} />
              <ColorField label="QR code" hint="Keep it dark" value={d.qr} onChange={(v) => set("qr", v)} />
            </div>
            {qrTooLight && (
              <p className="text-xs text-amber-700">
                That QR colour is too light to scan reliably, so a dark colour is used instead. Pick a darker one.
              </p>
            )}
            <button
              type="button"
              onClick={() =>
                setD((prev) => ({
                  ...prev,
                  bg: defaults.bg,
                  brand: defaults.brand,
                  text: defaults.text,
                  accent: defaults.accent,
                  qr: defaults.qr,
                }))
              }
              className="w-fit text-xs font-medium text-indigo-600 hover:underline"
            >
              Use my brand colours (from Settings)
            </button>
            <label className={`${labelCls} max-w-[12rem]`}>
              Card size
              <select
                value={d.size}
                onChange={(e) => set("size", e.target.value as QrCardDesign["size"])}
                className={inputCls}
              >
                <option value="small">Small (more per page)</option>
                <option value="medium">Medium</option>
                <option value="large">Large (easier to scan)</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Print {labels.length} card{labels.length === 1 ? "" : "s"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              startSaving(async () => {
                const res = await saveQrCardDesignAction(d);
                setSaveMsg(res.error ?? "Design saved.");
              })
            }
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save this design"}
          </button>
          {saveMsg && <span className="text-xs text-gray-500">{saveMsg}</span>}
        </div>
      </section>

      {labels.length === 0 ? (
        <p className="text-sm text-gray-500 print:hidden">Add at least one table name to see the cards.</p>
      ) : (
        <div
          className={`grid gap-4 ${d.mode === "outlet" ? "mx-auto w-full max-w-sm grid-cols-1 print:max-w-md print:grid-cols-1" : GRID[d.size]}`}
        >
          {labels.map((label, i) => {
            const url = urls[i];
            return (
              <div
                key={label.value ?? "outlet"}
                className="flex break-inside-avoid flex-col items-center gap-2 rounded-xl p-4 text-center"
                style={{ background: d.bg, color: d.text, border: `3px solid ${d.accent}`, ...PRINT_EXACT }}
              >
                {d.showLogo && logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-12 w-auto max-w-[8rem] object-contain" />
                )}
                {d.showBrand && d.brandName.trim() && (
                  <p className="text-lg font-bold leading-tight" style={{ color: d.brand }}>
                    {d.brandName}
                  </p>
                )}
                {d.showTagline && d.tagline.trim() && <p className="text-xs italic">{d.tagline}</p>}
                {d.line1.trim() && <p className="text-xs">{d.line1}</p>}
                {d.line2.trim() && <p className="text-xs">{d.line2}</p>}
                <div className="rounded-lg bg-white p-2" style={PRINT_EXACT}>
                  {qrs[url] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrs[url]} data-qr-url={url} alt={`QR code${label.display ? ` for ${label.display}` : ""}`} className={QR_PX[d.size]} />
                  ) : (
                    <div className={`${QR_PX[d.size]} animate-pulse bg-gray-100`} />
                  )}
                </div>
                {d.cta.trim() && <p className="text-sm font-semibold">{d.cta}</p>}
                {label.display && (
                  <span
                    className="rounded-full px-3 py-0.5 text-sm font-bold"
                    style={{ background: d.accent, color: pillText, ...PRINT_EXACT }}
                  >
                    {label.display}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
