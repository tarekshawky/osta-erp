import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickVariant } from "@/lib/media/process";

// Public, immutable image delivery. ?w=960 returns the smallest stored width that is at least 960.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const want = Number(request.nextUrl.searchParams.get("w")) || undefined;

  const list = await prisma.mediaVariant.findMany({ where: { assetId: id }, select: { id: true, width: true } });
  const chosen = pickVariant(list, want);
  if (!chosen) return new NextResponse("Not found", { status: 404 });

  const etag = `"${chosen.id}"`;
  const headers = {
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "Content-Type": "image/webp",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });

  const variant = await prisma.mediaVariant.findUnique({ where: { id: chosen.id }, select: { data: true } });
  if (!variant) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(variant.data), { status: 200, headers });
}
