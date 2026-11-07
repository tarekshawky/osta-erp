import { describe, it, expect } from "vitest";
import { bucketOf, computePerformance, type CostRow, type InvoiceRow, type OrderRow } from "./performanceData";
import { previousPeriod, resolvePeriod } from "./performancePeriod";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const teams = [{ id: "t-ajman", name: "Ajman" }, { id: "t-alain", name: "Al Ain" }, { id: "t-admin", name: "Admin" }];
const inv = (id: string, over: Partial<InvoiceRow>): InvoiceRow => ({ id, number: id, date: d("2026-11-02"), amount: 100, refundedAmount: 0, status: "Paid", paidAmount: 100, teamId: "t-ajman", emirate: "Ajman", employeeId: "e1", customerName: "C", payment: "Cash", ...over });
const ord = (id: string, over: Partial<OrderRow>): OrderRow => ({ id, number: id, date: d("2026-11-02"), status: "Done", teamId: "t-ajman", emirate: "Ajman", employeeId: "e1", customerName: "C", ...over });
const cost = (id: string, amount: number, teamId: string | null, over: Partial<CostRow> = {}): CostRow => ({ id, date: d("2026-11-03"), amount, teamId, employeeId: "e1", bucket: "Materials & spare parts", source: "Expense", category: "Materials", description: "x", vendor: null, attachmentUrl: null, ...over });
const base = { from: d("2026-11-01"), to: d("2026-11-30"), teams };

describe("expense buckets", () => {
  it("sorts costs into the report's groups", () => {
    expect(bucketOf("Expense", "Vehicle", "Petrol / Fuel")).toBe("Fuel");
    expect(bucketOf("Expense", "Vehicle", "Service")).toBe("Vehicle & maintenance");
    expect(bucketOf("Expense", "Materials", null)).toBe("Materials & spare parts");
    expect(bucketOf("Expense", "Rent / Accommodation", null)).toBe("Accommodation & rent");
    expect(bucketOf("Expense", "Telephone Expenses", null)).toBe("Other");
    expect(bucketOf("Payroll", null, null)).toBe("Employee-related");
  });
});

describe("revenue, collected and outstanding are kept apart", () => {
  const invoices = [
    inv("paid", { amount: 500, paidAmount: 500 }),
    inv("unpaid", { amount: 300, status: "Unpaid", paidAmount: 0 }),
    inv("partial", { amount: 200, status: "Unpaid", paidAmount: 50 }),
    inv("refunded", { amount: 100, status: "Partially Refunded", refundedAmount: 40, paidAmount: 100 }),
  ];
  const r = computePerformance({ ...base, orders: [], invoices, costs: [] });
  it("invoiced revenue is net of refunds; collected is only what was received", () => {
    expect(r.totals.revenue).toBe(500 + 300 + 200 + 60);
    expect(r.totals.collected).toBe(500 + 0 + 50 + 60);
    expect(r.totals.outstanding).toBe(300 + 150);
    expect(r.totals.revenue - r.totals.collected).toBe(r.totals.outstanding);
  });
  it("an unpaid invoice is never counted as collected cash", () => {
    const only = computePerformance({ ...base, orders: [], invoices: [inv("u", { amount: 900, status: "Unpaid", paidAmount: 0 })], costs: [] });
    expect(only.totals.collected).toBe(0);
    expect(only.totals.outstanding).toBe(900);
  });
});

describe("every cost is counted exactly once", () => {
  const invoices = [
    inv("a1", { amount: 600, teamId: "t-ajman", emirate: "Ajman" }),
    inv("a2", { amount: 400, teamId: "t-ajman", emirate: "Dubai" }),
    inv("l1", { amount: 200, teamId: "t-alain", emirate: "Al Ain" }),
  ];
  const costs = [cost("c1", 100, "t-ajman"), cost("c2", 50, "t-alain"), cost("c3", 1000, "t-admin"), cost("c4", 30, null), cost("c5", 20, "t-ajman", { source: "Payroll", bucket: "Employee-related" })];
  const r = computePerformance({ ...base, orders: [], invoices, costs });
  it("emirates + unallocated + shared = all costs", () => {
    const spread = r.emirates.reduce((s, e) => s + e.expenses, 0);
    expect(Math.round((spread + r.unallocatedExpenses + r.sharedExpenses) * 100) / 100).toBe(1200);
    expect(r.totals.expenses).toBe(1200);
  });
  it("an operational team's costs are spread by its revenue per emirate; head-office costs stay shared", () => {
    const get = (n: string) => r.emirates.find((e) => e.emirate === n)!;
    expect(get("Ajman").expenses).toBeCloseTo(120 * 0.6, 2);
    expect(get("Dubai").expenses).toBeCloseTo(120 * 0.4, 2);
    expect(get("Al Ain").expenses).toBeCloseTo(50, 2);
    expect(r.sharedExpenses).toBe(1030);
  });
  it("team rows carry only their own costs and sum to the total", () => {
    expect(r.teams.reduce((s, t) => s + t.expenses, 0)).toBeCloseTo(1200, 2);
    expect(r.teams.find((t) => t.name === "Admin")!.shared).toBe(true);
    expect(r.teams.find((t) => t.name === "Ajman")!.assignedEmirate).toBe("Ajman");
  });
  it("a cost of an operational team with no revenue is reported as unallocated, not lost", () => {
    const x = computePerformance({ ...base, orders: [], invoices: [], costs: [cost("z", 70, "t-ajman")] });
    expect(x.unallocatedExpenses).toBe(70);
    expect(x.totals.expenses).toBe(70);
  });
  it("net profit = revenue - expenses, and an emirate filter keeps the same arithmetic", () => {
    expect(r.totals.profit).toBe(1200 - 1200);
    const dubai = computePerformance({ ...base, orders: [], invoices, costs }, { emirate: "Dubai" });
    expect(dubai.totals.revenue).toBe(400);
    expect(dubai.totals.expenses).toBeCloseTo(48, 2);
    expect(dubai.totals.profit).toBeCloseTo(352, 2);
    expect(dubai.sharedExpenses).toBe(0);
  });
});

