import { describe, it, expect } from "vitest";
import { aedToFils, filsToAed } from "./money";

describe("money helpers", () => {
  it("parses AED to integer fils without float error", () => {
    expect(aedToFils("100")).toBe(10000);
    expect(aedToFils("0.1")).toBe(10);
    expect(aedToFils("19.99")).toBe(1999);
    expect(aedToFils(" 5.5 ")).toBe(550);
  });
  it("rejects bad input", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1,5", "1e3"]) expect(aedToFils(bad)).toBeNull();
  });
  it("round-trips for display", () => {
    expect(filsToAed(10000)).toBe("100");
    expect(filsToAed(1999)).toBe("19.99");
    expect(filsToAed(5)).toBe("0.05");
  });
});
