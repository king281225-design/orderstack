import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, isR2Configured, R2_PREFIX } from "@/lib/storage";

/**
 * Serves R2-stored images without ever exposing R2 credentials to the
 * browser: sign a short-lived GET URL server-side, redirect to it. `key` is
 * the full object key (e.g. "orderstack/items/<uuid>.jpg") — see
 * src/lib/storage.ts, which is the only place that writes these keys.
 *
 * The bucket is shared with another, unrelated project (see storage.ts) —
 * this route is otherwise an open, unauthenticated proxy for any key an
 * unauthenticated caller happens to ask for, so it must never sign a key
 * outside BhojSetu's own R2_PREFIX. Object keys are random UUIDs, so
 * guessing one is impractical, but this closes the gap rather than relying
 * on that alone.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 404 });
  }

  const { key } = await params;
  const objectKey = key.join("/");

  if (!objectKey.startsWith(`${R2_PREFIX}/`)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getSignedUrl(
    getR2Client(),
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: objectKey }),
    { expiresIn: 3600 },
  );

  return NextResponse.redirect(url);
}
