import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { buildDateRange } from "@/lib/dateRangeFilter";
import { generateExpenseNumber, EXPENSE_PAYMENT_METHODS } from "@/lib/expenseData";

export const RENTAL_TYPES = ["Accommodation", "Office", "Warehouse", "Shop", "Staff Accommodation", "Other"] as const;

export const PAYMENT_FREQUENCIES = ["Monthly", "Quarterly", "Semi-Annual", "Annual", "Custom"] as const;
export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];

const FREQUENCY_MONTHS: Record<PaymentFrequency, number> = {
  Monthly: 1,
  Quarterly: 3,
  "Semi-Annual": 6,
  Annual: 12,
  Custom: 1,
};

export const RENTAL_AGREEMENT_STATUSES = ["Active", "Suspended", "Expired", "Cancelled"] as const;
export const RENTAL_PAYMENT_STATUSES = ["Pending", "Due", "Overdue", "Paid", "Cancelled"] as const;

export const RENTAL_PAYMENT_STATUS_STYLES: Record<string, string> = {
  Pending: "bg-slate-100 text-slate-600",
  Due: "bg-amber-50 text-amber-600",
  Overdue: "bg-red-50 text-red-600",
  Paid: "bg-green-50 text-green-700",
  Cancelled: "bg-slate-100 text-slate-400",
};

export const RENTAL_AGREEMENT_STATUS_STYLES: Record<string, string> = {
  Active: "bg-green-50 text-green-700",
  Suspended: "bg-amber-50 text-amber-600",
  Expired: "bg-slate-100 text-slate-500",
  Cancelled: "bg-red-50 text-red-600",
};

// Reuse the app-wide payment method set (Cash/Bank Transfer/Credit Card) rather than
// the spec's literal "Card"/"Other" wording -- keeps canonicalExpensePayment()-based
// Cash Flow classification accurate with zero extra mapping code.
export const RENTAL_PAYMENT_METHODS = EXPENSE_PAYMENT_METHODS;

// Single source of truth for the Expense.category string this feature writes --
// deliberately a brand-new category, not a reuse of the existing generic "Rent" or
// unrelated "Accommodation" categories (see plan Context for why).
export const RENT_EXPENSE_CATEGORY = "Rent / Accommodation";

// Rolling window: how many months beyond "today" stay generated at any time.
// Refreshed lazily on every Rental Expenses / Customer Rental tab page load --
// this app has no cron infrastructure, so there is no other trigger.
export const GENERATION_HORIZON_MONTHS = 3;

// Due-vs-Pending status threshold, and the alert lead time -- mirrors
// EXPIRY_ALERT_DAYS/DUE_SOON_KM naming convention in vehicleData.ts.
export const DUE_SOON_DAYS = 7;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function customerDisplayName(customer: { type: string; name: string; companyName: string | null }): string {
  return customer.type === "COMPANY" ? customer.companyName || customer.name : customer.name;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export type RentalPaymentStatus = (typeof RENTAL_PAYMENT_STATUSES)[number];

export function deriveRentalPaymentStatus(
  dueDate: Date,
  paymentDate: Date | null,
  cancelled: boolean,
  now: Date = new Date()
): RentalPaymentStatus {
  if (cancelled) return "Cancelled";
  if (paymentDate) return "Paid";
  if (dueDate.getTime() < now.getTime()) return "Overdue";
  const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
  if (dueDate.getTime() <= dueSoonCutoff.getTime()) return "Due";
  return "Pending";
}

export type BillingPeriodRow = { billingPeriod: Date; dueDate: Date };

// Pure function: given an agreement and the periods that already exist, returns the
// missing {billingPeriod, dueDate} rows from the next period after the latest
// existing one (or startDate if none exist) through `throughDate`, respecting
// paymentFrequency's month-step and endDate as a hard cutoff.
export function computeNextBillingPeriods(
  agreement: { startDate: Date; endDate: Date | null; paymentFrequency: string; paymentDueDay: number },
  existingPeriods: Date[],
  throughDate: Date
): BillingPeriodRow[] {
  const step = FREQUENCY_MONTHS[agreement.paymentFrequency as PaymentFrequency] ?? 1;
  const dueDay = Math.min(Math.max(agreement.paymentDueDay, 1), 28);

  const startPeriod = new Date(Date.UTC(agreement.startDate.getUTCFullYear(), agreement.startDate.getUTCMonth(), 1));

  let cursor: Date;
  if (existingPeriods.length === 0) {
    cursor = startPeriod;
  } else {
    const maxExisting = existingPeriods.reduce((max, d) => (d.getTime() > max.getTime() ? d : max), existingPeriods[0]);
    cursor = new Date(Date.UTC(maxExisting.getUTCFullYear(), maxExisting.getUTCMonth() + step, 1));
  }

  const rows: BillingPeriodRow[] = [];
  const cutoff = agreement.endDate
    ? new Date(Math.min(throughDate.getTime(), agreement.endDate.getTime()))
    : throughDate;

  while (cursor.getTime() <= cutoff.getTime()) {
    const dueDate = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), dueDay));
    rows.push({ billingPeriod: cursor, dueDate });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + step, 1));
  }
  return rows;
}

