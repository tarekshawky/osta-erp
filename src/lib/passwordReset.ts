import { createHash, randomBytes } from "crypto";

// A one-time link an admin sends to a customer who forgot their password. Only a hash of the token is stored.
export const RESET_TTL_MS = 48 * 60 * 60 * 1000;

export const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

// A link the customer asks for themselves ("Forgot password") is valid for one hour; one an admin makes keeps the 48 hours.
export const SELF_SERVICE_TTL_MS = 60 * 60 * 1000;

export function newResetToken(now = Date.now(), ttlMs = RESET_TTL_MS): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashResetToken(token), expiresAt: new Date(now + ttlMs) };
}

export const resetUrl = (siteBase: string, token: string) => `${siteBase.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

export function tokenUsable(row: { expiresAt: Date; usedAt: Date | null } | null, now = Date.now()): boolean {
  return !!row && !row.usedAt && row.expiresAt.getTime() > now;
}
