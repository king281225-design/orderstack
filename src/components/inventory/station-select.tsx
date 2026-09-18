"use client";

import { useTransition } from "react";

/** A station dropdown that saves as soon as it changes (no separate submit button). */
export function StationSelect({
  stations,
  value,
  label,
  onSave,
}: {
  stations: { id: string; name: string }[];
  value: string | null;
  label: string;
  onSave: (formData: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label={label}
      defaultValue={value ?? ""}
      disabled={pending}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("stationId", e.target.value);
        startTransition(() => onSave(fd));
      }}
      className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none disabled:opacity-50 dark:bg-transparent"
    >
      <option value="">Unassigned</option>
      {stations.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
