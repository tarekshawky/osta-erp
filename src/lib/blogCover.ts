import { createHash } from "node:crypto";

const MIME = /^image\/(png|jpe?g|webp|gif|avif)$/;

// Older posts store the cover image inline as a data: URI. Public APIs hand out a plain image URL instead, so pages and
// API responses stay small and the browser can cache the picture.
export function parseImageDataUri(value: string | null | undefined): { mime: string; bytes: Buffer } | null {
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(value ?? "");
  if (!m || !MIME.test(m[1])) return null;
  const bytes = Buffer.from(m[2], "base64");
  return bytes.length ? { mime: m[1], bytes } : null;
}

export function publicCoverUrl(origin: string, slug: string, value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("data:")) return value;
  if (!parseImageDataUri(value)) return null;
  const v = createHash("sha1").update(value).digest("hex").slice(0, 10); // changes when the image changes, so caches refresh
  return `${origin}/api/blog-cover/${encodeURIComponent(slug)}?v=${v}`;
}
