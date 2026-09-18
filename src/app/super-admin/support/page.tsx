import Link from "next/link";
import { listAllTickets, CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/data/support";
import { updateSupportTicketAction } from "@/app/super-admin/support/actions";
import { nowMs } from "@/lib/time";
import type { SupportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string }[] = [
  { key: "ACTIVE", label: "Needs attention" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
  { key: "ALL", label: "All" },
];

const PRIORITY_STYLE = {
  URGENT: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  NORMAL: "bg-gray-100 text-gray-700",
  LOW: "bg-gray-100 text-gray-500",
} as const;

function age(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h ${min % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default async function SupportQueuePage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: raw } = await searchParams;
  const filter = FILTERS.some((f) => f.key === raw) ? (raw as string) : "ACTIVE";
  const tickets = await listAllTickets(filter === "ALL" ? undefined : (filter as SupportStatus | "ACTIVE"));
  const now = nowMs();

  // Urgent first, then oldest first — the queue is worked front to back.
  const rank = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const;
  const sorted = [...tickets].sort((a, b) =>
    filter === "ACTIVE"
      ? rank[a.priority] - rank[b.priority] || a.createdAt.getTime() - b.createdAt.getTime()
      : b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-gray-900">Support requests</h2>
      <nav className="flex flex-wrap gap-2" aria-label="Filter">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/super-admin/support?filter=${f.key}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === f.key
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-indigo-400 dark:bg-[#241d17]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {sorted.length === 0 && <p className="text-sm text-gray-500">No requests here.</p>}

      {sorted.map((t) => {
        const waMsg = `Hi ${t.contactName}, this is the BhojSetu team about your support ticket #${t.ticketNumber} (${t.subject}).`;
        const waNumber = t.contactPhone.replace(/\D/g, "");
        return (
          <article key={t.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">
                #{t.ticketNumber} · {t.subject}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-0.5 font-semibold ${PRIORITY_STYLE[t.priority]}`}>
                  {PRIORITY_LABEL[t.priority]}
                </span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-800">
                  {STATUS_LABEL[t.status]}
                </span>
                <span className="text-gray-500">
                  {t.status === "RESOLVED" || t.status === "CLOSED" ? "" : `open ${age(now - t.createdAt.getTime())}`}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              <strong>{t.tenant.name}</strong> ({t.tenant.slug}, {t.tenant.planTier}) · {CATEGORY_LABEL[t.category]} ·{" "}
              {t.createdAt.toLocaleString("en-IN")}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">{t.description}</p>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-gray-600 sm:grid-cols-2">
              <div>Area: {t.area ?? "—"}</div>
              <div>Order #: {t.orderNumber ?? "—"}</div>
              <div>
                Contact: {t.contactName} · {t.contactPhone} · {t.contactEmail}
              </div>
              <div>
                Prefers: {t.preferredContact.toLowerCase()}
                {t.bestTime ? ` · ${t.bestTime}` : ""}
              </div>
              {t.userAgent && <div className="sm:col-span-2">Browser: {t.userAgent}</div>}
            </dl>
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
              {t.screenshotUrl && (
                <a href={t.screenshotUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  View screenshot
                </a>
              )}
              <a href={`tel:${t.contactPhone}`} className="text-indigo-600 hover:underline">
                Call
              </a>
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`}
                target="_blank"
                rel="noreferrer"
                className="text-green-700 hover:underline"
              >
                WhatsApp
              </a>
              <a href={`mailto:${t.contactEmail}`} className="text-indigo-600 hover:underline">
                Email
              </a>
            </div>

            <form action={updateSupportTicketAction.bind(null, t.id)} className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                Reply to the restaurant (they see this on their Help page and by email)
                <textarea
                  name="adminResponse"
                  rows={3}
                  defaultValue={t.adminResponse ?? ""}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none dark:bg-transparent"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  name="status"
                  defaultValue={t.status}
                  aria-label="Status"
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:bg-transparent"
                >
                  {(Object.keys(STATUS_LABEL) as SupportStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save &amp; notify
                </button>
              </div>
            </form>
          </article>
        );
      })}
    </div>
  );
}
