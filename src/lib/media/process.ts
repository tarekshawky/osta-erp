import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
// Decided by sharp from the file's real bytes, never from the filename or the browser's claimed type.
// SVG is deliberately excluded (it can carry script).
export const ALLOWED_FORMATS = ["jpeg", "png", "webp", "gif", "avif"];
export const VARIANT_WIDTHS = [480, 960, 1600, 2400];

export type Variant = { width: number; height: number; format: "webp"; bytes: number; data: Buffer };
export type ProcessedImage = { width: number; height: number; originalFormat: string; variants: Variant[] };

export class MediaError extends Error {}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new MediaError("The file is empty.");
  if (input.length > MAX_UPLOAD_BYTES) throw new MediaError("The file is larger than 10 MB.");

  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new MediaError("This is not a supported image.");
  }
  if (!meta.format || !ALLOWED_FORMATS.includes(meta.format) || !meta.width || !meta.height) {
    throw new MediaError("Only JPG, PNG, WebP, GIF and AVIF images are allowed.");
  }

  // EXIF orientation 5-8 means the stored pixels are rotated 90 degrees.
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;

  const widths = [...new Set([...VARIANT_WIDTHS.filter((w) => w < width), width].map((w) => Math.min(w, width)))].sort((a, b) => a - b);
  const variants: Variant[] = [];
  for (const w of widths) {
    // .rotate() applies EXIF orientation; metadata (EXIF/GPS) is dropped by default.
    const { data, info } = await sharp(input, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    variants.push({ width: info.width, height: info.height, format: "webp", bytes: data.length, data });
  }
  return { width, height, originalFormat: meta.format, variants };
}

// Smallest variant that is at least `want` wide; otherwise the largest. With no width asked: up to 1600.
export function pickVariant<T extends { width: number }>(variants: T[], want?: number): T | null {
  if (variants.length === 0) return null;
  const sorted = [...variants].sort((a, b) => a.width - b.width);
  if (want && want > 0) return sorted.find((v) => v.width >= want) ?? sorted[sorted.length - 1];
  return [...sorted].reverse().find((v) => v.width <= 1600) ?? sorted[0];
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, "").trim().slice(0, 120);
  return cleaned || "image";
}

export const mediaUrlPattern = (id: string) => `/api/media/${id}`;
// True when `text` references this asset (any size query string included).
export const textUsesAsset = (text: string, id: string) => text.includes(mediaUrlPattern(id));
