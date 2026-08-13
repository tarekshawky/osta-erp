import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { issueCustomerToken } from "@/lib/customerAuth";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  const body = await parseJsonBody<{ phone?: string; code?: string }>(request);
  const phone = body?.phone?.trim();
  const code = body?.code?.trim();
  if (!phone || !code) return apiError("invalid_request", "phone and code are required.", 400);

  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer) return apiError("not_found", "No account found for this phone number.", 404);

  const result = await verifyOtp(customer.id, code);
  if (!result.ok) return apiError("invalid_code", result.error, 401);

  const accessToken = await issueCustomerToken(customer.id);
  return apiSuccess({
    accessToken,
    customer: {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      companyName: customer.companyName,
      phone: customer.phone,
      email: customer.email,
      language: customer.language,
    },
  });
}
