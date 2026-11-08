import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { peekPermission } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// A drawing, BOQ or site photo a customer attached. Only for an authorized administrator; it is served as a download (never run in
// the page) with a fixed safe type, and never indexed.
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string; fileId: string }> }) {
  const auth = await peekPermission("quotes.manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === "unauthorized" ? 401 : 403 });
  const { id, fileId } = await context.params;
  const f = await prisma.selfQuoteFile.findFirst({ where: { id: fileId, quoteId: id } });
  if (!f) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(new Uint8Array(f.bytes), {
    headers: {
      "Content-Type": ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.mime) ? f.mime : "application/octet-stream",
      "Content-Disposition": `attachment; filename="${f.name.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
      "Content-Length": String(f.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
