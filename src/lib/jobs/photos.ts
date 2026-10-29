import sharp from "sharp";
import { createHmac, timingSafeEqual } from "crypto";

// Work photos sent with a job application. Everything is decided from the file's real bytes, never from its name or the
// type the browser claims. The stored copy is re-encoded, which removes EXIF/GPS data.

export const MAX_DIMENSION = 2000;
export const THUMB_WIDTH = 320;
export const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export class PhotoError extends Error {
  code: "empty" | "too_large" | "bad_type" | "unreadable";
  constructor(code: PhotoError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

// The real type from the first bytes: JPEG, PNG or WebP. Anything else (an .exe renamed to .jpg, a GIF, an SVG…) is null.
export function sniffImageMime(b: Uint8Array): (typeof ALLOWED_MIMES)[number] | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export type ProcessedPhoto = { data: Buffer; thumb: Buffer; mimeType: "image/webp"; width: number; height: number; sizeBytes: number };

export async function processWorkPhoto(input: Buffer, maxBytes: number): Promise<ProcessedPhoto> {
  if (input.length === 0) throw new PhotoError("empty", "The file is empty.");
  if (input.length > maxBytes) throw new PhotoError("too_large", `Each photo can be up to ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  if (!sniffImageMime(input)) throw new PhotoError("bad_type", "Only JPG, PNG and WebP photos are allowed.");
  try {
    const base = sharp(input, { limitInputPixels: 60_000_000 }).rotate(); // applies EXIF orientation; metadata is dropped below
    const { data, info } = await base.clone().resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    const thumb = await base.clone().resize({ width: THUMB_WIDTH, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
    return { data, thumb, mimeType: "image/webp", width: info.width, height: info.height, sizeBytes: data.length };
  } catch {
    throw new PhotoError("unreadable", "This photo could not be read. Try another one.");
  }
}

// ---- upload tokens: a photo uploaded before the form is sent is tied to the job and expires ----

const secret = () => process.env.AUTH_SECRET ?? "insecure-dev-secret";
const sign = (id: string, jobId: string, exp: number) => createHmac("sha256", secret()).update(`jobphoto:${id}.${jobId}.${exp}`).digest("base64url");
export const UPLOAD_TTL_MS = 3 * 60 * 60 * 1000;

export function createUploadToken(id: string, jobId: string, now = Date.now()): string {
  const exp = now + UPLOAD_TTL_MS;
  return `${id}.${exp}.${sign(id, jobId, exp)}`;
}

// The upload id when the token is genuine, for this job, and not expired; otherwise null.
export function verifyUploadToken(token: string, jobId: string, now = Date.now()): string | null {
  const [id, expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!id || !sig || !Number.isFinite(exp) || exp < now) return null;
  const expected = Buffer.from(sign(id, jobId, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}
