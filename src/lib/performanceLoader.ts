import { prisma } from "./prisma";
import { bucketOf, computePerformance, type CostRow, type InvoiceRow, type OrderRow, type PaymentStatusFilter, type PerfFilters, type TeamInfo } from "./performanceData";
import { resolvePeriod, previousPeriod, type Period } from "./performancePeriod";

// Reads the rows the performance reports are built from -- real orders, invoices, expenses and payroll entries -- for one
// period. Only the needed columns are selected, so a long period stays cheap. Nothing is written.
export type PerfInput = { orders: OrderRow[]; invoices: InvoiceRow[]; costs: CostRow[]; teams: TeamInfo[]; from: Date; to: Date };

const customer = (c: { type: string; name: string; companyName: string | null }) => (c.type === "COMPANY" ? c.companyName || c.name : c.name);

export async function loadPerfInput(period: { from: Date; to: Date }): Promise<PerfInput> {
  const range = { gte: period.from, lte: period.to };
  const [orders, invoices, expenses, payroll, teams] = await Promise.all([
    prisma.order.findMany({ where: { date: range }, select: { id: true, number: true, date: true, status: true, teamId: true, assignedToId: true, customer: { select: { emirate: true, name: true, companyName: true, type: true } } } }),
    prisma.invoice.findMany({ where: { date: range }, select: { id: true, number: true, date: true, amount: true, refundedAmount: true, status: true, paidAmount: true, teamId: true, createdById: true, payment: true, customer: { select: { emirate: true, name: true, companyName: true, type: true } } } }),
    prisma.expense.findMany({ where: { date: range }, select: { id: true, date: true, amount: true, refundedAmount: true, teamId: true, createdById: true, category: true, subcategory: true, expenseClass: true, description: true, vendor: true, attachmentUrl: true } }),
    prisma.payrollEntry.findMany({ where: { date: range }, select: { id: true, date: true, amount: true, type: true, note: true, employeeId: true, employee: { select: { name: true, teamId: true } } } }),
    prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const costs: CostRow[] = [
    ...expenses.map((e): CostRow => ({
      id: e.id, date: e.date, amount: e.amount - e.refundedAmount, teamId: e.teamId, employeeId: e.createdById,
      bucket: bucketOf("Expense", e.category, e.subcategory, e.expenseClass), source: "Expense",
      category: [e.category, e.subcategory].filter(Boolean).join(" · ") || "Uncategorized", description: e.description, vendor: e.vendor, attachmentUrl: e.attachmentUrl,
    })),
    // Same "Net Payroll" rule as the rest of the reports: Salary + Advance - Deduction.
    ...payroll.map((p): CostRow => ({
      id: p.id, date: p.date, amount: p.type === "Deduction" ? -p.amount : p.amount, teamId: p.employee.teamId, employeeId: p.employeeId,
      bucket: "Employee-related", source: "Payroll", category: `Payroll · ${p.type}`, description: `${p.employee.name}${p.note ? ` — ${p.note}` : ""}`, vendor: null, attachmentUrl: null,
    })),
  ];

  return {
    from: period.from, to: period.to, teams,
    orders: orders.map((o) => ({ id: o.id, number: o.number, date: o.date, status: o.status, teamId: o.teamId, emirate: o.customer.emirate, employeeId: o.assignedToId, customerName: customer(o.customer) })),
    invoices: invoices.map((i) => ({ id: i.id, number: i.number, date: i.date, amount: i.amount, refundedAmount: i.refundedAmount, status: i.status, paidAmount: i.paidAmount, teamId: i.teamId, emirate: i.customer.emirate, employeeId: i.createdById, customerName: customer(i.customer), payment: i.payment })),
    costs,
  };
}

export type RawParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export type PerfQuery = { period: Period; filters: PerfFilters; compare: boolean; params: URLSearchParams };

// Turns the page's query string into a period + filters. Unknown values fall back to "no filter".
export function parsePerfQuery(sp: RawParams, overrides: Partial<PerfFilters> = {}): PerfQuery {
  const period = resolvePeriod({ preset: one(sp.preset), from: one(sp.from), to: one(sp.to) });
  const pay = one(sp.pay);
  const filters: PerfFilters = {
    emirate: one(sp.emirate) || undefined,
    teamId: one(sp.team) || undefined,
    employeeId: one(sp.employee) || undefined,
    orderStatus: one(sp.status) || undefined,
    paymentStatus: (["Paid", "Unpaid", "PartiallyPaid"] as string[]).includes(pay ?? "") ? (pay as PaymentStatusFilter) : undefined,
    ...overrides,
  };
  const params = new URLSearchParams();
  for (const k of ["preset", "from", "to", "emirate", "team", "employee", "status", "pay", "compare"]) {
    const v = one(sp[k]);
    if (v) params.set(k, v);
  }
  return { period, filters, compare: one(sp.compare) === "1", params };
}

export async function loadPerformance(q: PerfQuery) {
  const input = await loadPerfInput(q.period);
  const current = computePerformance(input, q.filters);
  let previous: ReturnType<typeof computePerformance> | null = null;
  let previousLabel = "";
  if (q.compare) {
    const prev = previousPeriod(q.period);
    previousLabel = prev.label;
    previous = computePerformance(await loadPerfInput(prev), q.filters);
  }
  const employees = await prisma.employee.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return { input, current, previous, previousLabel, employees };
}
