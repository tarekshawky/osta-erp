import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiResponse";
import type { Customer } from "@/generated/prisma";

const TOKEN_TTL = "30d";

// Deliberately stricter than AUTH_SECRET (session.ts), which silently falls back to
// a dev secret -- CUSTOMER_JWT_SECRET is a brand-new customer-facing secret with no
// legacy behavior to preserve, so a missing value in production fails loudly instead
// of quietly signing tokens with a guessable key.
function getSecretKey() {
  const secret = process.env.CUSTOMER_JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CUSTOMER_JWT_SECRET must be set in production.");
    }
    return new TextEncoder().encode("insecure-dev-customer-jwt-secret");
  }
  return new TextEncoder().encode(secret);
}

export async function issueCustomerToken(customerId: string): Promise<string> {
  return new SignJWT({ customerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecretKey());
}

function unauthorized(message: string) {
  return apiError("unauthorized", message, 401);
}

// Non-redirecting counterpart to requireEmployee (src/lib/auth.ts) for JSON API
// routes -- reads the bearer token, verifies it, and loads the live Customer row
// (so a token for a since-deleted customer is rejected, not just a valid signature).
export async function requireCustomer(request: NextRequest): Promise<{ customer: Customer } | { error: NextResponse }> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: unauthorized("Missing bearer token.") };

  let customerId: string;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.customerId !== "string") return { error: unauthorized("Invalid token.") };
    customerId = payload.customerId;
  } catch {
    return { error: unauthorized("Invalid or expired token.") };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: unauthorized("Customer not found.") };

  return { customer };
}
