import { describe, it, expect } from "vitest";
import { AGREEMENT_CHECKS, COMPANY, DEFAULT_CLAUSES, PAYMENT_MESSAGE, RESPONSIBILITIES } from "./clauses";
import { parseClauses } from "./terms";

describe("the standard agreement text", () => {
  it("has the 18 clauses of the brief, in both languages, each with its own key", () => {
    expect(DEFAULT_CLAUSES).toHaveLength(18);
    expect(new Set(DEFAULT_CLAUSES.map((c) => c.key)).size).toBe(18);
    for (const c of DEFAULT_CLAUSES) { expect(c.titleEn && c.titleAr && c.bodyEn && c.bodyAr, c.key).toBeTruthy(); expect(/[؀-ۿ]/.test(c.bodyAr), c.key).toBe(true); expect(/[؀-ۿ]/.test(c.bodyEn), c.key).toBe(false); }
    expect(DEFAULT_CLAUSES.map((c) => c.titleEn).slice(0, 3)).toEqual(["Agreement Scope", "Registered Property Only", "Non-Refundable Policy"]);
  });
  it("the non-refundable clause keeps the legal caveat, and liability is never excluded beyond what the law allows", () => {
    const refund = DEFAULT_CLAUSES.find((c) => c.key === "non-refundable")!;
    expect(refund.bodyEn).toContain("mandatory rights"); expect(refund.bodyAr).toContain("الإلزامية المقررة بموجب القوانين");
    expect(DEFAULT_CLAUSES.find((c) => c.key === "liability")!.bodyEn).toContain("does not permit to be excluded or limited");
    expect(DEFAULT_CLAUSES.find((c) => c.key === "duration")!.bodyEn).toContain("12 months");
  });
  it("the customer must accept exactly five statements", () => {
    expect(AGREEMENT_CHECKS).toHaveLength(5);
    for (const c of AGREEMENT_CHECKS) expect(c.en && c.ar).toBeTruthy();
    expect(AGREEMENT_CHECKS[4].en).toContain("cannot be transferred");
  });
  it("company details and the payment message are as written in the brief", () => {
    expect(COMPANY).toMatchObject({ name: "Ostaa Technical Services Co. L.L.C S.O.C.", website: "www.ostaservices.com", phone: "0568676036", durationMonths: 12 });
    expect(PAYMENT_MESSAGE.en).toContain("secure payment link"); expect(PAYMENT_MESSAGE.ar).toContain("رابط الدفع");
    expect(RESPONSIBILITIES.some((r) => r.party === "customer") && RESPONSIBILITIES.some((r) => r.party === "company")).toBe(true);
  });
  it("a terms set the admin edits is checked: every clause needs both languages and its own key", () => {
    expect(parseClauses(DEFAULT_CLAUSES)).toHaveLength(18);
    expect(parseClauses([{ ...DEFAULT_CLAUSES[0], titleAr: "" }])).toEqual([]);
    expect(parseClauses([DEFAULT_CLAUSES[0], DEFAULT_CLAUSES[0]])).toEqual([]); // duplicate key
    expect(parseClauses([])).toEqual([]); expect(parseClauses("x")).toEqual([]);
  });
});
