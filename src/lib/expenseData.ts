import { prisma } from "@/lib/prisma";

export const EXPENSE_CATEGORIES = [
  "Vehicle",
  "Advertising",
  "Materials",
  "Transportation",
  "Meals",
  "Accommodation",
  "Maintenance",
  "Marketing Advertising",
  "Fuel",
  "Office Supplies",
  "Software",
  "Subscriptions",
  "Utilities",
  "Equipment",
  "Other",
  "Air Ticket",
  "Gratuity Expenses",
  "Leave Salary",
  "Legal and Professional Fees",
  "Rent",
  "Telephone Expenses",
  "Trade License Renewal Fee",
  "Insurance",
  "Visa Expenses",
] as const;

// Expenses tagged with this category feed the Marketing dashboard's Total Marketing
// Spend and campaign ROI figures (see src/lib/marketingData.ts). Kept distinct from
// the existing "Advertising" category so historical data there is unaffected.
export const MARKETING_EXPENSE_CATEGORY = "Marketing Advertising";

// Expense records are reported together as All Expenses. Payroll is the only direct
// Cost of Services item, so recorded expense categories are not split in the P&L.
export const COST_OF_SERVICES_CATEGORIES: readonly (typeof EXPENSE_CATEGORIES)[number][] = [];

// Legacy free-text vehicle names, matched exactly against historical Expense.vehicle
// values by the one-off scripts/seedVehiclesAndBackfill.ts script. Dead for new
// entries -- the Vehicle model + Expense.vehicleId (see src/lib/vehicleData.ts) is
// the real, FK-based replacement.
export const VEHICLES = ["Dodge Journey", "Toyota Yaris", "Toyota Camry", "MG ZST"] as const;

export const ADVERTISING_PLATFORMS = ["Meta Ads", "Google Ads", "Meta Verified", "Others"] as const;

export const EXPENSE_PAYMENT_METHODS = ["Cash", "Bank Transfer", "Credit Card"] as const;

// Historical Expense rows stored the old "Bank"/"Credit" values (before Credit Card
// Wallets shipped) -- never migrated, since dev and prod share one live database.
// Every place that groups, sums, or displays a payment value must go through
// canonicalExpensePayment() so old and new rows roll up together correctly.
export const LEGACY_EXPENSE_PAYMENT_ALIASES: Record<string, string> = {
  Bank: "Bank Transfer",
  Credit: "Credit Card",
};

export function canonicalExpensePayment(payment: string): string {
  return LEGACY_EXPENSE_PAYMENT_ALIASES[payment] ?? payment;
}

export const EXPENSE_CATEGORY_STYLES: Record<string, string> = {
  Vehicle: "bg-orange-50 text-orange-600",
  Advertising: "bg-sky-50 text-sky-600",
  Materials: "bg-teal-50 text-teal-600",
  Transportation: "bg-indigo-50 text-indigo-600",
  Meals: "bg-amber-50 text-amber-600",
  Accommodation: "bg-purple-50 text-purple-600",
  Maintenance: "bg-slate-100 text-slate-600",
  "Marketing Advertising": "bg-pink-50 text-pink-600",
  Fuel: "bg-orange-50 text-orange-500",
  "Office Supplies": "bg-cyan-50 text-cyan-600",
  Software: "bg-violet-50 text-violet-600",
  Subscriptions: "bg-fuchsia-50 text-fuchsia-600",
  Utilities: "bg-yellow-50 text-yellow-700",
  Equipment: "bg-lime-50 text-lime-700",
  Other: "bg-rose-50 text-rose-600",
  "Air Ticket": "bg-blue-50 text-blue-600",
  "Gratuity Expenses": "bg-emerald-50 text-emerald-700",
  "Leave Salary": "bg-teal-50 text-teal-700",
  "Legal and Professional Fees": "bg-slate-100 text-slate-700",
  Rent: "bg-amber-50 text-amber-700",
  "Telephone Expenses": "bg-sky-50 text-sky-700",
  "Trade License Renewal Fee": "bg-indigo-50 text-indigo-700",
  Insurance: "bg-purple-50 text-purple-700",
  "Visa Expenses": "bg-cyan-50 text-cyan-700",
};

// Shared by admin's createExpense action and the employee expense form so both
// produce identically-formatted, non-colliding expense numbers -- mirrors
// generateOrderNumber() in src/lib/orderData.ts. Nullable/not backfilled: only
// expenses created after this shipped get one, historical rows show "--".
export async function generateExpenseNumber(): Promise<string> {
  const date = new Date();
  const numberPrefix = `EXP-${date.getFullYear()}-`;
  const lastExpense = await prisma.expense.findFirst({
    where: { number: { startsWith: numberPrefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = lastExpense?.number ? parseInt(lastExpense.number.slice(numberPrefix.length), 10) : 0;
  return `${numberPrefix}${String(lastSeq + 1).padStart(6, "0")}`;
}
