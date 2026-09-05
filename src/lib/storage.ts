import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Real image uploads for logos and menu photos (plan §3: "Vercel Blob or
 * Supabase Storage"). If BLOB_READ_WRITE_TOKEN is set (create a Blob store
 * in the Vercel dashboard), uploads go to Vercel Blob and are durable in
 * production. Without it, this falls back to writing into /public/uploads —
 * fine for local dev, but NOT durable on Vercel (its filesystem is
 * read-only/ephemeral at runtime), so set the token before going live.
 */
export async function saveUpload(file: File, folder: "logos" | "items"): Promise<string> {
  const ext = safeExt(file.name);
  const filename = `${folder}/${randomUUID()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(filename, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadsDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  const localName = `${randomUUID()}${ext}`;
  await writeFile(path.join(uploadsDir, localName), bytes);
  return `/uploads/${folder}/${localName}`;
}

function safeExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const allowed = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  return allowed.includes(ext) ? ext : ".jpg";
}
