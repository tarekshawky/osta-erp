// The three kinds of expense and what each one records. Pure data + calculations (unit-tested); the database parts live in
// the server actions. An expense with no class was recorded before this existed and is read as a company expense.

export const EXPENSE_CLASSES = ["COMPANY", "EMPLOYEE", "CUSTOMER_PURCHASE"] as const;
export type ExpenseClass = (typeof EXPENSE_CLASSES)[number];

export const CLASS_LABEL: Record<ExpenseClass, { en: string; ar: string; text: string; textAr: string }> = {
  COMPANY: { en: "Company Expenses", ar: "مصروفات الشركة", text: "Rent, utilities, marketing, vehicles, fees and other running costs of the company", textAr: "الإيجار والخدمات والتسويق والسيارات والرسوم وباقي تكاليف تشغيل الشركة" },
  EMPLOYEE: { en: "Employee Expenses", ar: "مصروفات العاملين", text: "Daily workers, temporary labour, overtime, housing, transport, bonuses", textAr: "العمال بنظام اليومية والعمالة المؤقتة والإضافي والسكن والمواصلات والمكافآت" },
  CUSTOMER_PURCHASE: { en: "Customer Materials Purchase", ar: "شراء بضاعة لحساب العملاء", text: "Parts and materials bought for a customer's job, costed on the service order", textAr: "قطع ومواد تُشترى لعمل عميل وتُحسب تكلفتها على أمر الخدمة" },
};

// Employee expense kinds. Salaries and advances already live in Payroll, so they are sent there instead of being entered a
// second time (that would count them twice).
export type EmployeeKind = { kind: string; ar: string; category?: string; viaPayroll?: boolean };
export const EMPLOYEE_KINDS: EmployeeKind[] = [
  { kind: "Monthly Salary", ar: "الرواتب الشهرية", viaPayroll: true },
  { kind: "Daily Worker", ar: "عامل بنظام اليومية", category: "Daily Worker" },
  { kind: "Temporary Labour Wages", ar: "أجور العمالة المؤقتة", category: "Temporary Labour" },
  { kind: "Overtime", ar: "الإضافي", category: "Overtime" },
  { kind: "Accommodation", ar: "السكن والإقامة", category: "Accommodation" },
  { kind: "Transportation", ar: "المواصلات", category: "Transportation" },
  { kind: "Advance", ar: "السلف", viaPayroll: true },
  { kind: "Bonus", ar: "المكافآت", category: "Employee Bonus" },
  { kind: "Other Employee Expense", ar: "مصروفات أخرى للعاملين", category: "Employee Other" },
];

export const RENTAL_KINDS = {
  "equipment-rental": { kind: "Equipment Rental", ar: "إيجار معدات", category: "Equipment Rental" },
  "transport-rental": { kind: "Transport Vehicle Rental", ar: "إيجار سيارة نقل", category: "Transport Vehicle Rental" },
} as const;
export type RentalGroup = keyof typeof RENTAL_KINDS;

// Categories added for the new kinds (the existing categories are unchanged).
export const NEW_EXPENSE_CATEGORIES = ["Daily Worker", "Temporary Labour", "Overtime", "Employee Bonus", "Employee Other", "Equipment Rental", "Transport Vehicle Rental"] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

// --- Daily worker: days x daily rate = amount due -------------------------------------------------------------------
export function dailyWorkerTotal(days: number, rate: number): number {
  return round2(days * rate);
}

// --- Rentals --------------------------------------------------------------------------------------------------------
// Whole days from start to end, both included (a one-day hire has the same start and end).
export function inclusiveDays(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

// --- Customer materials purchase -----------------------------------------------------------------------------------
export type PurchaseItemInput = { name: string; description?: string; qty: number; unitPrice: number; supplier?: string; supplierInvoiceNo?: string };

export const itemTotal = (qty: number, unitPrice: number) => round2(qty * unitPrice);
export const purchaseTotal = (items: { qty: number; unitPrice: number }[]) => round2(items.reduce((s, i) => s + itemTotal(i.qty, i.unitPrice), 0));

export function validatePurchaseItems(items: PurchaseItemInput[]): string | null {
  if (items.length === 0) return "Add at least one product.";
  for (const [i, it] of items.entries()) {
    if (!it.name.trim()) return `Product ${i + 1}: enter the item name.`;
    if (!Number.isFinite(it.qty) || it.qty <= 0) return `Product ${i + 1}: quantity must be more than 0.`;
    if (!Number.isFinite(it.unitPrice) || it.unitPrice < 0) return `Product ${i + 1}: enter a valid unit price.`;
  }
  return purchaseTotal(items) > 0 ? null : "The total must be more than 0.";
}

export function purchaseNumber(year: number, seq: number): string {
  return `CMP-${year}-${String(seq).padStart(6, "0")}`;
}

// The same supplier invoice entered twice is the same purchase.
export function supplierInvoiceKey(supplier: string | null | undefined, invoiceNo: string | null | undefined): string | null {
  const n = (invoiceNo ?? "").trim().toLowerCase();
  if (!n) return null;
  return `${(supplier ?? "").trim().toLowerCase()}|${n}`;
}

// What the parts cost against what the customer was charged and has paid for them. `partsBilled` is the spare-part lines of
// the order's invoice; the share of the invoice already collected is applied to them to get the parts' collected part.
export type PurchaseMargin = { cost: number; billed: number; collected: number; marginBilled: number; marginCollected: number; marginPct: number | null };
export function purchaseMargin(cost: number, partsBilled: number, invoiceNet: number, invoiceCollected: number): PurchaseMargin {
  const share = invoiceNet > 0 ? Math.min(1, Math.max(0, invoiceCollected / invoiceNet)) : 0;
  const billed = round2(partsBilled);
  const collected = round2(partsBilled * share);
  return {
    cost: round2(cost), billed, collected,
    marginBilled: round2(billed - cost), marginCollected: round2(collected - cost),
    marginPct: billed > 0 ? round2(((billed - cost) / billed) * 100) : null,
  };
}
