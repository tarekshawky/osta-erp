import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { peekPermission } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// Work photos are private: only a signed-in admin with the Jobs permission can read them. ?size=thumb returns the small copy.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await peekPermission("jobs.manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === "unauthorized" ? 401 : 403 });
  const { id } = await context.params;
  const photo = await prisma.jobApplicationPhoto.findUnique({ where: { id }, select: { mimeType: true, data: { select: { data: true, thumb: true } } } });
  if (!photo?.data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const thumb = request.nextUrl.searchParams.get("size") === "thumb";
  const bytes = thumb ? photo.data.thumb : photo.data.data;
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(request.nextUrl.searchParams.get("download") ? { "Content-Disposition": `attachment; filename="work-photo-${id.slice(-6)}.webp"` } : {}),
    },
  });
}
