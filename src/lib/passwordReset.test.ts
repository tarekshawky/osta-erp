import { describe, expect, it } from "vitest";
import { hashResetToken, newResetToken, resetUrl, tokenUsable } from "./passwordReset";

describe("password reset tokens", () => {
  it("creates a long random token and stores only its hash", () => {
    const a = newResetToken(0);
    const b = newResetToken(0);
    expect(a.token.length).toBeGreaterThanOrEqual(40);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashResetToken(a.token));
    expect(a.hash).not.toContain(a.token);
    expect(a.expiresAt.getTime()).toBe(48 * 3600 * 1000);
  });
  it("builds the link on the customer site", () => {
    expect(resetUrl("https://site.example/", "a b")).toBe("https://site.example/reset-password?token=a%20b");
  });
  it("is usable once and only before it expires", () => {
    const row = { expiresAt: new Date(1000), usedAt: null };
    expect(tokenUsable(row, 500)).toBe(true);
    expect(tokenUsable(row, 1500)).toBe(false);
    expect(tokenUsable({ ...row, usedAt: new Date(100) }, 500)).toBe(false);
    expect(tokenUsable(null)).toBe(false);
  });
});
