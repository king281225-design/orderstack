const TZ = "Asia/Kolkata";

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString("en-IN", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "5m ago" / "3h ago" / "2d ago" — for a "last order" column. */
export function timeAgo(d: Date, now: number): string {
  const min = Math.max(0, Math.round((now - d.getTime()) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
