import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestOtp } from "@/lib/otp";
import { apiSuccess, apiError, parseJsonBody } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
  const body = await parseJsonBody<{ phone?: string }>(request);
  const phone = body?.phone?.trim();
  if (!phone) return apiError("invalid_request", "phone is required.", 400);

  // Exact-match lookup only -- phone numbers aren't canonicalized anywhere in this
  // codebase yet (same pre-existing limitation as the rest of the app), so the
  // customer must submit their phone in the same format it was stored in.
  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer) return apiError("not_found", "No account found for this phone number.", 404);

  const result = await requestOtp(customer.id, phone);
  if (!result.ok) return apiError("rate_limited", result.error, 429);

  return apiSuccess({ sent: true, ...(result.devCode ? { devCode: result.devCode } : {}) });
}
