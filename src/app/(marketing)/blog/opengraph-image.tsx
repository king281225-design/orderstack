import { ImageResponse } from "next/og";
import { ogImageTemplate, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/og/template";

export const alt = "BhojSetu Blog — Restaurant Ordering & Billing, Explained";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

// A single shared image for /blog and every /blog/[slug] post — a per-post
// generated image (reading each post's own title) would need its own file
// in that [slug] segment; this is the "sensible shared fallback" instead.
export default function Image() {
  return new ImageResponse(
    ogImageTemplate({
      heading: "Restaurant ordering & billing, explained",
      subheading: "Guides on KOT, inventory, QR ordering, and running a restaurant in India.",
      badge: null,
    }),
    { ...size },
  );
}
