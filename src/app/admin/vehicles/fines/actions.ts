"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { resolveCreditCard } from "@/app/admin/expenses/actions";
import { generateExpenseNumber } from "@/lib/expenseData";
import { getVehicleCurrentOdometer, checkOdometerReading, computeFineSplit, buildInstallmentPlan } from "@/lib/vehicleData";

export type VehicleFineFormInput = {
  vehicleId: string;
  responsibleEmployeeId: string;
  fineType: string;
  fineNumber: string;
  date: string;
  odometer: number | null;
  overrideMileage?: boolean;
  amount: number;
  contributionType: "Percentage" | "Fixed" | "";
  contributionValue: number | null;
  deductionMethod: "One Time" | "Installments" | "";
  installmentCount: 2 | 3 | 4 | null;
  startMonth: string; // "YYYY-MM"
  attachmentUrl: string | null;
  notes: string;
  payment: string;
  creditCardId: string | null;
};

export type VehicleFineActionResult = { ok: boolean; error?: string; requiresOverride?: boolean; expenseId?: string };

function parseMonth(value: string): Date {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return new Date(Date.UTC(y, m - 1, 1));
}

// Atomic: Expense (full fine amount) + N PayrollEntry Deduction rows + N
// VehicleFineInstallment rows, created upfront per the confirmed design --
// Payroll never needs a separate step, and this is what structurally
// guarantees the employee's share is never recorded as a second Expense.
export async function createVehicleFine(input: VehicleFineFormInput): Promise<VehicleFineActionResult> {
  const admin = await requireEmployee("ADMIN");

  if (!input.vehicleId) return { ok: false, error: "Select a vehicle." };
  if (!input.responsibleEmployeeId) return { ok: false, error: "Select the responsible employee." };
  if (!input.fineType) return { ok: false, error: "Select a fine type." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { ok: false, error: "Enter a valid fine amount." };
  if (!input.odometer || input.odometer <= 0) return { ok: false, error: "Enter the odometer reading." };

  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) return { ok: false, error: "Vehicle not found." };

  const employee = await prisma.employee.findUnique({ where: { id: input.responsibleEmployeeId } });
  if (!employee) return { ok: false, error: "Employee not found." };

  const current = await getVehicleCurrentOdometer(input.vehicleId, vehicle.initialOdometer);
  if (checkOdometerReading(input.odometer, current) === "below-current" && !input.overrideMileage) {
    return {
      ok: false,
      error: `Odometer reading is lower than the last recorded ${current.toLocaleString()} KM.`,
      requiresOverride: true,
    };
  }

  const cardResult = await resolveCreditCard(input.payment, input.creditCardId);
  if (!cardResult.ok) return { ok: false, error: cardResult.error };
  const { creditCardId } = cardResult;

  const { companyAmount, employeeAmount } = computeFineSplit(
    input.amount,
    input.contributionType || null,
    input.contributionValue
  );

  let installments: { installmentNo: number; totalCount: number; amount: number; month: Date }[] = [];
  if (employeeAmount > 0) {
    if (!input.deductionMethod) return { ok: false, error: "Select a deduction method." };
    const startMonth = parseMonth(input.startMonth);
    if (input.deductionMethod === "One Time") {
      installments = buildInstallmentPlan(employeeAmount, "One Time", { targetMonth: startMonth });
    } else {
      if (!input.installmentCount) return { ok: false, error: "Select the number of installments." };
      installments = buildInstallmentPlan(employeeAmount, "Installments", { count: input.installmentCount, startMonth });
    }
  }

  const number = await generateExpenseNumber();
  const date = new Date(input.date);

  const expenseId = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        number,
        date,
        description: input.fineNumber.trim() ? `${input.fineType} Fine (${input.fineNumber.trim()})` : `${input.fineType} Fine`,
        category: "Vehicle",
        subcategory: "Fine",
        vehicleId: vehicle.id,
        odometer: input.odometer,
        detailType: input.fineType,
        responsibleEmployeeId: employee.id,
        referenceNumber: input.fineNumber.trim() || null,
        amount: input.amount,
        companyAmount,
        employeeAmount,
        attachmentUrl: input.attachmentUrl || null,
        notes: input.notes.trim() || null,
        payment: input.payment,
        creditCardId,
        teamId: employee.teamId,
        createdById: admin.id,
      },
    });

    for (const installment of installments) {
      const payrollEntry = await tx.payrollEntry.create({
        data: {
          employeeId: employee.id,
          type: "Deduction",
          amount: installment.amount,
          date: installment.month,
          note: `Fine deduction ${installment.installmentNo}/${installment.totalCount} — ${expense.number ?? expense.id}`,
          createdById: admin.id,
        },
      });
      await tx.vehicleFineInstallment.create({
        data: {
          expenseId: expense.id,
          installmentNo: installment.installmentNo,
          totalCount: installment.totalCount,
          amount: installment.amount,
          month: installment.month,
          payrollEntryId: payrollEntry.id,
        },
      });
    }

    if (creditCardId) {
      await tx.creditCardAuditLog.create({
        data: {
          creditCardId,
          action: "Expense Added",
          description: `Fine ${expense.number ?? expense.id} "${expense.description}" added — AED ${expense.amount.toFixed(2)}`,
          newValue: expense.amount.toFixed(2),
          performedById: admin.id,
        },
      });
    }

    return expense.id;
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/payroll");
  revalidatePath("/admin/reports");
  revalidatePath(`/admin/vehicles/${vehicle.id}`);
  if (creditCardId) revalidatePath(`/admin/wallets/credit-cards/${creditCardId}`);

  return { ok: true, expenseId };
}