// Idempotent: pre-queries existing billingPeriods before inserting, backed by the
// @@unique([rentalAgreementId, billingPeriod]) constraint as a hard guarantee.
// Creates one Expense (category RENT_EXPENSE_CATEGORY) + one RentalTransaction per
// missing period, inside one prisma.$transaction per period. Only processes Active
// agreements -- Pause/Cancel stop future generation simply by changing status.
export async function ensureRentalTransactionsGenerated(agreementId: string): Promise<number> {
  const agreement = await prisma.rentalAgreement.findUnique({
    where: { id: agreementId },
    include: { customer: true, transactions: { select: { billingPeriod: true } } },
  });
  if (!agreement || agreement.status !== "Active") return 0;

  const throughDate = new Date();
  throughDate.setUTCMonth(throughDate.getUTCMonth() + GENERATION_HORIZON_MONTHS);

  const missing = computeNextBillingPeriods(
    agreement,
    agreement.transactions.map((t) => t.billingPeriod),
    throughDate
  );
  if (missing.length === 0) return 0;

  const customerName = customerDisplayName(agreement.customer);

  let created = 0;
  for (const period of missing) {
    const number = await generateExpenseNumber();
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          number,
          date: period.dueDate,
          description: `${agreement.agreementName} — ${monthLabel(period.billingPeriod)}`,
          category: RENT_EXPENSE_CATEGORY,
          vendor: customerName,
          amount: agreement.monthlyRent,
          payment: agreement.paymentMethod,
          createdById: agreement.createdById,
        },
      });
      await tx.rentalTransaction.create({
        data: {
          rentalAgreementId: agreement.id,
          billingPeriod: period.billingPeriod,
          dueDate: period.dueDate,
          amount: round2(agreement.monthlyRent),
          paymentStatus: deriveRentalPaymentStatus(period.dueDate, null, false),
          expenseId: expense.id,
        },
      });
    });
    created++;
  }
  return created;
}

// Lightweight sweep: bump any Pending/Due row whose due date has since passed into
// Overdue. Called alongside generation on every page load -- the same lazy-refresh
// pattern as generation itself, since there is no cron to do this on a schedule.
export async function refreshOverdueStatuses(): Promise<void> {
  await prisma.rentalTransaction.updateMany({
    where: { paymentStatus: { in: ["Pending", "Due"] }, dueDate: { lt: new Date() } },
    data: { paymentStatus: "Overdue" },
  });
}

export async function ensureAllActiveAgreementsGenerated(): Promise<void> {
  const active = await prisma.rentalAgreement.findMany({ where: { status: "Active" }, select: { id: true } });
  for (const a of active) {
    await ensureRentalTransactionsGenerated(a.id);
  }
  await refreshOverdueStatuses();
}

export async function getCustomerRelationshipLabel(customerId: string): Promise<string> {
  const count = await prisma.rentalAgreement.count({ where: { customerId } });
  return count > 0 ? "Customer + Landlord" : "Customer";
}

export type RentalAgreementRow = {
  id: string;
  agreementName: string;
  rentalType: string;
  monthlyRent: number;
  paymentFrequency: string;
  startDate: Date;
  endDate: Date | null;
  paymentMethod: string;
  status: string;
  notes: string | null;
  nextPayment: number | null;
  nextDueDate: Date | null;
};

export async function getRentalAgreementsForCustomer(customerId: string): Promise<RentalAgreementRow[]> {
  const agreements = await prisma.rentalAgreement.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: {
      transactions: {
        where: { paymentStatus: { in: ["Pending", "Due", "Overdue"] } },
        orderBy: { dueDate: "asc" },
        take: 1,
      },
    },
  });
  return agreements.map((a) => ({
    id: a.id,
    agreementName: a.agreementName,
    rentalType: a.rentalType,
    monthlyRent: a.monthlyRent,
    paymentFrequency: a.paymentFrequency,
    startDate: a.startDate,
    endDate: a.endDate,
    paymentMethod: a.paymentMethod,
    status: a.status,
    notes: a.notes,
    nextPayment: a.transactions[0]?.amount ?? null,
    nextDueDate: a.transactions[0]?.dueDate ?? null,
  }));
}

export type CustomerRentalSummary = {
  activeAgreements: number;
  monthlyRecurring: number;
  totalPaidLifetime: number;
  outstandingRental: number;
  nextDue: { amount: number; dueDate: Date } | null;
};

