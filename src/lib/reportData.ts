import { prisma } from "./prisma";
import { COST_OF_SERVICES_CATEGORIES } from "./expenseData";
import type { Prisma } from "@/generated/prisma";

export type PaymentTotals = { cash: number; ziina: number; bankTransfer: number };

// Sums Paid invoice amounts by payment method (Cash / Ziina / Bank Transfer) for
// whatever scope the caller passes in (a date range, a team, a specific employee, ...).
export async function getPaymentTotals(where: Prisma.InvoiceWhereInput = {}): Promise<PaymentTotals> {
  const rows = await prisma.invoice.groupBy({
    by: ["payment"],
    _sum: { amount: true },
    where: { ...where, status: "Paid" },
  });
  const map = new Map(rows.map((r) => [r.payment, r._sum.amount ?? 0]));
  return {
    cash: map.get("Cash") ?? 0,
    ziina: map.get("Ziina") ?? 0,
    bankTransfer: map.get("Bank Transfer") ?? 0,
  };
}

export const CORPORATE_TAX_RATE = 0.09;
export const CORPORATE_TAX_EXEMPT_THRESHOLD = 375000;

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type MonthFigures = {
  revenue: number;
  costOfServiceExpenses: number;
  operatingExpenses: number;
  salaries: number;
  cash: number;
  ziina: number;
  bankTransfer: number;
};

export async function computeAnnualReport(
  year: number,
  team: string | null
): Promise<{ months: MonthFigures[]; monthsElapsed: number }> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthsElapsed = year < currentYear ? 12 : year > currentYear ? 0 : currentMonth;

  const teamFilter = team && team !== "all" ? { team: { name: team } } : {};
  const payrollTeamFilter = team && team !== "all" ? { employee: { team: { name: team } } } : {};

  const [invoices, expenses, payrollEntries] = await Promise.all([
    prisma.invoice.findMany({
      where: { ...teamFilter, status: { not: "Unpaid" } },
      select: { date: true, amount: true, refundedAmount: true, payment: true },
    }),
    prisma.expense.findMany({ where: teamFilter, select: { date: true, amount: true, refundedAmount: true, category: true } }),
    prisma.payrollEntry.findMany({ where: payrollTeamFilter, select: { date: true, amount: true, type: true } }),
  ]);

  const months: MonthFigures[] = Array.from({ length: 12 }, () => ({
    revenue: 0,
    costOfServiceExpenses: 0,
    operatingExpenses: 0,
    salaries: 0,
    cash: 0,
    ziina: 0,
    bankTransfer: 0,
  }));

  for (const inv of invoices) {
    if (inv.date.getFullYear() !== year) continue;
    const net = inv.amount - inv.refundedAmount;
    const bucket = months[inv.date.getMonth()];
    bucket.revenue += net;
    if (inv.payment === "Cash") bucket.cash += net;
    else if (inv.payment === "Ziina") bucket.ziina += net;
    else if (inv.payment === "Bank Transfer") bucket.bankTransfer += net;
  }

  for (const exp of expenses) {
    if (exp.date.getFullYear() !== year) continue;
    const net = exp.amount - exp.refundedAmount;
    const isCostOfService = COST_OF_SERVICES_CATEGORIES.includes(
      exp.category as (typeof COST_OF_SERVICES_CATEGORIES)[number]
    );
    if (isCostOfService) {
      months[exp.date.getMonth()].costOfServiceExpenses += net;
    } else {
      months[exp.date.getMonth()].operatingExpenses += net;
    }
  }

  // Salary cost comes from actual Payroll entries (Salary + Advance - Deduction, the
  // same "Net Payroll" formula shown on the Payroll page) rather than an automatic
  // accrual of the employee's Monthly Salary field, so Reports always matches what
  // was actually recorded as paid.
  for (const entry of payrollEntries) {
    if (entry.date.getFullYear() !== year) continue;
    const signed = entry.type === "Deduction" ? -entry.amount : entry.amount;
    months[entry.date.getMonth()].salaries += signed;
  }

  return { months, monthsElapsed };
}

export function summarize(months: MonthFigures[]) {
  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const totalSalaries = months.reduce((s, m) => s + m.salaries, 0);
  const totalCostOfServiceExpenses = months.reduce((s, m) => s + m.costOfServiceExpenses, 0);
  const totalOperatingExpenses = months.reduce((s, m) => s + m.operatingExpenses, 0);
  const totalCash = months.reduce((s, m) => s + m.cash, 0);
  const totalZiina = months.reduce((s, m) => s + m.ziina, 0);
  const totalBankTransfer = months.reduce((s, m) => s + m.bankTransfer, 0);

  // Technician salaries are part of Cost of Services (they're incurred delivering the
  // service), per the corporate tax spec's Income/Cost of Services/Operating Expenses split.
  const costOfServices = totalCostOfServiceExpenses + totalSalaries;
  const grossProfit = totalRevenue - costOfServices;
  const netProfitBeforeTax = grossProfit - totalOperatingExpenses;
  const taxableProfit = Math.max(0, netProfitBeforeTax);
  const corporateTax =
    taxableProfit <= CORPORATE_TAX_EXEMPT_THRESHOLD
      ? 0
      : (taxableProfit - CORPORATE_TAX_EXEMPT_THRESHOLD) * CORPORATE_TAX_RATE;
  const netProfitAfterTax = netProfitBeforeTax - corporateTax;

  // Kept for backward-compat callers that just want "all expenses" as one number.
  const totalExpenses = totalCostOfServiceExpenses + totalOperatingExpenses;

  return {
    totalRevenue,
    totalSalaries,
    totalCostOfServiceExpenses,
    totalOperatingExpenses,
    totalExpenses,
    totalCash,
    totalZiina,
    totalBankTransfer,
    costOfServices,
    grossProfit,
    operatingExpenses: totalOperatingExpenses,
    netProfitBeforeTax,
    taxableProfit,
    corporateTax,
    netProfitAfterTax,
  };
}
