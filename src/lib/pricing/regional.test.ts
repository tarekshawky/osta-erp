import { describe, expect, it } from "vitest";
import { DEFAULT_FACTORS, factorProblem, regionalPriceFils } from "./regional";

const aed = (n: number) => n * 100;

describe("emirate price levels", () => {
  it("applies the factor to the base price in whole dirhams", () => {
    expect(regionalPriceFils(aed(100), 1)).toBe(aed(100));
    expect(regionalPriceFils(aed(100), 1.1)).toBe(aed(110));
    expect(regionalPriceFils(aed(100), 1.2)).toBe(aed(120));
    expect(regionalPriceFils(aed(1000), 1.2)).toBe(aed(1200));
  });
  it("rounds halves up and never shows fils", () => {
    expect(regionalPriceFils(aed(25), 1.1)).toBe(aed(28)); // 27.5 -> 28
    expect(regionalPriceFils(aed(15), 1.1)).toBe(aed(17)); // 16.5 -> 17
    expect(regionalPriceFils(aed(35), 1.2)).toBe(aed(42));
    expect(regionalPriceFils(aed(12), 1.1)).toBe(aed(13)); // 13.2 -> 13
    expect(regionalPriceFils(aed(8), 1.1) % 100).toBe(0);
  });
  it("is not thrown off by float errors", () => {
    for (let base = 1; base <= 5000; base++) {
      for (const f of [1.1, 1.2, 1.15]) {
        const expected = Math.floor(base * Math.round(f * 100) + 50) / 100; // exact decimal arithmetic in cents of a dirham
        expect(regionalPriceFils(aed(base), f)).toBe(Math.floor(expected + 1e-9) * 100);
      }
    }
  });
  it("rejects bad input and bad factors", () => {
    expect(() => regionalPriceFils(-1, 1)).toThrow();
    expect(() => regionalPriceFils(100, 0)).toThrow();
    expect(factorProblem(0.2)).toMatch(/between/);
    expect(factorProblem(1.2)).toBeNull();
  });
  it("has the three default levels from the price list", () => {
    expect(DEFAULT_FACTORS.ajman).toBe(1);
    expect(DEFAULT_FACTORS.sharjah).toBe(1.1);
    expect(DEFAULT_FACTORS.dubai).toBe(1.2);
    expect(Object.keys(DEFAULT_FACTORS)).toHaveLength(8);
  });
});
