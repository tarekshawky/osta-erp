import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, corsPreflight } from "@/lib/apiResponse";
import { documentBytes, pdfName } from "@/lib/contracts/service";
import { pdfResponse } from "@/lib/contracts/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS() {
  return corsPreflight();
}

// The agreement the customer is looking at, as a PDF. Only ever the draft for this link: the signed final agreement is for the
// customer's account (and the copy emailed to them), never for anyone who merely holds a link.
export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return apiError("not_found", "This link is not valid.", 404);
  const c = await prisma.contract.findUnique({ where: { accessToken: token } });
  if (!c) return apiError("not_found", "This link is not valid.", 404);
  const bytes = await documentBytes(c, "draft", { type: "customer", name: "Customer (link)" });
  if (!bytes) return apiError("server_error", "The PDF could not be prepared right now. Please try again.", 500);
  return pdfResponse(bytes, pdfName(c, "draft"));
}
