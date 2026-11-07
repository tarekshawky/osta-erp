import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { issueCustomerToken } from "@/lib/customerAuth";
import { classifyIdentifier, nationalNumber, phoneVariants } from "@/lib/authIdentity";
import { clientIp, isLimited, recordAttempt } from "@/lib/authLimits";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

// Sign in with an email or a mobile number (`identifier`) and a password. Older callers that send `email` keep working.
export async function POST(request: NextRequest) {
  const body = await parseJsonBody<{ identifier?: string; email?: string; phone?: string; password?: string }>(request);
  const password = body?.password;
  const id = classifyIdentifier(body?.identifier ?? body?.email ?? body?.phone);
  if (!id || typeof password !== "string" || !password || password.length > 200) return apiError("invalid_request", "A valid email or mobile number and a password are required.", 400);

  const ip = clientIp(request.headers);
  const accountId = id.kind === "email" ? id.email : nationalNumber(id.digits);
  if (await isLimited(prisma, "login", ip, accountId)) return apiError("rate_limited", "Too many sign-in attempts. Please wait a few minutes and try again.", 429);

  // A mobile number can match more than one saved format; the password decides which account it is.
  const candidates =
    id.kind === "email"
      ? await prisma.customer.findMany({ where: { email: id.email }, take: 1 })
      : await prisma.customer.findMany({ where: { phone: { in: phoneVariants(id.digits) } }, take: 3 });
  const customer = candidates.find((c) => c.passwordHash && verifyPassword(password, c.passwordHash));

  // Deliberately generic: don't reveal whether the account exists, has no password set yet, or the password just didn't match --
  // the same response for all of them so the endpoint can't be used to find out who is registered.
  if (!customer) {
    await recordAttempt(prisma, "login", ip, accountId);
    return apiError("invalid_credentials", "Incorrect email, mobile number or password.", 401);
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
