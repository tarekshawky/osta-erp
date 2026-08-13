import { randomInt, createHash, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { otpSender } from "@/lib/otpSender";

const OTP_TTL_MINUTES = 5;
const OTP_REQUEST_WINDOW_MINUTES = 15;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export type RequestOtpResult = { ok: true; devCode?: string } | { ok: false; error: string };

// Generates and "sends" a 6-digit code for the given customer, rate-limited per
// phone to prevent SMS-bombing. In non-production, the plaintext code is returned
// alongside the (always-fired) send, so the flow can be tested end-to-end without a
// real SMS/WhatsApp provider wired up yet (see src/lib/otpSender.ts).
export async function requestOtp(customerId: string, phone: string): Promise<RequestOtpResult> {
  const windowStart = new Date(Date.now() - OTP_REQUEST_WINDOW_MINUTES * 60 * 1000);
  const recentCount = await prisma.customerOtp.count({
    where: { customerId, createdAt: { gte: windowStart } },
  });
  if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, error: "Too many codes requested. Please try again later." };
  }

  const code = String(randomInt(100000, 1000000));
  await prisma.customerOtp.create({
    data: {
      customerId,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  await otpSender.send(phone, code);

  return { ok: true, devCode: process.env.NODE_ENV !== "production" ? code : undefined };
}

export type VerifyOtpResult = { ok: true } | { ok: false; error: string };

export async function verifyOtp(customerId: string, code: string): Promise<VerifyOtpResult> {
  const otp = await prisma.customerOtp.findFirst({
    where: { customerId, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, error: "No active code found. Request a new one." };
  if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, error: "Too many incorrect attempts. Request a new code." };
  }

  const candidate = Buffer.from(hashCode(code));
  const stored = Buffer.from(otp.codeHash);
  const matches = candidate.length === stored.length && timingSafeEqual(candidate, stored);

  if (!matches) {
    await prisma.customerOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Incorrect code." };
  }

  await prisma.customerOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
