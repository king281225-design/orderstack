import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantsForDeletion } from "@/lib/data/tenants";
import { deleteTenantsAction } from "@/app/super-admin/actions";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/components/super-admin/format";

export const dynamic = "force-dynamic";

export default async function DeleteRestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const sp = await searchParams;
  const ids = [...new Set([sp.id ?? []].flat())].slice(0, 200);
  if (ids.length === 0) redirect("/super-admin");

  const tenants = await getTenantsForDeletion(ids);
  if (tenants.length === 0) redirect("/super-admin");

  const withOrders = tenants.filter((t) => t._count.orders > 0);
  const paid = tenants.filter((t) => t.subscriptionStatus === "ACTIVE" && (t.billingPeriod || t.razorpaySubscriptionId));
  const totalOrders = tenants.reduce((n, t) => n + t._count.orders, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/super-admin" className="text-sm text-gray-500 hover:underline">
          ← Cancel, back to restaurants
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">
          Permanently delete {tenants.length} restaurant{tenants.length === 1 ? "" : "s"}?
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          This cannot be undone. Each restaurant&apos;s logins, menu, orders, coupons, staff and support tickets are
          deleted with it, and its storefront link stops working. Uploaded photos stay in storage.
        </p>
      </div>

      {(withOrders.length > 0 || paid.length > 0) && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Check this list carefully — these may be real customers:</p>
          <ul className="mt-1 list-disc pl-5">
            {withOrders.length > 0 && (
              <li>
                {withOrders.length} of them ha{withOrders.length === 1 ? "s" : "ve"} placed orders ({totalOrders} orders
                in total) — those orders will be lost.
              </li>
            )}
            {paid.length > 0 && (
              <li>
                {paid.length} ha{paid.length === 1 ? "s" : "ve"} paid access with a billing record:{" "}
                {paid.map((t) => t.name).join(", ")}.
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-[#241d17]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2">Restaurant</th>
              <th className="px-4 py-2">Signed up</th>
              <th className="px-4 py-2">Orders</th>
              <th className="px-4 py-2">Revenue</th>
              <th className="px-4 py-2">Menu items</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className={`border-b border-gray-100 last:border-0 ${t._count.orders > 0 ? "bg-red-50/60" : ""}`}>
                <td className="px-4 py-2">
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    /r/{t.slug} · {t.ownerEmail ?? "no owner login"}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-gray-600">{formatDate(t.createdAt)}</td>
                <td className="px-4 py-2">{t._count.orders}</td>
                <td className="px-4 py-2">{formatINR(t.revenueCents)}</td>
                <td className="px-4 py-2">{t._count.items}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={deleteTenantsAction} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4">
        {tenants.map((t) => (
          <input key={t.id} type="hidden" name="id" value={t.id} />
        ))}
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Type <span className="font-mono font-bold text-red-700">DELETE</span> to confirm
          <input
            name="confirm"
            required
            pattern="DELETE"
            autoComplete="off"
            placeholder="DELETE"
            className="w-48 rounded-md border border-gray-300 px-3 py-1.5 font-mono focus:border-red-600 focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Delete {tenants.length} restaurant{tenants.length === 1 ? "" : "s"} permanently
          </button>
          <Link href="/super-admin" className="text-sm text-gray-600 hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
