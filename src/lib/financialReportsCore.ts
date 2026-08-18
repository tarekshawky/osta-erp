import { prisma } from "./prisma";
import { buildCustomDateRange } from "./dateRangeFilter";
import type { Setting } from "@/generated/prisma";

export type DateRange = { from: Date; to: Date };

export const ASSET_CATEGORIES = ["Vehicle", "Equipment", "Furniture", "Tools", "Property", "Other"] as const;
export const LIABILITY_TYPES = ["Bank Borrowing", "Other"] as const;
export const LIABILITY_CATEGORIES = ["Current", "Non-Current"] as const;

export { buildCustomDateRange };

// Quick-filter presets shown on every Financial Report's DateRangeFilter.
export const QUICK_FILTERS: { label: string; resolve: () => DateRange }[] = [
  {
    label: "This Month",
    resolve: () => {
      const now = new Date();
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        to: now,
      };
    },
  },
  {
    label: "Last Month",
    resolve: () => {
      const now = new Date();
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
      return { from, to };
    },
  },
  {
    label: "This Quarter",
    resolve: () => {
      const now = new Date();
      const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1)),
        to: now,
      };
    },
  },
  {
    label: "This Year",
    resolve: () => {
      const now = new Date();
      return { from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), to: now };
    },
  },
  {
    label: "Last Year",
    resolve: () => {
      const now = new Date();
      return {
        from: new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)),
        to: new Date(Date.UTC(now.getUTCFullYear() - 1, 11, 31)),
      };
    },
  },
];

// Reads Setting.taxRegistrationEffectiveDate (NEVER taxCertificateIssueDate, NEVER
// "today") to suggest the company's first tax period as a report date-range default.
export function suggestTaxPeriod(setting: Pick<Setting, "taxRegistrationEffectiveDate" | "firstTaxPeriodEnd">): DateRange | null {
  if (!setting.taxRegistrationEffectiveDate) return null;
  return {
    from: setting.taxRegistrationEffectiveDate,
    to: setting.firstTaxPeriodEnd ?? new Date(Date.UTC(setting.taxRegistrationEffectiveDate.getUTCFullYear(), 11, 31)),
  };
}

export function formatAsAtTitle(date: Date): string {
  return `AS AT ${date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })}`;
}

export function formatPeriodTitle(from: Date, to: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
  return `For the period from ${fmt(from)} to ${fmt(to)}`;
}

// One config entry per line item on the Statement of Comprehensive Income's
// "Administrative and General Expenses" section. Every consumer (on-screen report,
// PDF export, Excel export) iterates this SAME array, so a line can never silently
// diverge between what's shown and what's exported.
export type AdminExpenseLine = { label: string; compute: (range: DateRange) => Promise<number> };

const VEHICLE_MAINTENANCE_SUBCATEGORIES = [
  "Service",
  "Maintenance",
  "Tires",
  "Battery",
  "Car Wash",
  "Registration",
  "Insurance",
  "Salik",
  "Parking",
];

// Categories that have their own dedicated ADMIN_EXPENSE_LINES entry below --
// anything else (including "Other") falls through to the "Other Expenses" catch-all
// so no Expense.category can ever silently disappear from the Income Statement.
const EXPLICITLY_MAPPED_CATEGORIES = new Set([
  "Utilities",
  "Office Supplies",
  "Fuel",
  "Air Ticket",
  "Gratuity Expenses",
  "Leave Salary",
  "Legal and Professional Fees",
  "Rent",
  "Telephone Expenses",
  "Trade License Renewal Fee",
  "Insurance",
  "Visa Expenses",
  "Rent / Accommodation",
]);

async function sumExpensesByCategory(category: string, range: DateRange): Promise<number> {
  const agg = await prisma.expense.aggregate({
    _sum: { amount: true, refundedAmount: true },
    where: { category, vehicleId: null, date: buildCustomDateRange(range.from, range.to) },
  });
  return (agg._sum.amount ?? 0) - (agg._sum.refundedAmount ?? 0);
}

async function sumVehicleExpensesBySubcategories(subcategories: string[], range: DateRange): Promise<number> {
  const agg = await prisma.expense.aggregate({
    _sum: { amount: true, refundedAmount: true },
    where: { subcategory: { in: subcategories }, vehicleId: { not: null }, date: buildCustomDateRange(range.from, range.to) },
  });
  return (agg._sum.amount ?? 0) - (agg._sum.refundedAmount ?? 0);
}

async function sumSalaryExpense(range: DateRange): Promise<number> {
  // Gross -- Salary + Advance only, Deduction-type entries (e.g. a Vehicle Fine's
  // employee-recovered portion) never reduce this line. See plan Context for why
  // this deliberately differs from reportData.ts's netted `salaries` figure.
  const agg = await prisma.payrollEntry.aggregate({
    _sum: { amount: true },
    where: { type: { in: ["Salary", "Advance"] }, date: buildCustomDateRange(range.from, range.to) },
  });
  return agg._sum.amount ?? 0;
}

async function sumOtherExpenses(range: DateRange): Promise<number> {
  const rows = await prisma.expense.groupBy({
    by: ["category"],
    where: { vehicleId: null, date: buildCustomDateRange(range.from, range.to) },
    _sum: { amount: true, refundedAmount: true },
  });
  let total = 0;
  for (const row of rows) {
    const category = row.category ?? "Other";
    if (EXPLICITLY_MAPPED_CATEGORIES.has(category)) continue;
    total += (row._sum.amount ?? 0) - (row._sum.refundedAmount ?? 0);
  }
  return total;
}

export const ADMIN_EXPENSE_LINES: AdminExpenseLine[] = [
  { label: "Air Ticket", compute: (r) => sumExpensesByCategory("Air Ticket", r) },
  { label: "Electricity", compute: (r) => sumExpensesByCategory("Utilities", r) },
  { label: "Gratuity Expenses", compute: (r) => sumExpensesByCategory("Gratuity Expenses", r) },
  { label: "Fuel Expenses", compute: (r) => sumExpensesByCategory("Fuel", r) },
  { label: "Leave Salary", compute: (r) => sumExpensesByCategory("Leave Salary", r) },
  { label: "Legal and Professional Fees", compute: (r) => sumExpensesByCategory("Legal and Professional Fees", r) },
  { label: "Office Expenses", compute: (r) => sumExpensesByCategory("Office Supplies", r) },
  { label: "Other Expenses", compute: (r) => sumOtherExpenses(r) },
  { label: "Rent", compute: (r) => sumExpensesByCategory("Rent", r) },
  { label: "Rent / Accommodation", compute: (r) => sumExpensesByCategory("Rent / Accommodation", r) },
  { label: "Salary", compute: (r) => sumSalaryExpense(r) },
  { label: "Telephone Expenses", compute: (r) => sumExpensesByCategory("Telephone Expenses", r) },
  { label: "Trade License Renewal Fee", compute: (r) => sumExpensesByCategory("Trade License Renewal Fee", r) },
  { label: "Vehicle Maintenance", compute: (r) => sumVehicleExpensesBySubcategories(VEHICLE_MAINTENANCE_SUBCATEGORIES, r) },
  { label: "Vehicle Fuel", compute: (r) => sumVehicleExpensesBySubcategories(["Petrol / Fuel"], r) },
  { label: "Vehicle Fines", compute: (r) => sumVehicleExpensesBySubcategories(["Fine"], r) },
  { label: "Insurance", compute: (r) => sumExpensesByCategory("Insurance", r) },
  { label: "Visa Expenses", compute: (r) => sumExpensesByCategory("Visa Expenses", r) },
];
