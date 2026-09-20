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

/** yyyy-mm-dd of the IST calendar day — for <input type="date"> values. */
export function toDateInput(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** How far off a paid-until date is: text + a tone the caller maps to a colour. */
export function paidUntilNote(d: Date, now: number): { text: string; tone: "ok" | "soon" | "expired" } {
  const days = Math.ceil((d.getTime() - now) / 86_400_000);
  if (days < 0) return { text: `Expired ${-days}d ago`, tone: "expired" };
  if (days <= 7) return { text: `Renews in ${days}d`, tone: "soon" };
  return { text: `Paid until ${formatDate(d)}`, tone: "ok" };
}
