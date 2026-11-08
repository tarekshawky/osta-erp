import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, corsPreflight } from "@/lib/apiResponse";
import { splitPdfName, splitQuotePdf } from "@/lib/splitquote/service";
import { pdfResponse } from "@/lib/contracts/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS() {
  return corsPreflight();
}

// The quotation as a PDF in English, Arabic or both (?lang=en|ar|both). Only for whoever holds the private link.
export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return apiError("not_found", "This link is not valid.", 404);
  const q = await prisma.selfQuote.findUnique({ where: { accessToken: token } });
  if (!q || q.kind !== "split-ac") return apiError("not_found", "This link is not valid.", 404);
  const l = request.nextUrl.searchParams.get("lang");
  const lang = l === "ar" || l === "both" ? l : "en";
  try {
    return pdfResponse(await splitQuotePdf(q, lang), splitPdfName(q, lang), request.nextUrl.searchParams.get("inline") === "1");
  } catch {
    return apiError("server_error", "The PDF could not be prepared right now. Please try again.", 500);
  }
}
