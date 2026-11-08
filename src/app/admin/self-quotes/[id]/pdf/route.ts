import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { peekPermission } from "@/lib/adminGuard";
import { pdfName, quotePdf } from "@/lib/acquote/service";
import { pdfResponse } from "@/lib/contracts/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// A quotation's PDF for an authorized administrator, in English or Arabic (?lang=; a ductwork or split AC quotation can also be "both"). ?inline=1 opens it in the browser.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await peekPermission("quotes.manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === "unauthorized" ? 401 : 403 });
  const { id } = await context.params;
  const q = await prisma.selfQuote.findUnique({ where: { id } });
  if (!q) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const l = request.nextUrl.searchParams.get("lang");
  const lang = l === "ar" || l === "en" || (l === "both" && q.kind !== "ac-install") ? l : undefined;
  try {
    return pdfResponse(await quotePdf(q, lang), pdfName(q, lang), request.nextUrl.searchParams.get("inline") === "1");
  } catch {
    return NextResponse.json({ error: "pdf_failed" }, { status: 500 });
  }
}
