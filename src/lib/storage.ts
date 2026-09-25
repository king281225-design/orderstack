import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Real image uploads for logos and menu photos, backed by Cloudflare R2
 * (S3-compatible). The bucket ("dmc") is shared with another, unrelated
 * project — everything BhojSetu writes lives under the `orderstack/`
 * prefix so the two don't collide.
 *
 * The bucket is treated as private: uploads go straight to R2 via
 * PutObjectCommand, and reads go through /api/media/[...key], which signs a
 * short-lived GET URL server-side and redirects to it (see that route) —
 * the R2 credentials never reach the browser, and this works regardless of
 * whether the bucket has public access configured.
 *
 * Without R2 credentials set, this falls back to writing into
 * /public/uploads — fine for local dev, but NOT durable once deployed.
 */
export const R2_PREFIX = "orderstack";

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET,
  );
}

export function getR2Client(): S3Client {
  const endpoint =
    process.env.R2_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined);
  if (!endpoint) {
    throw new Error("R2_ENDPOINT (or R2_ACCOUNT_ID) must be set to use R2 storage.");
  }
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

// Menu-item photos and logos get rendered as small thumbnails everywhere
// (storefront cards, dashboard lists) but were previously stored and served
// at whatever raw size the phone camera produced (often several MB, 3000px+
// wide) — real weak POS hardware (e.g. Posiflex terminals) visibly stalls
// decoding that much image data just to paint a tiny card. menu-docs (a
// scanned paper menu a customer reads full-size, sometimes a PDF) and
// support screenshots (internal-only, rarely viewed) are left untouched.
const MAX_DIMENSION: Partial<Record<"logos" | "items" | "menu-docs" | "support" | "purchase-scans", number>> = {
  logos: 800,
  items: 1280,
};

async function processImage(
  bytes: Buffer,
  folder: "logos" | "items" | "menu-docs" | "support" | "purchase-scans",
  ext: string,
  contentType: string,
): Promise<{ bytes: Buffer; ext: string; contentType: string }> {
  const maxDim = MAX_DIMENSION[folder];
  // Animated GIFs would lose their animation if we resized just the first
  // frame — leave those, and anything outside our two thumbnail-heavy
  // folders, exactly as uploaded.
  if (!maxDim || ext === ".gif") return { bytes, ext, contentType };
  try {
    const resized = sharp(bytes).rotate().resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true });
    if (ext === ".png") {
      return { bytes: await resized.png({ quality: 80, compressionLevel: 9 }).toBuffer(), ext: ".png", contentType: "image/png" };
    }
    return { bytes: await resized.jpeg({ quality: 80, mozjpeg: true }).toBuffer(), ext: ".jpg", contentType: "image/jpeg" };
  } catch {
    // A corrupt or unusual file sharp can't parse shouldn't fail the whole
    // upload — fall back to storing it exactly as received.
    return { bytes, ext, contentType };
  }
}

export async function saveUpload(
  file: File,
  folder: "logos" | "items" | "menu-docs" | "support" | "purchase-scans",
): Promise<string> {
  const rawExt = safeExt(file.name, folder);
  const rawBytes = Buffer.from(await file.arrayBuffer());
  const { bytes, ext, contentType } = await processImage(
    rawBytes,
    folder,
    rawExt,
    file.type || "application/octet-stream",
  );
  const key = `${R2_PREFIX}/${folder}/${randomUUID()}${ext}`;

  if (isR2Configured()) {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );
    return `/api/media/${key}`;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadsDir, { recursive: true });
  const localName = `${randomUUID()}${ext}`;
  await writeFile(path.join(uploadsDir, localName), bytes);
  return `/uploads/${folder}/${localName}`;
}

// "menu-docs" additionally allows .pdf — a photographed/scanned hardcopy
// menu (see src/app/dashboard/menu, "hardcopy menu upload"), not just images.
function safeExt(filename: string, folder: "logos" | "items" | "menu-docs" | "support" | "purchase-scans"): string {
  const ext = path.extname(filename).toLowerCase();
  const images = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  if (folder === "menu-docs" && ext === ".pdf") return ext;
  return images.includes(ext) ? ext : ".jpg";
}
