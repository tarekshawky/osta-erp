import { createHash, randomBytes } from "crypto";

// A one-time link an admin sends to a customer who forgot their password. Only a hash of the token is stored.
export const RESET_TTL_MS = 48 * 60 * 60 * 1000;

export const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function newResetToken(now = Date.now()): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashResetToken(token), expiresAt: new Date(now + RESET_TTL_MS) };
}

export const resetUrl = (siteBase: string, token: string) => `${siteBase.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

export function tokenUsable(row: { expiresAt: Date; usedAt: Date | null } | null, now = Date.now()): boolean {
  return !!row && !row.usedAt && row.expiresAt.getTime() > now;
}
