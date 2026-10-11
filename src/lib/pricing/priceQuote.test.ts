import { describe, it, expect } from "vitest";
import { priceQuote, validateTiers, QuoteError, type DiscountTier } from "./priceQuote";

const AC_TIERS: DiscountTier[] = [
  { minQty: 1, maxQty: 1, percent: 0 },
  { minQty: 2, maxQty: 2, percent: 10 },
  { minQty: 3, maxQty: 3, percent: 13 },
  { minQty: 4, maxQty: 4, percent: 17 },
  { minQty: 5, maxQty: 5, percent: 20 },
  { minQty: 6, maxQty: 6, percent: 22 },
  { minQty: 7, maxQty: 7, percent: 24 },
  { minQty: 8, maxQty: 8, percent: 26 },
  { minQty: 9, maxQty: 9, percent: 28 },
  { minQty: 10, maxQty: 10, percent: 33 },
];

const base = {
  unitPriceFils: 10000,
  tiers: AC_TIERS,
  bookingFeeFils: 0,
  vat: { ratePercent: 5, pricesIncludeVat: true },
};

describe("AC cleaning reference table (unit 100 AED)", () => {
  const expected = [100, 180, 261, 332, 400, 468, 532, 592, 648, 670];
  expected.forEach((aed, i) => {
    it(`quantity ${i + 1} -> ${aed} AED`, () => {
      const q = priceQuote({ ...base, quantity: i + 1 });
      expect(q.serviceNetFils).toBe(aed * 100);
      expect(q.totalFils).toBe(aed * 100); // VAT-inclusive: total never grows
    });
  });
});

describe("fees, add-ons and VAT", () => {
  it("never discounts booking fee or add-ons", () => {
    const q = priceQuote({
      ...base,
      quantity: 10,
      bookingFeeFils: 5000,
      addOns: [{ priceFils: 2000, qty: 2 }],
    });
    expect(q.discountFils).toBe(33000);
    expect(q.bookingFeeFils).toBe(5000);
    expect(q.addOnsFils).toBe(4000);
    expect(q.totalFils).toBe(67000 + 5000 + 4000);
  });

  it("VAT exclusive adds tax on top, rounded half-up", () => {
    const q = priceQuote({ ...base, quantity: 1, vat: { ratePercent: 5, pricesIncludeVat: false } });
    expect(q.vatFils).toBe(500);
    expect(q.totalFils).toBe(10500);
  });

  it("VAT inclusive extracts without double counting", () => {
    const q = priceQuote({ ...base, quantity: 1 });
    expect(q.vatFils).toBe(476); // 10000 * 5/105 = 476.19
    expect(q.totalFils).toBe(10000);
  });

  it("uses integer fils only", () => {
    const q = priceQuote({ ...base, unitPriceFils: 3333, quantity: 3 });
    for (const v of [q.subtotalFils, q.discountFils, q.serviceNetFils, q.vatFils, q.totalFils]) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe("tiers", () => {
  it("quantity above the highest tier gets no discount", () => {
    const q = priceQuote({ ...base, quantity: 11 });
    expect(q.discountPercent).toBe(0);
    expect(q.serviceNetFils).toBe(110000);
  });

  it("open-ended tier applies above the range", () => {
    const tiers = [...AC_TIERS.slice(0, 9), { minQty: 10, maxQty: null, percent: 33 }];
    expect(priceQuote({ ...base, tiers, quantity: 15 }).discountPercent).toBe(33);
  });

  it("date-bounded promo tiers only apply inside the window", () => {
    const promo: DiscountTier[] = [
      { minQty: 1, maxQty: null, percent: 50, startsAt: new Date("2026-12-01"), endsAt: new Date("2026-12-31") },
    ];
    expect(priceQuote({ ...base, tiers: promo, quantity: 2, at: new Date("2026-12-10") }).discountPercent).toBe(50);
    expect(priceQuote({ ...base, tiers: promo, quantity: 2, at: new Date("2027-01-10") }).discountPercent).toBe(0);
  });

  it("no tiers means no discount", () => {
    expect(priceQuote({ ...base, tiers: [], quantity: 5 }).discountFils).toBe(0);
  });
});

describe("rejections", () => {
  it("rejects unavailable service", () => {
    expect(() => priceQuote({ ...base, unitPriceFils: null, quantity: 1 })).toThrow(QuoteError);
  });
  it("rejects invalid or below-minimum quantity", () => {
    expect(() => priceQuote({ ...base, quantity: 0 })).toThrow(QuoteError);
    expect(() => priceQuote({ ...base, quantity: 1.5 })).toThrow(QuoteError);
    expect(() => priceQuote({ ...base, quantity: 1, minQuantity: 2 })).toThrow(QuoteError);
  });
  it("rejects non-integer money", () => {
    expect(() => priceQuote({ ...base, unitPriceFils: 100.5, quantity: 1 })).toThrow(QuoteError);
  });
});

describe("validateTiers", () => {
  it("accepts the seeded AC set", () => {
    expect(validateTiers(AC_TIERS)).toEqual([]);
  });
  it("rejects overlaps", () => {
    expect(validateTiers([{ minQty: 1, maxQty: 3, percent: 0 }, { minQty: 3, maxQty: 5, percent: 10 }]).length).toBeGreaterThan(0);
  });
  it("rejects gaps", () => {
    expect(validateTiers([{ minQty: 1, maxQty: 2, percent: 0 }, { minQty: 5, maxQty: 6, percent: 10 }]).length).toBeGreaterThan(0);
  });
});
