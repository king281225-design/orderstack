import Link from "next/link";
import { listFollowUpOverview, type FollowUpRow } from "@/lib/data/trial-followups";
import { TRIAL_FOLLOW_UP_LABELS, TRIAL_FOLLOW_UP_STEPS } from "@/lib/trial-followup";
import { resumeFollowUpsAction, stopFollowUpsAction } from "@/app/super-admin/follow-ups/actions";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "ACTIVE", label: "In sequence" },
  { key: "STOPPED", label: "Unsubscribed / stopped" },
  { key: "COMPLETED", label: "Sequence finished" },
  { key: "ALL", label: "All unpaid" },
] as const;

const STATE_STYLE: Record<FollowUpRow["state"], string> = {
  ACTIVE: "bg-green-100 text-green-800",
  STOPPED: "bg-red-100 text-red-800",
  COMPLETED: "bg-gray-100 text-gray-700",
};
const STATE_LABEL: Record<FollowUpRow["state"], string> = {
  ACTIVE: "Active",
  STOPPED: "Stopped",
  COMPLETED: "Finished",
};

const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: raw } = await searchParams;
  const filter = FILTERS.some((f) => f.key === raw) ? (raw as string) : "ACTIVE";
  const { rows, paidCount } = await listFollowUpOverview();
  const counts = {
    ACTIVE: rows.filter((r) => r.state === "ACTIVE").length,
    STOPPED: rows.filter((r) => r.state === "STOPPED").length,
    COMPLETED: rows.filter((r) => r.state === "COMPLETED").length,
  };
  const shown = filter === "ALL" ? rows : rows.filter((r) => r.state === filter);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Trial follow-up emails</h2>
        <p className="mt-1 text-sm text-gray-600">
          Unpaid restaurants get up to {TRIAL_FOLLOW_UP_STEPS.length} emails (sent daily at 10:00 AM IST) until they pay.
          Paying restaurants drop off automatically.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["In sequence", counts.ACTIVE],
          ["Unsubscribed / stopped", counts.STOPPED],
          ["Sequence finished", counts.COMPLETED],
          ["Converted (paid)", paidCount],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-lg border border-gray-200 bg-white p-3 dark:bg-[#241d17]">
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="text-xl font-semibold text-gray-900">{n}</dd>
          </div>
        ))}
      </dl>

      <nav className="flex flex-wrap gap-2" aria-label="Filter">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/super-admin/follow-ups?filter=${f.key}`}
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

      {shown.length === 0 && <p className="text-sm text-gray-500">No restaurants here.</p>}

      {shown.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Restaurant</th>
                <th className="px-3 py-2">Signed up</th>
                <th className="px-3 py-2">Trial</th>
                <th className="px-3 py-2">Emails sent</th>
                <th className="px-3 py-2">Next email</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/super-admin/restaurants/${r.id}`} className="font-medium text-gray-900 hover:underline">
                      {r.name}
                    </Link>
                    <div className="text-xs text-gray-500">{r.ownerEmail ?? "no owner email"}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{fmt(r.createdAt)}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {r.trial.kind === "trial" ? `${r.trial.daysLeft}d left` : "Ended"}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {r.stepsSent}/{TRIAL_FOLLOW_UP_STEPS.length}
                    {r.lastSentAt && <div className="text-xs text-gray-500">last {fmt(r.lastSentAt)}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {r.next ? (
                      <>
                        {TRIAL_FOLLOW_UP_LABELS[r.next.id]}
                        <div className="text-xs text-gray-500">from {fmt(r.next.dueAt)}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_STYLE[r.state]}`}>
                      {STATE_LABEL[r.state]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.state === "STOPPED" ? (
                      <form action={resumeFollowUpsAction.bind(null, r.id)}>
                        <button type="submit" className="text-xs font-medium text-indigo-600 hover:underline">
                          Resume
                        </button>
                      </form>
                    ) : r.state === "ACTIVE" ? (
                      <form action={stopFollowUpsAction.bind(null, r.id)}>
                        <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                          Stop
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length >= 300 && <p className="text-xs text-gray-500">Showing the 300 most recent unpaid restaurants.</p>}
    </div>
  );
}
