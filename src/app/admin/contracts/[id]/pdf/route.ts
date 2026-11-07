import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { peekPermission } from "@/lib/adminGuard";
import { documentBytes, pdfName } from "@/lib/contracts/service";
import { pdfResponse } from "@/lib/contracts/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// An agreement's PDF for an authorized admin only: a stored file by id (?doc=), or the latest draft/final (?kind=). ?inline=1 opens it
// in the browser instead of downloading it.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await peekPermission("contracts.manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === "unauthorized" ? 401 : 403 });
  const { id } = await context.params;
  const c = await prisma.contract.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const q = request.nextUrl.searchParams;
  const inline = q.get("inline") === "1";
  const doc = q.get("doc");
  if (doc) {
    const row = await prisma.contractDocument.findFirst({ where: { id: doc, contractId: id } });
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const label = row.kind === "addendum" ? "addendum" : row.kind === "final" ? "final" : "draft";
    return pdfResponse(Buffer.from(row.bytes), pdfName(c, label as "final" | "draft" | "addendum", `-${row.createdAt.toISOString().slice(0, 10)}`), inline);
  }
  const kind = q.get("kind") === "final" ? "final" : "draft";
  const bytes = await documentBytes(c, kind, { type: "admin", id: auth.admin.id, name: auth.admin.name });
  if (!bytes) return NextResponse.json({ error: "pdf_failed" }, { status: 500 });
  return pdfResponse(bytes, pdfName(c, kind), inline);
}
