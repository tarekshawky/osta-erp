import { prisma } from "@/lib/prisma";
import { buildDateRange } from "@/lib/dateRangeFilter";
import type { Prisma } from "@/generated/prisma";

export const VEHICLE_STATUSES = ["Active", "Inactive"] as const;

export const VEHICLE_EXPENSE_TYPES = [
  "Fine",
  "Service",
  "Petrol / Fuel",
  "Maintenance",
  "Insurance",
  "Salik",
  "Parking",
  "Registration",
  "Tires",
  "Battery",
  "Car Wash",
  "Other",
] as const;

export const SERVICE_TYPES = [
  "Regular Service",
  "Oil Change",
  "Major Service",
  "AC Service",
  "Brake Service",
  "Tire Service",
  "Battery",
  "Other",
] as const;

export const FUEL_TYPES = ["Petrol", "Diesel"] as const;

export const FINE_TYPES = ["Speeding", "Parking", "Salik", "Red Light", "Traffic Violation", "Other"] as const;

export const SERVICE_INTERVALS = [5000, 10000, 15000] as const;

export const DEDUCTION_METHODS = ["One Time", "Installments"] as const;

export const INSTALLMENT_COUNTS = [2, 3, 4] as const;

export const CONTRIBUTION_TYPES = ["Percentage", "Fixed"] as const;

// "Due Soon" threshold before nextServiceOdometer.
const DUE_SOON_KM = 500;

// License/insurance "expiring soon" window, in days.
const EXPIRY_ALERT_DAYS = 30;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// A vehicle's odometer is never denormalized/stored -- always the max of its
// baseline and every odometer-bearing Expense row, mirroring how
// getCreditCardWalletSummary aggregates on the fly instead of maintaining a
// running balance. excludeExpenseId lets an edit-in-place skip comparing a row
// against its own previous value.
export async function getVehicleCurrentOdometer(
  vehicleId: string,
  initialOdometer: number,
  excludeExpenseId?: string
): Promise<number> {
  const result = await prisma.expense.aggregate({
    _max: { odometer: true },
    where: {
      vehicleId,
      odometer: { not: null },
      ...(excludeExpenseId ? { id: { not: excludeExpenseId } } : {}),
    },
  });
  return Math.max(initialOdometer, result._max.odometer ?? 0);
}

export function checkOdometerReading(newReading: number, currentOdometer: number): "ok" | "below-current" {
  return newReading < currentOdometer ? "below-current" : "ok";
}

export type OdometerLogRow = {
  id: string;
  date: Date;
  odometer: number;
  subcategory: string | null;
  description: string;
};

export async function getVehicleOdometerLog(vehicleId: string): Promise<OdometerLogRow[]> {
  const rows = await prisma.expense.findMany({
    where: { vehicleId, odometer: { not: null } },
    orderBy: [{ odometer: "asc" }, { date: "asc" }],
    select: { id: true, date: true, odometer: true, subcategory: true, description: true },
  });
  return rows.map((r) => ({ ...r, odometer: r.odometer! }));
}

export type ServiceRow = {
  id: string;
  date: Date;
  odometer: number;
  detailType: string | null;
  amount: number;
  vendor: string | null;
  referenceNumber: string | null;
  attachmentUrl: string | null;
  notes: string | null;
  nextServiceInterval: number | null;
  kmSincePrevious: number | null;
};

export async function getServiceHistory(vehicleId: string): Promise<ServiceRow[]> {
  const rows = await prisma.expense.findMany({
    where: { vehicleId, subcategory: "Service" },
    orderBy: [{ odometer: "asc" }, { date: "asc" }],
  });
  return rows.map((r, i) => ({
    id: r.id,
    date: r.date,
    odometer: r.odometer ?? 0,
    detailType: r.detailType,
    amount: r.amount,
    vendor: r.vendor,
    referenceNumber: r.referenceNumber,
    attachmentUrl: r.attachmentUrl,
    notes: r.notes,
    nextServiceInterval: r.nextServiceInterval,
    kmSincePrevious: i === 0 ? null : (r.odometer ?? 0) - (rows[i - 1].odometer ?? 0),
  }));
}

export type NextServiceDue = {
  lastServiceOdometer: number;
  lastServiceDate: Date;
  nextServiceInterval: number | null;
  nextServiceOdometer: number | null;
};

