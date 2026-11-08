import { NextRequest } from "next/server";
import { apiError, apiSuccess, corsPreflight, parseJsonBody } from "@/lib/apiResponse";
import { clientIp, isLimited, recordAttempt } from "@/lib/authLimits";
import { prisma } from "@/lib/prisma";
import { editSplitByCustomer } from "@/lib/splitquote/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// "Edit Quotation": the customer changes their choices. The prices are worked out again and a NEW version is kept (the old one stays on record).
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const raw = await parseJsonBody<unknown>(request);
  const ip = clientIp(request.headers);
  if (await isLimited(prisma, "quote", ip, token)) return apiError("rate_limited", "Too many changes. Please try again later.", 429);
  const r = await editSplitByCustomer(token, raw, { ip });
  if (!r.ok) return apiError("invalid_request", r.error, 400);
  await recordAttempt(prisma, "quote", ip, token);
  return apiSuccess({ number: r.number, version: r.version });
}
