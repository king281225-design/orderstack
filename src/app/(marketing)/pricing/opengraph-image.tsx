import { ImageResponse } from "next/og";
import { ogImageTemplate, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/og/template";

export const alt = "BhojSetu Pricing — Plans from ₹499/month, No Per-Order Commission";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    ogImageTemplate({
      heading: "Flat monthly pricing. No per-order commission.",
      subheading: "Plans from ₹499/month — menu, orders, billing & QR table ordering included.",
    }),
    { ...size },
  );
}