export async function getNextServiceDue(vehicleId: string): Promise<NextServiceDue | null> {
  const last = await prisma.expense.findFirst({
    where: { vehicleId, subcategory: "Service", odometer: { not: null } },
    orderBy: [{ odometer: "desc" }, { date: "desc" }],
  });
  if (!last) return null;
  return {
    lastServiceOdometer: last.odometer!,
    lastServiceDate: last.date,
    nextServiceInterval: last.nextServiceInterval,
    nextServiceOdometer: last.nextServiceInterval != null ? last.odometer! + last.nextServiceInterval : null,
  };
}

export type ServiceDueStatus = "OK" | "Due Soon" | "Overdue" | "Unknown";

export async function getServiceDueStatus(vehicleId: string, initialOdometer: number): Promise<ServiceDueStatus> {
  const next = await getNextServiceDue(vehicleId);
  if (!next || next.nextServiceOdometer == null) return "Unknown";
  const current = await getVehicleCurrentOdometer(vehicleId, initialOdometer);
  const remaining = next.nextServiceOdometer - current;
  if (remaining <= 0) return "Overdue";
  if (remaining <= DUE_SOON_KM) return "Due Soon";
  return "OK";
}

export type FuelRow = {
  id: string;
  date: Date;
  odometer: number;
  vendor: string | null;
  detailType: string | null;
  liters: number | null;
  amount: number;
  attachmentUrl: string | null;
  notes: string | null;
  kmSincePrevious: number | null;
  kmPerLiter: number | null;
  costPerKm: number | null;
};

export async function getFuelHistory(vehicleId: string): Promise<FuelRow[]> {
  const rows = await prisma.expense.findMany({
    where: { vehicleId, subcategory: "Petrol / Fuel" },
    orderBy: [{ odometer: "asc" }, { date: "asc" }],
  });
  return rows.map((r, i) => {
    const kmSincePrevious = i === 0 ? null : (r.odometer ?? 0) - (rows[i - 1].odometer ?? 0);
    const kmPerLiter = kmSincePrevious && kmSincePrevious > 0 && r.liters ? kmSincePrevious / r.liters : null;
    const costPerKm = kmSincePrevious && kmSincePrevious > 0 ? r.amount / kmSincePrevious : null;
    return {
      id: r.id,
      date: r.date,
      odometer: r.odometer ?? 0,
      vendor: r.vendor,
      detailType: r.detailType,
      liters: r.liters,
      amount: r.amount,
      attachmentUrl: r.attachmentUrl,
      notes: r.notes,
      kmSincePrevious,
      kmPerLiter,
      costPerKm,
    };
  });
}

export type FuelSummary = {
  totalCost: number;
  totalLiters: number;
  avgKmPerLiter: number | null;
  avgCostPerKm: number | null;
};

export async function getFuelSummary(vehicleId: string): Promise<FuelSummary> {
  const history = await getFuelHistory(vehicleId);
  const totalCost = history.reduce((sum, r) => sum + r.amount, 0);
  const totalLiters = history.reduce((sum, r) => sum + (r.liters ?? 0), 0);
  const kmBearingRows = history.filter((r) => r.kmSincePrevious != null && r.kmSincePrevious > 0);
  const totalKm = kmBearingRows.reduce((sum, r) => sum + r.kmSincePrevious!, 0);
  const costOverKmBearingRows = kmBearingRows.reduce((sum, r) => sum + r.amount, 0);
  return {
    totalCost,
    totalLiters,
    avgKmPerLiter: totalLiters > 0 && totalKm > 0 ? totalKm / totalLiters : null,
    avgCostPerKm: totalKm > 0 ? costOverKmBearingRows / totalKm : null,
  };
}

// Defaults to "Company Covered" (companyAmount = full amount, employeeAmount = 0)
// when no contribution type/value is set -- matches the spec's own default-case
// example exactly.
export function computeFineSplit(
  amount: number,
  contributionType: "Percentage" | "Fixed" | null | undefined,
  contributionValue: number | null | undefined
): { companyAmount: number; employeeAmount: number } {
  if (!contributionType || contributionValue == null) {
    return { companyAmount: amount, employeeAmount: 0 };
  }
  const companyAmount =
    contributionType === "Percentage"
      ? Math.min(amount, Math.max(0, amount * (contributionValue / 100)))
      : Math.min(amount, Math.max(0, contributionValue));
  return { companyAmount: round2(companyAmount), employeeAmount: round2(amount - companyAmount) };
}

export type InstallmentPlanRow = { installmentNo: number; totalCount: number; amount: number; month: Date };

