import type { ReactNode } from "react";

/**
 * One platform's card on /dashboard/integrations (Zomato/Swiggy today) —
 * array-driven on the page so a future platform (Magicpin, …) is just
 * another entry, not a new layout. Each card hosts its own connect form or
 * connected-state block (children) since a restaurant's id differs per
 * platform — see the DynoRestaurantLink schema comment.
 */
export function PlatformCard({
  icon,
  name,
  description,
  connected,
  children,
}: {
  icon: ReactNode;
  name: string;
  description: string;
  connected: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white dark:bg-[#241d17] p-4 shadow-sm">
      <div className="flex items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