export async function getCustomerRentalSummary(customerId: string): Promise<CustomerRentalSummary> {
  const [activeAgreements, paidAgg, outstandingAgg, nextDue] = await Promise.all([
    prisma.rentalAgreement.findMany({ where: { customerId, status: "Active" }, select: { monthlyRent: true } }),
    prisma.rentalTransaction.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: "Paid", rentalAgreement: { customerId } },
    }),
    prisma.rentalTransaction.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: { in: ["Due", "Overdue"] }, rentalAgreement: { customerId } },
    }),
    prisma.rentalTransaction.findFirst({
      where: { paymentStatus: { in: ["Pending", "Due", "Overdue"] }, rentalAgreement: { customerId } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return {
    activeAgreements: activeAgreements.length,
    monthlyRecurring: activeAgreements.reduce((sum, a) => sum + a.monthlyRent, 0),
    totalPaidLifetime: paidAgg._sum.amount ?? 0,
    outstandingRental: outstandingAgg._sum.amount ?? 0,
    nextDue: nextDue ? { amount: nextDue.amount, dueDate: nextDue.dueDate } : null,
  };
}

export type RentalTransactionRow = {
  id: string;
  rentalAgreementId: string;
  agreementName: string;
  customerId: string;
  customerName: string;
  rentalType: string;
  amount: number;
  dueDate: Date;
  billingPeriod: Date;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentDate: Date | null;
  referenceNumber: string | null;
  notes: string | null;
};

export type RentalTransactionFilters = {
  year?: number | null;
  month?: number | null;
  customerId?: string;
  status?: string;
  paymentMethod?: string;
  rentalType?: string;
};

export async function getRentalTransactions(filters: RentalTransactionFilters): Promise<RentalTransactionRow[]> {
  const dateRange = buildDateRange(filters.year ?? null, filters.month ?? null);
  const where: Prisma.RentalTransactionWhereInput = {
    ...(dateRange ? { dueDate: dateRange } : {}),
    ...(filters.status ? { paymentStatus: filters.status } : {}),
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
    rentalAgreement: {
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.rentalType ? { rentalType: filters.rentalType } : {}),
    },
  };

  const rows = await prisma.rentalTransaction.findMany({
    where,
    orderBy: { dueDate: "desc" },
    include: { rentalAgreement: { include: { customer: true } } },
  });

  return rows.map((t) => ({
    id: t.id,
    rentalAgreementId: t.rentalAgreementId,
    agreementName: t.rentalAgreement.agreementName,
    customerId: t.rentalAgreement.customerId,
    customerName: customerDisplayName(t.rentalAgreement.customer),
    rentalType: t.rentalAgreement.rentalType,
    amount: t.amount,
    dueDate: t.dueDate,
    billingPeriod: t.billingPeriod,
    paymentStatus: t.paymentStatus,
    paymentMethod: t.paymentMethod,
    paymentDate: t.paymentDate,
    referenceNumber: t.referenceNumber,
    notes: t.notes,
  }));
}

export type RentalExpenseSummary = {
  totalThisMonth: number;
  totalOutstanding: number;
  totalPaidYtd: number;
  activeAgreementsCount: number;
};

export async function computeRentalExpenseSummary(): Promise<RentalExpenseSummary> {
  const now = new Date();
  const monthRange = buildDateRange(now.getFullYear(), now.getMonth() + 1)!;
  const yearRange = buildDateRange(now.getFullYear(), null)!;

  const [thisMonthAgg, outstandingAgg, paidYtdAgg, activeCount] = await Promise.all([
    prisma.rentalTransaction.aggregate({ _sum: { amount: true }, where: { dueDate: monthRange } }),
    prisma.rentalTransaction.aggregate({ _sum: { amount: true }, where: { paymentStatus: { in: ["Due", "Overdue"] } } }),
    prisma.rentalTransaction.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: "Paid", paymentDate: yearRange },
    }),
    prisma.rentalAgreement.count({ where: { status: "Active" } }),
  ]);

  return {
    totalThisMonth: thisMonthAgg._sum.amount ?? 0,
    totalOutstanding: outstandingAgg._sum.amount ?? 0,
    totalPaidYtd: paidYtdAgg._sum.amount ?? 0,
    activeAgreementsCount: activeCount,
  };
}

export type RentalAlert = {
  agreementId: string;
  customerId: string;
  customerName: string;
  kind: "Upcoming Rent" | "Overdue Rent";
  detail: string;
};

export async function getRentalAlerts(customerId?: string): Promise<RentalAlert[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);

  const rows = await prisma.rentalTransaction.findMany({
    where: {
      paymentStatus: { in: ["Pending", "Due", "Overdue"] },
      dueDate: { lte: cutoff },
      rentalAgreement: { status: "Active", ...(customerId ? { customerId } : {}) },
    },
    include: { rentalAgreement: { include: { customer: true } } },
    orderBy: { dueDate: "asc" },
  });

  return rows.map((t) => ({
    agreementId: t.rentalAgreementId,
    customerId: t.rentalAgreement.customerId,
    customerName: customerDisplayName(t.rentalAgreement.customer),
    kind: t.dueDate.getTime() < now.getTime() ? "Overdue Rent" : "Upcoming Rent",
    detail: `AED ${t.amount.toLocaleString()} ${t.dueDate.getTime() < now.getTime() ? "overdue since" : "due"} ${t.dueDate.toISOString().slice(0, 10)}`,
  }));
}
