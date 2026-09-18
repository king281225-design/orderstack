import { NextResponse, type NextRequest } from "next/server";
import { isValidSlug, isSlugAvailable } from "@/lib/data/tenants";

// Best-effort per-instance limiter — this only exists so the endpoint can't
// be hammered; the real uniqueness guarantee is the DB constraint on submit.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

function allow(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 5000) hits.clear();
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allow(ip)) {
    return NextResponse.json({ status: "error" }, { status: 429 });
  }

  const slug = (request.nextUrl.searchParams.get("slug") ?? "").trim().toLowerCase();
  if (!isValidSlug(slug)) {
    return NextResponse.json({ status: "invalid" });
  }
  const available = await isSlugAvailable(slug);
  return NextResponse.json({ status: available ? "available" : "taken" });
}
