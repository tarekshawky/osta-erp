import { describe, it, expect } from "vitest";
import { priceQuote } from "./priceQuote";
import { DEFAULT_RULES, rulesProblem, surchargeFor, uaeLocal, type PricingRules } from "./rules";

const base = { quantity: 1, tiers: [], bookingFeeFils: 0, vat: { ratePercent: 5, pricesIncludeVat: false } };
const rules: PricingRules = { ...DEFAULT_RULES, holidays: ["2026-12-02"] };

describe("minimum order", () => {
  it("tops a small job up to the minimum, once, before VAT", () => {
    const q = priceQuote({ ...base, unitPriceFils: 6000, minimumOrderFils: 10000 });
    expect(q.minimumTopUpFils).toBe(4000);
    expect(q.vatFils).toBe(500);
    expect(q.totalFils).toBe(10500);
  });
  it("does nothing when the job reaches the minimum", () => {
    expect(priceQuote({ ...base, unitPriceFils: 10000, minimumOrderFils: 10000 }).minimumTopUpFils).toBe(0);
  });
  it("counts the other services booked together toward the minimum", () => {
    expect(priceQuote({ ...base, unitPriceFils: 6000, minimumOrderFils: 10000, otherLinesFils: 5000 }).minimumTopUpFils).toBe(0);
    expect(priceQuote({ ...base, unitPriceFils: 6000, minimumOrderFils: 10000, otherLinesFils: 1000 }).minimumTopUpFils).toBe(3000);
  });
  it("never tops up a booking with no priced work (price after inspection)", () => {
    expect(priceQuote({ ...base, unitPriceFils: 0, minimumOrderFils: 10000, bookingFeeFils: 5000 }).minimumTopUpFils).toBe(0);
  });
});

describe("surcharge", () => {
  it("adds the percent on the work including the minimum top-up", () => {
    const q = priceQuote({ ...base, unitPriceFils: 6000, minimumOrderFils: 10000, surcharge: { percent: 50, kind: "OFF_HOURS" } });
    expect(q.surchargeFils).toBe(5000); // 50% of 100 AED, not of 60
    expect(q.totalFils).toBe(15750);
    expect(q.surchargeKind).toBe("OFF_HOURS");
  });
  it("leaves the booking fee out of the surcharge", () => {
    expect(priceQuote({ ...base, unitPriceFils: 20000, bookingFeeFils: 10000, surcharge: { percent: 25, kind: "HOLIDAY" } }).surchargeFils).toBe(5000);
  });
});

describe("which surcharge applies", () => {
  it("emergency outside normal hours", () => {
    expect(surchargeFor(rules, "EMERGENCY", "2026-11-03T22:30")).toEqual({ percent: 50, kind: "OFF_HOURS" });
    expect(surchargeFor(rules, "EMERGENCY", "2026-11-03T07:59")?.kind).toBe("OFF_HOURS");
    expect(surchargeFor(rules, "EMERGENCY", "2026-11-03T12:00")).toBeNull();
    expect(surchargeFor(rules, "EMERGENCY", "2026-11-03T18:00")?.kind).toBe("OFF_HOURS");
  });
  it("off-hours only for Emergency; a holiday for every type", () => {
    expect(surchargeFor(rules, "STANDARD", "2026-11-03T22:30")).toBeNull();
    expect(surchargeFor(rules, "STANDARD", "2026-12-02T11:00")).toEqual({ percent: 25, kind: "HOLIDAY" });
  });
  it("the larger one wins when both apply, never stacked", () => {
    expect(surchargeFor(rules, "EMERGENCY", "2026-12-02T23:00")).toEqual({ percent: 50, kind: "OFF_HOURS" });
  });
  it("no appointment, no surcharge", () => {
    expect(surchargeFor(rules, "EMERGENCY", null)).toBeNull();
  });
  it("converts to UAE time", () => {
    expect(uaeLocal(new Date("2026-11-03T18:30:00Z"))).toBe("2026-11-03T22:30");
  });
});

describe("rulesProblem", () => {
  it("accepts the defaults and rejects bad input", () => {
    expect(rulesProblem(DEFAULT_RULES)).toBeNull();
    expect(rulesProblem({ ...DEFAULT_RULES, offHoursPercent: -1 })).not.toBeNull();
    expect(rulesProblem({ ...DEFAULT_RULES, normalStart: "8am" })).not.toBeNull();
    expect(rulesProblem({ ...DEFAULT_RULES, holidays: ["02/12/2026"] })).not.toBeNull();
  });
});
