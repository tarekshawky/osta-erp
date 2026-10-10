import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, isValidPassword, PASSWORD_REQUIREMENTS } from "@/lib/password";
import { issueCustomerToken } from "@/lib/customerAuth";
import { generateCustomerCode } from "@/lib/customerData";
import { EMIRATES } from "@/lib/invoiceData";
import { notifyAdminOfSignup } from "@/lib/emailSender";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";

export function OPTIONS() {
  return corsPreflight();
}

type SignupBody = {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  emirate?: string;
};

export async function POST(request: NextRequest) {
  const body = await parseJsonBody<SignupBody>(request);
  const name = body?.name?.trim();
  // Same "not canonicalized" caveat as the rest of the app (see the old OTP route):
  // stored and looked up exactly as submitted, no country-code normalization.
  const phone = body?.phone?.trim();
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  const emirate = body?.emirate?.trim() || "Dubai";

  if (!name) return apiError("invalid_request", "name is required.", 400);
  if (!phone) return apiError("invalid_request", "phone is required.", 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return apiError("invalid_request", "A valid email is required.", 400);
  }
  if (!password || !isValidPassword(password)) {
    return apiError("invalid_request", PASSWORD_REQUIREMENTS, 400);
  }
  if (!EMIRATES.includes(emirate as (typeof EMIRATES)[number])) {
    return apiError("invalid_request", "Invalid emirate.", 400);
  }

  const [phoneClash, emailClash] = await Promise.all([
    prisma.customer.findUnique({ where: { phone } }),
    prisma.customer.findUnique({ where: { email } }),
  ]);
  if (phoneClash || emailClash) {
    return apiError("conflict", "An account with this phone number or email already exists.", 409);
  }

  const code = await generateCustomerCode();
  const customer = await prisma.customer.create({
    data: {
      code,
      type: "INDIVIDUAL",
      name,
      phone,
      email,
      passwordHash: hashPassword(password),
      language: "English",
      emirate,
      status: "Active",
      leadSource: "Organic",
    },
  });

  // Never let a flaky email provider fail the signup itself -- the customer is
  // already created at this point, so just log and move on. Awaited (not
  // fire-and-forget) so it actually completes before this serverless function
  // returns and gets frozen.
  try {
    await notifyAdminOfSignup({
      name: customer.name,
      phone: customer.phone,
      email: customer.email!,
      emirate: customer.emirate,
    });
  } catch (err) {
    console.error("[signup] admin notification failed:", err);
  }

  const accessToken = await issueCustomerToken(customer.id);
  return apiSuccess(
    {
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
    },
    { status: 201 }
  );
}
