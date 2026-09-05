import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, isR2Configured } from "@/lib/storage";

/**
 * Serves R2-stored images without ever exposing R2 credentials to the
 * browser: sign a short-lived GET URL server-side, redirect to it. `key` is
 * the full object key (e.g. "orderstack/items/<uuid>.jpg") — see
 * src/lib/storage.ts, which is the only place that writes these keys.
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

  const url = await getSignedUrl(
    getR2Client(),
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: objectKey }),
    { expiresIn: 3600 },
  );

  return NextResponse.redirect(url);
}
