import { prisma } from "./prisma";
import { COST_OF_SERVICES_CATEGORIES } from "./expenseData";

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

  const [invoices, expenses, employees] = await Promise.all([
    prisma.invoice.findMany({ where: teamFilter, select: { date: true, amount: true, refundedAmount: true } }),
    prisma.expense.findMany({ where: teamFilter, select: { date: true, amount: true, refundedAmount: true, category: true } }),
    prisma.employee.findMany({ where: teamFilter, select: { monthlySalary: true, createdAt: true, status: true } }),
  ]);

  const months: MonthFigures[] = Array.from({ length: 12 }, () => ({
    revenue: 0,
    costOfServiceExpenses: 0,
    operatingExpenses: 0,
    salaries: 0,
  }));

  for (const inv of invoices) {
    if (inv.date.getFullYear() !== year) continue;
    months[inv.date.getMonth()].revenue += inv.amount - inv.refundedAmount;
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

  for (let m = 0; m < 12; m++) {
    if (m + 1 > monthsElapsed) continue;
    const monthEnd = new Date(Date.UTC(year, m + 1, 1));
    for (const emp of employees) {
      if (emp.status === "active" && emp.createdAt < monthEnd) {
        months[m].salaries += emp.monthlySalary;
      }
    }
  }

  return { months, monthsElapsed };
}

export function summarize(months: MonthFigures[]) {
  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const totalSalaries = months.reduce((s, m) => s + m.salaries, 0);
  const totalCostOfServiceExpenses = months.reduce((s, m) => s + m.costOfServiceExpenses, 0);
  const totalOperatingExpenses = months.reduce((s, m) => s + m.operatingExpenses, 0);

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
    costOfServices,
    grossProfit,
    operatingExpenses: totalOperatingExpenses,
    netProfitBeforeTax,
    taxableProfit,
    corporateTax,
    netProfitAfterTax,
  };
}
