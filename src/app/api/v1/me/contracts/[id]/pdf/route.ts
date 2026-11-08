import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customerAuth";
import { apiError, corsPreflight } from "@/lib/apiResponse";
import { documentBytes, pdfName } from "@/lib/contracts/service";
import { pdfResponse } from "@/lib/contracts/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS() {
  return corsPreflight();
}

// A customer's own agreement as a PDF. The FINAL file exists only once the payment is confirmed; until then it is the draft.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const { id } = await context.params;
  const c = await prisma.contract.findFirst({ where: { id, customerId: auth.customer.id } });
  if (!c) return apiError("not_found", "Agreement not found.", 404);
  const kind = (c.status === "ACTIVE" || c.status === "SUSPENDED") && (c.paymentStatus === "paid" || c.paymentStatus === "arrangement") ? "final" : "draft";
  const bytes = await documentBytes(c, kind, { type: "customer", id: auth.customer.id, name: auth.customer.name });
  if (!bytes) return apiError("server_error", "The PDF could not be prepared right now. Please try again.", 500);
  return pdfResponse(bytes, pdfName(c, kind));
}
