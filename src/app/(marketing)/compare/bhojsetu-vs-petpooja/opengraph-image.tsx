import { ImageResponse } from "next/og";
import { ogImageTemplate, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/og/template";

export const alt = "BhojSetu vs Petpooja — Restaurant Ordering & Billing Compared";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    ogImageTemplate({
      heading: "BhojSetu vs Petpooja",
      subheading: "Transparent flat pricing vs a quote-only POS system — see who each one fits.",
      badge: null,
    }),
    { ...size },
  );
}
