import { describe, expect, it } from "vitest";
import { keywordsProblem, normalizeKeywords, parseKeywords } from "./keywords";

describe("seo keywords", () => {
  it("splits on commas, Arabic commas, semicolons and new lines", () => {
    expect(parseKeywords("ac repair, ajman ، dubai;sharjah\nal ain")).toEqual(["ac repair", "ajman", "dubai", "sharjah", "al ain"]);
  });
  it("trims, collapses spaces and removes case-insensitive duplicates", () => {
    expect(parseKeywords("  AC   Repair , ac repair,, ")).toEqual(["AC Repair"]);
  });
  it("normalizes to a clean line or null", () => {
    expect(normalizeKeywords("a,b ,  ,a")).toBe("a, b");
    expect(normalizeKeywords("  , ")).toBeNull();
    expect(normalizeKeywords(undefined)).toBeNull();
  });
  it("limits count and length", () => {
    expect(keywordsProblem(Array.from({ length: 31 }, (_, i) => `k${i}`).join(","))).toMatch(/at most 30/);
    expect(keywordsProblem("x".repeat(81))).toMatch(/under 80/);
    expect(keywordsProblem("a, b")).toBeNull();
  });
});
