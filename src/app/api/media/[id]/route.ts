import { NextRequest, NextResponse } from "next/server";
import { pickVariant } from "@/lib/media/process";
import { contentDb } from "@/lib/prismaContent";

// Public, immutable image delivery. ?w=960 returns the smallest stored width that is at least 960.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const want = Number(request.nextUrl.searchParams.get("w")) || undefined;

  const list = await contentDb.mediaVariant.findMany({ where: { assetId: id }, select: { id: true, width: true } });
  const chosen = pickVariant(list, want);
  if (!chosen) return new NextResponse("Not found", { status: 404 });

  const etag = `"${chosen.id}"`;
  const headers = {
    // s-maxage lets Vercel's CDN keep the image too (max-age alone only lets the visitor's browser keep it), so the image bytes leave the database
    // about once per image instead of once per visitor. Database network transfer is metered.
    "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    ETag: etag,
    "Content-Type": "image/webp",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });

  const variant = await contentDb.mediaVariant.findUnique({ where: { id: chosen.id }, select: { data: true } });
  if (!variant) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(variant.data), { status: 200, headers });
}
