// Runs once when the Next.js server process starts, before any request is
// handled — see node_modules/next/dist/docs/.../instrumentation.md.
//
// Used here for a narrow polyfill: pdf-parse (AI menu import's PDF path,
// src/lib/ai/menu-import.ts) depends on pdfjs-dist, which references the
// browser API DOMMatrix — not a real Node.js global. Locally this happened
// to work because pdf-parse's own dependency @napi-rs/canvas (a native
// addon) sets it up; on Vercel's serverless Node runtime that native
// binary fails to load/trace, leaving DOMMatrix undefined and crashing on
// import (hit for real: every visit to /dashboard/menu 500'd, since
// Turbopack's `serverExternalPackages` handling loads external packages
// referenced anywhere in a route's module graph at chunk-load time, not
// deferred to actual call time the way a plain dynamic import() would be —
// so lazy-importing pdf-parse alone didn't fix it). Polyfilling the global
// here, once, before the module graph loads at all, fixes it regardless of
// when/how pdf-parse itself gets pulled in.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && typeof globalThis.DOMMatrix === "undefined") {
    const { default: DOMMatrix } = await import("dommatrix");
    (globalThis as unknown as { DOMMatrix: unknown }).DOMMatrix = DOMMatrix;
  }
}