export function buildInstallmentPlan(
  employeeAmount: number,
  method: "One Time" | "Installments",
  opts: { targetMonth?: Date; count?: 2 | 3 | 4; startMonth?: Date }
): InstallmentPlanRow[] {
  if (method === "One Time") {
    const month = opts.targetMonth ?? new Date();
    return [{ installmentNo: 1, totalCount: 1, amount: round2(employeeAmount), month }];
  }
  const n = opts.count ?? 2;
  const start = opts.startMonth ?? new Date();
  const base = Math.floor((employeeAmount / n) * 100) / 100;
  const rows: InstallmentPlanRow[] = [];
  let allocated = 0;
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const amount = isLast ? round2(employeeAmount - allocated) : base;
    allocated += amount;
    const month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    rows.push({ installmentNo: i + 1, totalCount: n, amount, month });
  }
  return rows;
}

export type FineStatus = "Company Covered" | "Pending Employee Deduction" | "Partially Deducted" | "Fully Deducted";

export function deriveFineStatus(
  employeeAmount: number | null | undefined,
  installmentCount: number,
  totalCount: number
): FineStatus {
  if (!employeeAmount || employeeAmount <= 0) return "Company Covered";
  if (installmentCount === 0) return "Pending Employee Deduction";
  if (installmentCount < totalCount) return "Partially Deducted";
  return "Fully Deducted";
}

export async function getVehicleExpenseTotals(vehicleId: string): Promise<Record<string, number> & { grandTotal: number }> {
  const rows = await prisma.expense.groupBy({
    by: ["subcategory"],
    where: { vehicleId },
    _sum: { amount: true, refundedAmount: true },
  });
  const totals: Record<string, number> = {};
  let grandTotal = 0;
  for (const row of rows) {
    const key = row.subcategory ?? "Other";
    const net = (row._sum.amount ?? 0) - (row._sum.refundedAmount ?? 0);
    totals[key] = (totals[key] ?? 0) + net;
    grandTotal += net;
  }
  return { ...totals, grandTotal };
}

export type VehicleDocumentRow = { id: string; date: Date; description: string; attachmentUrl: string };

export async function getVehicleDocuments(vehicleId: string): Promise<{
  registrationDocUrl: string | null;
  insuranceDocUrl: string | null;
  byType: Record<string, VehicleDocumentRow[]>;
}> {
  const [vehicle, expenses] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { registrationDocUrl: true, insuranceDocUrl: true } }),
    prisma.expense.findMany({
      where: { vehicleId, attachmentUrl: { not: null } },
      orderBy: { date: "desc" },
      select: { id: true, date: true, description: true, subcategory: true, attachmentUrl: true },
    }),
  ]);
  const byType: Record<string, VehicleDocumentRow[]> = {};
  for (const exp of expenses) {
    const key = exp.subcategory ?? "Other";
    if (!byType[key]) byType[key] = [];
    byType[key].push({ id: exp.id, date: exp.date, description: exp.description, attachmentUrl: exp.attachmentUrl! });
  }
  return { registrationDocUrl: vehicle?.registrationDocUrl ?? null, insuranceDocUrl: vehicle?.insuranceDocUrl ?? null, byType };
}

export type VehicleAlert = {
  vehicleId: string;
  vehicleName: string;
  kind: "License Expiring" | "Insurance Expiring" | "Service Overdue";
  detail: string;
};

export async function getVehicleAlerts(): Promise<VehicleAlert[]> {
  const vehicles = await prisma.vehicle.findMany({ where: { status: "Active" } });
  const now = new Date();
  const alertCutoff = new Date(now.getTime() + EXPIRY_ALERT_DAYS * 24 * 60 * 60 * 1000);
  const alerts: VehicleAlert[] = [];
  for (const v of vehicles) {
    if (v.licenseExpiry && v.licenseExpiry <= alertCutoff) {
      alerts.push({
        vehicleId: v.id,
        vehicleName: v.name,
        kind: "License Expiring",
        detail: `License expires ${v.licenseExpiry.toISOString().slice(0, 10)}`,
      });
    }
    if (v.insuranceExpiry && v.insuranceExpiry <= alertCutoff) {
      alerts.push({
        vehicleId: v.id,
        vehicleName: v.name,
        kind: "Insurance Expiring",
        detail: `Insurance expires ${v.insuranceExpiry.toISOString().slice(0, 10)}`,
      });
    }
    const status = await getServiceDueStatus(v.id, v.initialOdometer);
    if (status === "Overdue") {
      const next = await getNextServiceDue(v.id);
      alerts.push({
        vehicleId: v.id,
        vehicleName: v.name,
        kind: "Service Overdue",
        detail: `Service was due at ${next?.nextServiceOdometer ?? "?"} km`,
      });
    }
  }
  return alerts;
}

