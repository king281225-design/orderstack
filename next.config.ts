import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Menu-photo and logo uploads go through Server Actions as
      // multipart/form-data (see src/lib/storage.ts) — the 1MB default is
      // too small for real photos, so raise it. Keep an eye on this if
      // photos still get rejected; bump further if needed.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
