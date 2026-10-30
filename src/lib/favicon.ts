import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

// The dashboard's tab icon is the favicon chosen in Website → Site & Contact (the same one the website uses), resized here to a
// small square PNG that browsers and phones accept; the built-in icon is used until one is chosen.
async function sourceBytes(src: string, requestUrl: string): Promise<Buffer | null> {
  if (src.startsWith("data:")) {
    const comma = src.indexOf(",");
    return comma < 0 ? null : Buffer.from(src.slice(comma + 1), /;base64/.test(src.slice(0, comma)) ? "base64" : "utf8");
  }
  const res = await fetch(new URL(src, requestUrl));
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

export async function faviconResponse(size: number, requestUrl: string): Promise<Response> {
  const fallback = () => NextResponse.redirect(new URL("/favicon-default.ico", requestUrl), { status: 307, headers: { "Cache-Control": "public, max-age=300" } });
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" }, select: { faviconUrl: true } });
    if (!settings?.faviconUrl) return fallback();
    const bytes = await sourceBytes(settings.faviconUrl, requestUrl);
    if (!bytes) return fallback();
    const png = await sharp(bytes).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer();
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return fallback();
  }
}
