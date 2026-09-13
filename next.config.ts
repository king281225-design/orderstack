import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone/server.js — needed to run
  // this app on a plain Node.js host that just executes a startup file
  // (e.g. Hostinger shared hosting's Node.js app manager in hPanel), rather
  // than a platform that already knows how to run `next start` itself.
  //
  // Correction (2026-09-13): a real Vercel deploy proved the original
  // comment here wrong — Vercel does NOT just ignore this. It failed with
  // `ENOENT .../next-server.js.nft.json` because Vercel's own serverless
  // function packaging expects the standard (non-standalone) build output's
  // trace files, which standalone mode doesn't produce in that shape. Vercel
  // sets `VERCEL=1` in its build environment, so only opt into standalone
  // output when NOT building on Vercel — Hostinger (or any other plain
  // Node host) still gets it, Vercel gets Next's normal output.
  output: process.env.VERCEL ? undefined : "standalone",
  // tesseract.js (free OCR menu import, src/lib/ai/menu-import.ts) resolves
  // its Node worker script relative to its own package directory at
  // runtime — bundling it broke that path resolution (surfaced as
  // "Cannot find module '...\tesseract.js\src\worker-script\node\index.js'"
  // under a rewritten, nonexistent path). pdf-parse pulls in pdfjs-dist,
  // which has similar Node-native/dynamic-require needs. Both are opted out
  // of Server Component bundling so they load via plain Node `require`.
  serverExternalPackages: ["tesseract.js", "pdf-parse"],
  experimental: {
    serverActions: {
      // Menu-photo/logo/hardcopy-menu-document uploads all go through Server
      // Actions as multipart/form-data (see src/lib/storage.ts) — the 1MB
      // default is far too small for real files. 8mb was already too small
      // in practice: a scanned multi-page PDF menu or a full-resolution
      // phone photo of a paper menu routinely exceeds it (hit for real via
      // the hardcopy-menu-upload feature, not just theorized). 25mb covers
      // realistic phone-camera photos and modest multi-page PDF scans; bump
      // further if a real upload still gets rejected.
      bodySizeLimit: "25mb",
    },
    // A SEPARATE limit from serverActions.bodySizeLimit above: src/proxy.ts
    // (Next 16's renamed middleware) buffers the whole request body up to
    // this cap before the route/action ever sees it — defaults to 10MB
    // regardless of the server-action limit, and truncates silently rather
    // than erroring, which surfaced as a confusing downstream "Unexpected
    // end of form" in the server action's own multipart parser. Every
    // /dashboard/* upload goes through the proxy (it gates that whole
    // path), so this has to match serverActions.bodySizeLimit, not just
    // that setting alone.
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
