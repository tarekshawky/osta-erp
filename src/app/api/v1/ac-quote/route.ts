import { NextRequest, after } from "next/server";
import { apiError, apiSuccess, corsPreflight, parseJsonBody } from "@/lib/apiResponse";
import { clientIp, isLimited, recordAttempt } from "@/lib/authLimits";
import { prisma } from "@/lib/prisma";
import { afterCreate, createQuote } from "@/lib/acquote/service";
import { quoteUrl } from "@/lib/acquote/notify";

export const dynamic = "force-dynamic";
// The PDF is built (and emailed) after the answer, which can take a few seconds on a cold start.
export const maxDuration = 60;

export function OPTIONS() {
  return corsPreflight();
}

// "Generate Quotation": the server works the prices out again from the administrator's price list, saves the quotation and answers
// with its number and the customer's private link. The PDF is downloaded from that link.
export async function POST(request: NextRequest) {
  const raw = await parseJsonBody<{ customer?: { phone?: string } }>(request);
  const ip = clientIp(request.headers);
  const who = String(raw?.customer?.phone ?? "");
  if (await isLimited(prisma, "quote", ip, who)) return apiError("rate_limited", "Too many quotations. Please try again later or contact us on WhatsApp.", 429);
  const r = await createQuote(raw, { ip });
  if (!r.ok) return apiError("invalid_request", r.error, 400);
  await recordAttempt(prisma, "quote", ip, who);
  after(() => afterCreate(r.quote.id));
  return apiSuccess({ number: r.quote.number, token: r.quote.accessToken, url: quoteUrl(r.quote.accessToken), total: r.quote.total, expiresAt: r.quote.expiresAt }, { status: 201 });
}
