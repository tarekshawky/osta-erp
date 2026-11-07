import { describe, it, expect } from "vitest";
import { dailyWorkerTotal, inclusiveDays, itemTotal, purchaseMargin, purchaseNumber, purchaseTotal, supplierInvoiceKey, validatePurchaseItems, EMPLOYEE_KINDS } from "./expenseClasses";

describe("daily worker", () => {
  it("days x daily rate", () => {
    expect(dailyWorkerTotal(3, 120)).toBe(360);
    expect(dailyWorkerTotal(2.5, 90)).toBe(225);
    expect(dailyWorkerTotal(1, 33.333)).toBe(33.33);
  });
});

describe("rental days", () => {
  it("counts both the first and the last day", () => {
    expect(inclusiveDays("2026-11-01", "2026-11-01")).toBe(1);
    expect(inclusiveDays("2026-11-01", "2026-11-07")).toBe(7);
    expect(inclusiveDays("2026-11-07", "2026-11-01")).toBe(0);
    expect(inclusiveDays("x", "2026-11-01")).toBe(0);
  });
});

describe("customer purchase totals (the example from the spec)", () => {
  const items = [
    { name: "AC Capacitor", qty: 2, unitPrice: 35 },
    { name: "Copper Pipe", qty: 3, unitPrice: 45 },
    { name: "Insulation", qty: 2, unitPrice: 15 },
    { name: "Drainage Pipe", qty: 1, unitPrice: 25 },
  ];
  it("adds up to 260", () => {
    expect(items.map((i) => itemTotal(i.qty, i.unitPrice))).toEqual([70, 135, 30, 25]);
    expect(purchaseTotal(items)).toBe(260);
  });
  it("accepts any number of products and rejects bad lines", () => {
    expect(validatePurchaseItems(items)).toBeNull();
    expect(validatePurchaseItems(Array.from({ length: 60 }, (_, i) => ({ name: `Item ${i}`, qty: 1, unitPrice: 1 })))).toBeNull();
    expect(validatePurchaseItems([])).toMatch(/at least one/);
    expect(validatePurchaseItems([{ name: " ", qty: 1, unitPrice: 5 }])).toMatch(/item name/);
    expect(validatePurchaseItems([{ name: "x", qty: 0, unitPrice: 5 }])).toMatch(/quantity/);
    expect(validatePurchaseItems([{ name: "x", qty: 1, unitPrice: -1 }])).toMatch(/unit price/);
    expect(validatePurchaseItems([{ name: "x", qty: 1, unitPrice: 0 }])).toMatch(/total/);
  });
});

describe("numbers and duplicates", () => {
  it("formats the purchase number", () => expect(purchaseNumber(2026, 7)).toBe("CMP-2026-000007"));
  it("the same supplier invoice is the same purchase, whatever the case or spacing", () => {
    expect(supplierInvoiceKey(" ACME ", " INV-9 ")).toBe(supplierInvoiceKey("acme", "inv-9"));
    expect(supplierInvoiceKey("acme", "")).toBeNull();
    expect(supplierInvoiceKey("a", "1")).not.toBe(supplierInvoiceKey("b", "1"));
  });
});

describe("cost against what the customer pays", () => {
  it("compares cost, billed and collected", () => {
    expect(purchaseMargin(260, 400, 1000, 1000)).toEqual({ cost: 260, billed: 400, collected: 400, marginBilled: 140, marginCollected: 140, marginPct: 35 });
  });
  it("a half-paid invoice has collected half of the parts", () => {
    const m = purchaseMargin(260, 400, 1000, 500);
    expect(m.collected).toBe(200);
    expect(m.marginCollected).toBe(-60);
  });
  it("no parts billed means no margin percentage", () => expect(purchaseMargin(100, 0, 500, 500).marginPct).toBeNull());
});

describe("employee kinds", () => {
  it("salaries and advances go to Payroll so they are never entered twice", () => {
    expect(EMPLOYEE_KINDS.filter((k) => k.viaPayroll).map((k) => k.kind)).toEqual(["Monthly Salary", "Advance"]);
  });
});
