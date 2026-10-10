import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getTenantById } from "@/lib/data/tenants";
import {
  ANALYTICS_PRESETS,
  getAnalyticsReport,
  isAnalyticsPreset,
  listCategoriesForTenants,
  rangeForPreset,
} from "@/lib/data/analytics";
import { tenantHasFeature } from "@/lib/plans";
import { PAYMENT_SOURCE_LABEL } from "@/lib/payment-sources";
import { buildAnalyticsPdf } from "@/lib/reports/analytics-pdf";
import { resolveStoreScope, verifyActiveStoreAccess } from "@/lib/data/business";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Owner-only analytics PDF. Inline by default (browser PDF viewer = preview +
 * print); `?download=1` forces a file download. The set of stores is
 * resolved on the server from the session (never from a request parameter —
 * `scope=all` only widens to stores of the session's own business).
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.impersonatorId && !(await verifyActiveStoreAccess(session.sub, session.tenantId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getTenantById(session.tenantId);
  if (!tenant || !tenantHasFeature(tenant, "analytics")) {
    return NextResponse.json({ error: "Analytics is not included in this plan." }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const now = new Date();
  let range = rangeForPreset("last30", now);
  let periodLabel = "Last 30 days";
  const from = sp.get("from");
  const to = sp.get("to");
  if (from && to) {
    const f = new Date(from);
    const t = new Date(to);
    t.setHours(23, 59, 59, 999);
    if (!Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime()) && f <= t) {
      range = { from: f, to: t };
      periodLabel = `${fmtDate(f)} – ${fmtDate(t)}`;
    }
  } else {
    const p = sp.get("preset");
    if (isAnalyticsPreset(p)) {
      range = rangeForPreset(p, now);
      periodLabel = `${ANALYTICS_PRESETS.find((x) => x.key === p)!.label} (${fmtDate(range.from)} – ${fmtDate(range.to)})`;
    }
  }

  const scope = await resolveStoreScope(session.tenantId, session.sub, sp.get("scope") === "all");
  const categories = await listCategoriesForTenants(scope.tenantIds);
  const categoryId = categories.find((c) => c.id === sp.get("category"))?.id ?? null;
  const sourceParam = sp.get("source");
  const paymentSource = sourceParam && sourceParam in PAYMENT_SOURCE_LABEL ? sourceParam : null;

  const report = await getAnalyticsReport(scope.tenantIds, range, { categoryId, paymentSource });

  const filters: string[] = [];
  if (paymentSource) filters.push(`Payment source: ${PAYMENT_SOURCE_LABEL[paymentSource]}`);
  if (categoryId) filters.push(`Category: ${categories.find((c) => c.id === categoryId)?.name}`);

  const pdf = await buildAnalyticsPdf(report, {
    businessName: scope.businessName ?? tenant.name,
    storeName: scope.isAll ? "All stores" : tenant.name,
    periodLabel,
    filtersText: filters.join(" · "),
    generatedAt: now,
  });

  const filename = `analytics-${tenant.slug}-${now.toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${sp.get("download") === "1" ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
