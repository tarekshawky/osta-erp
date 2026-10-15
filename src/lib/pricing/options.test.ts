import { describe, it, expect } from "vitest";
import { chooseUnitPrice } from "./options";
import { QuoteError } from "./priceQuote";

const opts = [{ id: "q", priceFils: 5000 }, { id: "h", priceFils: 9000 }, { id: "k", priceFils: null }];

describe("chooseUnitPrice", () => {
  it("a service without options uses its own price", () => {
    expect(chooseUnitPrice({ basePriceFils: 15000, options: [] })).toEqual({ unitPriceFils: 15000, optionId: null });
    expect(chooseUnitPrice({ basePriceFils: null, options: [] })).toEqual({ unitPriceFils: null, optionId: null });
  });
  it("a service with options uses the chosen option's price, not its own", () => {
    expect(chooseUnitPrice({ basePriceFils: 15000, options: opts, optionId: "h" })).toEqual({ unitPriceFils: 9000, optionId: "h" });
  });
  it("an option is required when the service has options", () => {
    expect(() => chooseUnitPrice({ basePriceFils: 15000, options: opts })).toThrow(/Choose an option/);
  });
  it("refuses an option that is unknown, unpriced in the emirate, or sent for a service without options", () => {
    expect(() => chooseUnitPrice({ basePriceFils: 1, options: opts, optionId: "zzz" })).toThrow(/not available for this service/);
    try { chooseUnitPrice({ basePriceFils: 1, options: opts, optionId: "k" }); expect.unreachable(); } catch (e) { expect((e as QuoteError).code).toBe("service_unavailable"); }
    expect(() => chooseUnitPrice({ basePriceFils: 1, options: [], optionId: "q" })).toThrow(/no options/);
  });
});
