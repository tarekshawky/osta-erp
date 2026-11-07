import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifyIdentifier, nationalNumber, phoneVariants } from "@/lib/authIdentity";
import { clientIp, isLimited, recordAttempt } from "@/lib/authLimits";
import { newResetToken, resetUrl, SELF_SERVICE_TTL_MS } from "@/lib/passwordReset";
import { sendCustomerResetLink } from "@/lib/customerResetMail";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// "Forgot password": the customer gives the email or mobile number of their account and, if there is one with an email on file,
// a one-hour link to /reset-password is e-mailed to it. The answer is always the same ("if an account exists, we sent it") so this
// cannot be used to find out who is registered. A mobile number is looked up and the link still goes to the e-mail on the account.
export async function POST(request: NextRequest) {
  const body = await parseJsonBody<{ identifier?: string }>(request);
  const id = classifyIdentifier(body?.identifier);
  if (!id) return apiError("invalid_request", "Enter the email or mobile number of your account.", 400);

  const ip = clientIp(request.headers);
  const accountId = id.kind === "email" ? id.email : nationalNumber(id.digits);
  if (await isLimited(prisma, "forgot", ip, accountId)) return apiError("rate_limited", "Too many requests. Please wait a while and try again.", 429);
  // Every request counts, found or not, so the limit does not depend on whether the account exists.
  await recordAttempt(prisma, "forgot", ip, accountId);

  const generic = apiSuccess({ requested: true });
  try {
    const customer = await prisma.customer.findFirst({
      where: id.kind === "email" ? { email: id.email } : { phone: { in: phoneVariants(id.digits) } },
      select: { id: true, name: true, email: true, language: true },
    });
    if (!customer?.email) return generic;
    const base = process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
    if (!base) {
      console.error("[forgot-password] SITE_URL is not set; cannot build the reset link.");
      return generic;
    }
    const { token, hash, expiresAt } = newResetToken(Date.now(), SELF_SERVICE_TTL_MS);
    // Older open links stop working as soon as a new one is made.
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({ where: { customerId: customer.id, usedAt: null }, data: { usedAt: new Date() } }),
      prisma.passwordResetToken.create({ data: { customerId: customer.id, tokenHash: hash, expiresAt } }),
    ]);
    await sendCustomerResetLink({ name: customer.name, email: customer.email, language: customer.language }, resetUrl(base, token), SELF_SERVICE_TTL_MS / 60_000);
  } catch (err) {
    // Whatever went wrong (mail provider, database), the visitor sees the same answer.
    console.error("[forgot-password]", err instanceof Error ? err.message : "unknown");
  }
  return generic;
}
