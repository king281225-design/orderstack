import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import { formatINR } from "@/lib/money";
import { PAYMENT_SOURCE_LABEL } from "@/lib/payment-sources";
import type { AnalyticsReport } from "@/lib/data/analytics";

const FONT_REGULAR = path.join(process.cwd(), "assets", "fonts", "NotoSans-Regular.ttf");
const FONT_BOLD = path.join(process.cwd(), "assets", "fonts", "NotoSans-Bold.ttf");

const INK = "#1f2937";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const BRAND = "#4f46e5";
const BRAND_SOFT = "#eef2ff";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40;
const CONTENT_W = PAGE_W - M * 2;

export type ReportMeta = {
  businessName: string;
  storeName: string;
  periodLabel: string;
  /** Human-readable active filters, e.g. "Payment source: PhonePe". */
  filtersText: string;
  generatedAt: Date;
};

/** Renders the owner-facing analytics report as an A4 PDF (print-friendly, light background only). */
export function buildAnalyticsPdf(report: AnalyticsReport, meta: ReportMeta): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: M, font: FONT_REGULAR, bufferPages: true, info: {
      Title: `Analytics report — ${meta.storeName}`,
      Author: "BhojSetu",
    } });
    doc.registerFont("Regular", FONT_REGULAR);
    doc.registerFont("Bold", FONT_BOLD);

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const bottom = () => PAGE_H - M - 20;
    const ensure = (h: number) => {
      if (doc.y + h > bottom()) doc.addPage();
    };
    const heading = (text: string) => {
      ensure(60);
      doc.moveDown(0.8);
      doc.font("Bold").fontSize(13).fillColor(INK).text(text, M, doc.y, { width: CONTENT_W });
      const y = doc.y + 2;
      doc.moveTo(M, y).lineTo(M + CONTENT_W, y).strokeColor(BRAND).lineWidth(1.2).stroke();
      doc.y = y + 8;
    };

    // ---- Header ------------------------------------------------------------
    doc.rect(0, 0, PAGE_W, 86).fill(BRAND);
    doc.fillColor("#ffffff").font("Bold").fontSize(20).text("Analytics Report", M, 24, { width: CONTENT_W });
    doc.font("Regular").fontSize(10).text(`${meta.businessName}${meta.storeName !== meta.businessName ? ` · ${meta.storeName}` : ""}`, M, 52, { width: CONTENT_W });
    doc.fontSize(9).text(`Report period: ${meta.periodLabel}   |   Generated: ${meta.generatedAt.toLocaleString("en-IN")}`, M, 68, { width: CONTENT_W });
    doc.y = 100;
    if (meta.filtersText) {
      doc.font("Regular").fontSize(9).fillColor(MUTED).text(`Filters: ${meta.filtersText}`, M, doc.y, { width: CONTENT_W });
      doc.moveDown(0.3);
    }

    // ---- KPI grid -----------------------------------------------------------
    const kpiGrid = (items: [string, string][], cols = 3) => {
      const gap = 8;
      const w = (CONTENT_W - gap * (cols - 1)) / cols;
      const h = 44;
      for (let i = 0; i < items.length; i += cols) {
        ensure(h + 6);
        const y = doc.y;
        items.slice(i, i + cols).forEach(([label, value], j) => {
          const x = M + j * (w + gap);
          doc.roundedRect(x, y, w, h, 4).fillAndStroke(BRAND_SOFT, LINE);
          doc.fillColor(MUTED).font("Regular").fontSize(8).text(label.toUpperCase(), x + 8, y + 7, { width: w - 16, lineBreak: false });
          doc.fillColor(INK).font("Bold").fontSize(13).text(value, x + 8, y + 21, { width: w - 16, lineBreak: false });
        });
        doc.y = y + h + 6;
      }
    };

    // ---- Sales ----------------------------------------------------------------
    heading("Sales summary");
    const growth = report.salesGrowthPct;
    kpiGrid([
      ["Gross sales", formatINR(report.grossSalesCents)],
      ["Net sales (after discounts)", formatINR(report.netSalesCents)],
      ["Total revenue (incl. tax)", formatINR(report.totalRevenueCents)],
      ["Orders", String(report.totalOrders)],
      ["Avg. order value", formatINR(report.avgOrderCents)],
      ["Items sold", String(report.itemsSold)],
      ["Discounts given", formatINR(report.totalDiscountCents)],
      ["Tax / GST collected", formatINR(report.totalTaxCents)],
      ["Growth vs previous period", growth == null ? "—" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`],
    ]);

    // Daily sales bar chart
    ensure(150);
    doc.font("Bold").fontSize(10).fillColor(INK).text("Daily sales", M, doc.y);
    doc.y += 4;
    const chartTop = doc.y;
    const chartH = 100;
    const chartW = CONTENT_W;
    doc.rect(M, chartTop, chartW, chartH).strokeColor(LINE).lineWidth(0.5).stroke();
    if (report.revenueByDay.length === 0) {
      doc.font("Regular").fontSize(9).fillColor(MUTED).text("No orders in this period.", M + 8, chartTop + 40);
    } else {
      const days = report.revenueByDay;
      const max = Math.max(1, ...days.map((d) => d.revenueCents));
      const slot = chartW / days.length;
      const barW = Math.max(1.5, Math.min(24, slot * 0.7));
      days.forEach((d, i) => {
        const bh = Math.max(1, (d.revenueCents / max) * (chartH - 12));
        doc.rect(M + i * slot + (slot - barW) / 2, chartTop + chartH - bh, barW, bh).fill(BRAND);
      });
      doc.fillColor(MUTED).font("Regular").fontSize(7);
      doc.text(`Peak ${formatINR(max)}`, M + 4, chartTop + 2, { lineBreak: false });
      doc.text(days[0].day, M, chartTop + chartH + 3, { lineBreak: false });
      doc.text(days[days.length - 1].day, M, chartTop + chartH + 3, { width: chartW, align: "right", lineBreak: false });
    }
    doc.y = chartTop + chartH + 16;

    // ---- Payments ----------------------------------------------------------------
    heading("Payment summary");
    kpiGrid([
      ["Total payment received", formatINR(report.payments.totalPaidCents)],
      ["Successful payments", String(report.payments.successfulCount)],
      ["Pending", `${report.payments.pendingCount} · ${formatINR(report.payments.pendingCents)}`],
      ["Failed", `${report.payments.failedCount} · ${formatINR(report.payments.failedCents)}`],
      ["Refunded", `${report.payments.refundedCount} · ${formatINR(report.payments.refundedCents)}`],
    ]);

    table(
      doc,
      ensure,
      ["Payment source", "Transactions", "Amount", "Share"],
      report.payments.sources.map((s) => [PAYMENT_SOURCE_LABEL[s.source] ?? s.source, String(s.transactions), formatINR(s.amountCents), `${s.pct.toFixed(1)}%`]),
      [0.4, 0.2, 0.25, 0.15],
      "No confirmed payments in this period.",
    );

    // Payment source bar chart
    if (report.payments.sources.length > 0) {
      ensure(report.payments.sources.length * 16 + 24);
      doc.moveDown(0.5);
      const top = doc.y;
      report.payments.sources.forEach((s, i) => {
        const y = top + i * 16;
        doc.font("Regular").fontSize(8).fillColor(INK).text(PAYMENT_SOURCE_LABEL[s.source] ?? s.source, M, y + 2, { width: 110, lineBreak: false });
        const full = CONTENT_W - 170;
        doc.rect(M + 115, y + 1, full, 9).fill("#f3f4f6");
        doc.rect(M + 115, y + 1, Math.max(1, (full * s.pct) / 100), 9).fill(BRAND);
        doc.fillColor(INK).text(`${s.pct.toFixed(0)}%`, M + 120 + full, y + 2, { width: 40, lineBreak: false });
      });
      doc.y = top + report.payments.sources.length * 16 + 6;
    }

    // ---- Product performance -------------------------------------------------------
    ensure(150); // keep the heading with its first table
    heading("Product performance");
    const perfRows = (items: AnalyticsReport["menu"]["best"]) =>
      items.map((i) => [i.name, i.categoryName, String(i.quantity), formatINR(i.revenueCents)]);
    const cols = [0.38, 0.27, 0.12, 0.23];
    const perfHead = ["Item", "Category", "Units", "Revenue"];
    sub(doc, ensure, "Best-selling items");
    table(doc, ensure, perfHead, perfRows(report.menu.best), cols, "No item sales in this period.");
    sub(doc, ensure, "Average-selling items");
    table(doc, ensure, perfHead, perfRows(report.menu.average), cols, "None.");
    sub(doc, ensure, "Least-selling items");
    table(doc, ensure, perfHead, perfRows(report.menu.least), cols, "None.");
    sub(doc, ensure, `Items with zero sales (${report.menu.notSold.length})`);
    table(
      doc,
      ensure,
      ["Item", "Category", "Units", "Status"],
      report.menu.notSold.slice(0, 40).map((i) => [i.name, i.categoryName, "0", i.isAvailable === false ? "Hidden" : "Active"]),
      cols,
      "Every menu item sold at least once.",
    );
    if (report.menu.notSold.length > 40) {
      doc.font("Regular").fontSize(8).fillColor(MUTED).text(`…and ${report.menu.notSold.length - 40} more.`, M, doc.y + 2);
    }
    sub(doc, ensure, "Revenue by category");
    table(
      doc,
      ensure,
      ["Category", "Units", "Revenue", "Share"],
      report.menu.categoryPerformance.map((c) => [c.category, String(c.quantity), formatINR(c.revenueCents), `${c.contributionPct.toFixed(1)}%`]),
      [0.4, 0.15, 0.25, 0.2],
      "No item sales in this period.",
    );

    // ---- Customers --------------------------------------------------------------------
    heading("Customer summary");
    kpiGrid([
      ["Total customers", String(report.customers.total)],
      ["New customers", String(report.customers.new)],
      ["Returning customers", String(report.customers.returning)],
      ["Repeat rate", `${report.customers.repeatRatePct.toFixed(0)}%`],
      ["Avg. spend / customer", formatINR(report.customers.avgSpendCents)],
    ]);

    // ---- Per store (only when more than one store is in the report) -----------------------
    if (report.byStore.length > 1) {
      heading("Store-wise summary");
      table(
        doc,
        ensure,
        ["Store", "Orders", "Revenue", "Top payment source"],
        report.byStore.map((s) => [
          s.name,
          String(s.orders),
          formatINR(s.revenueCents),
          s.paymentSources[0] ? `${PAYMENT_SOURCE_LABEL[s.paymentSources[0].source] ?? s.paymentSources[0].source}` : "—",
        ]),
        [0.35, 0.15, 0.25, 0.25],
        "No stores.",
      );
    }

    // ---- Footer on every page --------------------------------------------------------------
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.font("Regular").fontSize(8).fillColor(MUTED);
      // Writing below the bottom margin would trigger an automatic new page, so lift the margin first.
      doc.page.margins.bottom = 0;
      doc.text(`BhojSetu analytics · ${meta.storeName} · Page ${i + 1} of ${range.count}`, M, PAGE_H - 30, { width: CONTENT_W, align: "center", lineBreak: false });
    }

    doc.end();
  });
}

function sub(doc: PDFKit.PDFDocument, ensure: (h: number) => void, text: string) {
  ensure(50);
  doc.moveDown(0.4);
  doc.font("Bold").fontSize(10).fillColor(INK).text(text, M, doc.y);
  doc.y += 3;
}

/** Simple fixed-column table that breaks across pages and repeats nothing fancy — rows are one line, truncated. */
function table(
  doc: PDFKit.PDFDocument,
  ensure: (h: number) => void,
  head: string[],
  rows: string[][],
  widths: number[],
  emptyText: string,
) {
  const colX: number[] = [];
  let acc = M;
  for (const w of widths) {
    colX.push(acc);
    acc += CONTENT_W * w;
  }
  const rowH = 16;
  const drawRow = (cells: string[], bold: boolean, fill?: string) => {
    ensure(rowH + 2);
    const y = doc.y;
    if (fill) doc.rect(M, y, CONTENT_W, rowH).fill(fill);
    doc.fillColor(INK).font(bold ? "Bold" : "Regular").fontSize(8.5);
    cells.forEach((c, i) => {
      const align = i === 0 ? "left" : i === 1 && head[1] === "Category" ? "left" : "right";
      doc.text(c, colX[i] + 4, y + 4, { width: CONTENT_W * widths[i] - 8, align, lineBreak: false, ellipsis: true });
    });
    doc.y = y + rowH;
    doc.moveTo(M, doc.y).lineTo(M + CONTENT_W, doc.y).strokeColor(LINE).lineWidth(0.4).stroke();
  };
  drawRow(head, true, BRAND_SOFT);
  if (rows.length === 0) {
    ensure(rowH);
    doc.font("Regular").fontSize(8.5).fillColor(MUTED).text(emptyText, M + 4, doc.y + 4);
    doc.y += rowH;
    return;
  }
  for (const r of rows) drawRow(r, false);
  doc.y += 4;
}
