import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { issueCustomerToken } from "@/lib/customerAuth";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  const body = await parseJsonBody<{ email?: string; password?: string }>(request);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  if (!email || !password) return apiError("invalid_request", "email and password are required.", 400);

  const customer = await prisma.customer.findUnique({ where: { email } });

  // Deliberately generic: don't reveal whether the email exists, has no password
  // set yet, or the password just didn't match -- same response for all three so
  // the endpoint can't be used to enumerate registered customer emails.
  if (!customer || !customer.passwordHash || !verifyPassword(password, customer.passwordHash)) {
    return apiError("invalid_credentials", "Incorrect email or password.", 401);
  }

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
