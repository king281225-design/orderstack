import { ImageResponse } from "next/og";
import { ogImageTemplate, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/og/template";

export const alt = "BhojSetu — Restaurant Ordering & Billing Software for India";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

// Applies to "/" and acts as the fallback for every other marketing page
// that doesn't define its own opengraph-image (About, Contact, legal pages)
// — Next resolves the closest one up the route tree per route segment.
export default function Image() {
  return new ImageResponse(
    ogImageTemplate({
      heading: "Your restaurant, online in minutes",
      subheading: "Menu, QR table ordering, KOT, billing & inventory — with UPI/COD checkout.",
    }),
    { ...size },
  );
}
