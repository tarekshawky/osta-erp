import { describe, it, expect } from "vitest";
import { classifyIdentifier, nationalNumber, phoneVariants } from "./authIdentity";
import { LIMITS, exceeded, isLimited, recordAttempt } from "./authLimits";

describe("sign-in identifier", () => {
  it("tells an email from a mobile number, and refuses the rest", () => {
    expect(classifyIdentifier("  Sara@Example.COM ")).toEqual({ kind: "email", email: "sara@example.com" });
    expect(classifyIdentifier("+971 56 867 6036")).toEqual({ kind: "phone", digits: "971568676036" });
    expect(classifyIdentifier("0568676036")).toEqual({ kind: "phone", digits: "0568676036" });
    for (const bad of ["", "   ", "not-an-email@", "a@b", "123", "abc", "1".repeat(16), null, undefined, 42, "x".repeat(200)]) expect(classifyIdentifier(bad), String(bad)).toBeNull();
  });
  it("reduces a UAE number to its national form", () => {
    for (const v of ["0568676036", "568676036", "971568676036", "00971568676036", "+971 56 867 6036"]) expect(nationalNumber(v.replace(/\D/g, "")), v).toBe("568676036");
  });
  it("matches every way the same number may have been saved", () => {
    const variants = phoneVariants("0568676036");
    for (const saved of ["568676036", "0568676036", "971568676036", "+971568676036", "00971568676036"]) expect(variants, saved).toContain(saved);
    expect(variants).not.toContain("568676037");
  });
});

describe("attempt limits", () => {
  const counts = (ip: number, account: number) => ({ ip, account });
  it("blocks when either the visitor or the account has used its attempts", () => {
    expect(exceeded("login", counts(0, 0))).toBe(false);
    expect(exceeded("login", counts(LIMITS.login.perIp - 1, LIMITS.login.perAccount - 1))).toBe(false);
    expect(exceeded("login", counts(LIMITS.login.perIp, 0))).toBe(true);
    expect(exceeded("login", counts(0, LIMITS.login.perAccount))).toBe(true);
    expect(exceeded("forgot", counts(0, LIMITS.forgot.perAccount))).toBe(true);
  });
  it("counts only the window, and never stores the plain IP or account", async () => {
    const rows: { kind: string; ipHash: string }[] = [];
    const db = {
      aiFinderLog: {
        count: async ({ where }: { where: { kind: string; ipHash: string; createdAt: { gte: Date } } }) => rows.filter((r) => r.kind === where.kind && r.ipHash === where.ipHash).length,
        create: async ({ data }: { data: { kind: string; ipHash: string } }) => { rows.push(data); },
      },
    };
    expect(await isLimited(db, "login", "1.2.3.4", "sara@example.com")).toBe(false);
    for (let i = 0; i < LIMITS.login.perAccount; i++) await recordAttempt(db, "login", `9.9.9.${i}`, "Sara@Example.com");
    expect(await isLimited(db, "login", "5.5.5.5", "sara@example.com")).toBe(true); // the account is locked whichever IP is used
    expect(await isLimited(db, "login", "5.5.5.5", "someone-else@example.com")).toBe(false);
    expect(rows.every((r) => !r.ipHash.includes("sara") && !r.ipHash.includes("9.9.9"))).toBe(true);
  });
  it("fails open when the log cannot be read", async () => {
    const broken = { aiFinderLog: { count: async () => { throw new Error("db down"); }, create: async () => { throw new Error("db down"); } } };
    expect(await isLimited(broken, "login", "1.1.1.1", "a@b.co")).toBe(false);
    await expect(recordAttempt(broken, "login", "1.1.1.1", "a@b.co")).resolves.toBeUndefined();
  });
});
