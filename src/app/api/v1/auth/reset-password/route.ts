import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, isValidPassword, PASSWORD_REQUIREMENTS } from "@/lib/password";
import { hashResetToken, tokenUsable } from "@/lib/passwordReset";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Sets a new password from the one-time link an admin sent. The link works once and expires.
export async function POST(request: NextRequest) {
  const body = await parseJsonBody<{ token?: string; password?: string }>(request);
  const token = body?.token?.trim();
  const password = body?.password;
  if (!token || !password) return apiError("invalid_request", "token and password are required.", 400);
  if (!isValidPassword(password)) return apiError("weak_password", PASSWORD_REQUIREMENTS, 400);

  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!row || !tokenUsable(row)) return apiError("invalid_token", "This reset link is invalid or has expired. Ask us for a new one.", 400);

  const now = new Date();
  await prisma.$transaction([
    prisma.customer.update({ where: { id: row.customerId }, data: { passwordHash: hashPassword(password) } }),
    // The link is used up, and so is any other link still open for this customer.
    prisma.passwordResetToken.updateMany({ where: { customerId: row.customerId, usedAt: null }, data: { usedAt: now } }),
  ]);
  return apiSuccess({ reset: true });
}