export type VehicleExpenseReportFilters = { year?: number | null; month?: number | null; vehicleId?: string };

export async function computeVehicleExpenseReportSummary(filters: VehicleExpenseReportFilters) {
  const dateRange = buildDateRange(filters.year ?? null, filters.month ?? null);
  const where: Prisma.ExpenseWhereInput = {
    vehicleId: filters.vehicleId ? filters.vehicleId : { not: null },
    ...(dateRange ? { date: dateRange } : {}),
  };
  const rows = await prisma.expense.groupBy({
    by: ["subcategory"],
    where,
    _sum: { amount: true, refundedAmount: true },
  });
  const bySubcategory: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const key = row.subcategory ?? "Other";
    const net = (row._sum.amount ?? 0) - (row._sum.refundedAmount ?? 0);
    bySubcategory[key] = net;
    total += net;
  }
  return { bySubcategory, total };
}

export async function computeFineReportSummary(filters: { year?: number | null; month?: number | null }) {
  const dateRange = buildDateRange(filters.year ?? null, filters.month ?? null);
  const where: Prisma.ExpenseWhereInput = {
    subcategory: "Fine",
    ...(dateRange ? { date: dateRange } : {}),
  };
  const fines = await prisma.expense.findMany({
    where,
    include: { vehicleRef: { select: { name: true } }, responsibleEmployee: { select: { name: true } } },
  });
  const totalFines = fines.reduce((sum, f) => sum + f.amount, 0);
  const totalCompany = fines.reduce((sum, f) => sum + (f.companyAmount ?? f.amount), 0);
  const totalEmployee = fines.reduce((sum, f) => sum + (f.employeeAmount ?? 0), 0);

  const byVehicle: Record<string, number> = {};
  const byEmployee: Record<string, number> = {};
  for (const f of fines) {
    const vKey = f.vehicleRef?.name ?? "Unknown";
    byVehicle[vKey] = (byVehicle[vKey] ?? 0) + f.amount;
    if (f.responsibleEmployee) {
      const eKey = f.responsibleEmployee.name;
      byEmployee[eKey] = (byEmployee[eKey] ?? 0) + f.amount;
    }
  }

  const fineIds = fines.map((f) => f.id);
  const installmentAgg = fineIds.length
    ? await prisma.vehicleFineInstallment.aggregate({ _sum: { amount: true }, where: { expenseId: { in: fineIds } } })
    : { _sum: { amount: 0 } };
  const deducted = installmentAgg._sum.amount ?? 0;

  return { totalFines, totalCompany, totalEmployee, deducted, remaining: totalEmployee - deducted, byVehicle, byEmployee };
}

export async function computeMileageReportSummary() {
  const vehicles = await prisma.vehicle.findMany({ where: { status: "Active" } });
  return Promise.all(
    vehicles.map(async (v) => {
      const current = await getVehicleCurrentOdometer(v.id, v.initialOdometer);
      const next = await getNextServiceDue(v.id);
      return {
        vehicleId: v.id,
        vehicleName: v.name,
        currentOdometer: current,
        lastServiceOdometer: next?.lastServiceOdometer ?? null,
        nextServiceOdometer: next?.nextServiceOdometer ?? null,
      };
    })
  );
}

export async function computeFuelReportSummary(filters: { year?: number | null; month?: number | null }) {
  const dateRange = buildDateRange(filters.year ?? null, filters.month ?? null);
  const where: Prisma.ExpenseWhereInput = {
    subcategory: "Petrol / Fuel",
    ...(dateRange ? { date: dateRange } : {}),
  };
  const agg = await prisma.expense.aggregate({ _sum: { amount: true, liters: true }, where });
  const totalCost = agg._sum.amount ?? 0;
  const totalLiters = agg._sum.liters ?? 0;

  const vehicles = await prisma.vehicle.findMany({ where: { status: "Active" } });
  let totalKm = 0;
  let costOverKmRows = 0;
  for (const v of vehicles) {
    const history = await getFuelHistory(v.id);
    for (const r of history) {
      if (r.kmSincePrevious && r.kmSincePrevious > 0 && (!dateRange || (r.date >= dateRange.gte && r.date < dateRange.lt))) {
        totalKm += r.kmSincePrevious;
        costOverKmRows += r.amount;
      }
    }
  }

  return {
    totalCost,
    totalLiters,
    avgKmPerLiter: totalLiters > 0 && totalKm > 0 ? totalKm / totalLiters : null,
    avgCostPerKm: totalKm > 0 ? costOverKmRows / totalKm : null,
  };
}
