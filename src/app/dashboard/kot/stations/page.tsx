import Link from "next/link";
import { requireOwnerSession } from "@/lib/auth";
import { listMenuForTenant } from "@/lib/data/menu";
import { listStations } from "@/lib/data/inventory";
import { AddStationForm } from "@/components/inventory/station-forms";
import { StationSelect } from "@/components/inventory/station-select";
import {
  deleteStationAction,
  setCategoryStationAction,
  setItemStationAction,
} from "@/app/dashboard/inventory/actions";

export const dynamic = "force-dynamic";

export default async function StationsPage() {
  const session = await requireOwnerSession();
  const [categories, stations] = await Promise.all([
    listMenuForTenant(session.tenantId),
    listStations(session.tenantId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Kitchen stations</h2>
        <Link href="/dashboard/kot" className="text-sm font-medium text-indigo-600 hover:underline">
          ← Back to KOT
        </Link>
      </div>
      <p className="-mt-3 text-sm text-gray-500">
        Create a station for each part of your kitchen (Grill, Tandoor, Bar…), then assign menu items to them. Each
        order&apos;s KOT is then routed and printed per station, so the tandoor only sees tandoor items.
      </p>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Stations</h3>
        <AddStationForm />
        {stations.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {stations.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-800"
              >
                {s.name}
                <form action={deleteStationAction.bind(null, s.id)}>
                  <button type="submit" className="text-xs text-red-600 hover:underline" aria-label={`Delete ${s.name}`}>
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {stations.length === 0 ? (
        <p className="text-sm text-gray-500">Add a station above to start assigning items.</p>
      ) : (
        categories.map((c) => (
          <section key={c.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-[#241d17]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{c.name}</h3>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                Set whole category:
                <StationSelect
                  stations={stations}
                  value={null}
                  label={`Assign all items in ${c.name}`}
                  onSave={setCategoryStationAction.bind(null, c.id)}
                />
              </label>
            </div>
            <ul className="flex flex-col divide-y divide-gray-100">
              {[...c.items, ...c.subcategories.flatMap((sc) => sc.items)].map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="text-gray-800">{item.name}</span>
                  <StationSelect
                    stations={stations}
                    value={item.stationId}
                    label={`Station for ${item.name}`}
                    onSave={setItemStationAction.bind(null, item.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