describe("orders and filters", () => {
  const orders = [ord("o1", {}), ord("o2", { status: "Cancelled" }), ord("o3", { status: "Assigned" }), ord("o4", { teamId: "t-alain", emirate: "Al Ain", employeeId: "e2" })];
  it("counts completed, pending and cancelled", () => {
    const r = computePerformance({ ...base, orders, invoices: [], costs: [] });
    expect(r.totals).toMatchObject({ orders: 4, completed: 2, cancelled: 1, pending: 1 });
    expect(r.emirates.find((e) => e.emirate === "Al Ain")!.orders).toBe(1);
  });
  it("team, employee and order-status filters narrow every figure", () => {
    expect(computePerformance({ ...base, orders, invoices: [], costs: [] }, { teamId: "t-alain" }).totals.orders).toBe(1);
    expect(computePerformance({ ...base, orders, invoices: [], costs: [] }, { employeeId: "e2" }).totals.orders).toBe(1);
    expect(computePerformance({ ...base, orders, invoices: [], costs: [] }, { orderStatus: "Cancelled" }).totals.orders).toBe(1);
  });
  it("the payment-status filter narrows invoices only", () => {
    const invoices = [inv("p", {}), inv("u", { status: "Unpaid", paidAmount: 0 })];
    expect(computePerformance({ ...base, orders: [], invoices, costs: [] }, { paymentStatus: "Unpaid" }).totals.invoices).toBe(1);
  });
  it("finds the best emirate and team by profit", () => {
    const invoices = [inv("a", { amount: 900, teamId: "t-ajman", emirate: "Ajman" }), inv("b", { amount: 300, teamId: "t-alain", emirate: "Al Ain" })];
    const r = computePerformance({ ...base, orders: [], invoices, costs: [cost("c", 100, "t-ajman")] });
    expect(r.best).toEqual({ emirate: "Ajman", team: "Ajman" });
  });
});

describe("report periods", () => {
  const now = new Date("2026-11-07T10:00:00Z"); // a Saturday
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  it("resolves the presets", () => {
    expect(iso(resolvePeriod({ preset: "today" }, now).from)).toBe("2026-11-07");
    expect(iso(resolvePeriod({ preset: "yesterday" }, now).from)).toBe("2026-11-06");
    expect(iso(resolvePeriod({ preset: "week" }, now).from)).toBe("2026-11-02"); // Monday
    expect([iso(resolvePeriod({ preset: "month" }, now).from), iso(resolvePeriod({ preset: "month" }, now).to)]).toEqual(["2026-11-01", "2026-11-30"]);
    expect([iso(resolvePeriod({ preset: "lastMonth" }, now).from), iso(resolvePeriod({ preset: "lastMonth" }, now).to)]).toEqual(["2026-10-01", "2026-10-31"]);
    expect([iso(resolvePeriod({ preset: "quarter" }, now).from), iso(resolvePeriod({ preset: "quarter" }, now).to)]).toEqual(["2026-10-01", "2026-12-31"]);
    expect([iso(resolvePeriod({ preset: "year" }, now).from), iso(resolvePeriod({ preset: "year" }, now).to)]).toEqual(["2026-01-01", "2026-12-31"]);
  });
  it("a custom range includes the whole last day, in either order, and falls back safely", () => {
    const p = resolvePeriod({ preset: "custom", from: "2026-10-05", to: "2026-10-01" }, now);
    expect([iso(p.from), p.to.toISOString()]).toEqual(["2026-10-01", "2026-10-05T23:59:59.999Z"]);
    expect(resolvePeriod({ preset: "custom", from: "bad", to: "x" }, now).preset).toBe("custom");
    expect(resolvePeriod({ preset: "nonsense" }, now).preset).toBe("month");
  });
  it("the previous period has the same length and ends right before", () => {
    const p = previousPeriod(resolvePeriod({ preset: "month" }, now));
    expect([iso(p.from), iso(p.to)]).toEqual(["2026-10-02", "2026-10-31"]);
  });
});
