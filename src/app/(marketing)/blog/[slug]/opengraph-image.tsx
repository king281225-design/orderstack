import { ImageResponse } from "next/og";
import { getBlogPost } from "@/lib/blog/posts";
import { ogImageTemplate, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/og/template";

export const alt = "BhojSetu Blog";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

// Per-post image (the real title/description) rather than the shared
// /blog index fallback — file-convention images don't cascade from a
// parent segment into a dynamic child segment, so without this file
// /blog/[slug] posts would render with no og:image/twitter:image at all.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  return new ImageResponse(
    ogImageTemplate({
      heading: post?.title ?? "BhojSetu Blog",
      subheading: post?.description ?? "Restaurant ordering & billing, explained.",
      badge: null,
    }),
    { ...size },
  );
}
