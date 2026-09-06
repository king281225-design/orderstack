import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
