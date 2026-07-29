"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { PAYROLL_TYPES } from "@/lib/payrollData";

export type PayrollFormInput = {
  employeeId: string;
  type: string;
  amount: number;
  date: string;
  note: string;
};

function validate(input: PayrollFormInput) {
  if (!input.employeeId) return "Please select an employee.";
  if (!PAYROLL_TYPES.includes(input.type as (typeof PAYROLL_TYPES)[number])) {
    return "Please select a valid payroll type.";
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return "Enter a valid amount.";
  }
  return null;
}

export async function createPayrollEntry(input: PayrollFormInput): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireEmployee("ADMIN");

  const error = validate(input);
  if (error) return { ok: false, error };

  await prisma.payrollEntry.create({
    data: {
      employeeId: input.employeeId,
      type: input.type,
      amount: input.amount,
      date: new Date(input.date),
      note: input.note.trim() || null,
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/payroll");
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function updatePayrollEntry(
  id: string,
  input: PayrollFormInput
): Promise<{ ok: boolean; error?: string }> {
  await requireEmployee("ADMIN");

  const error = validate(input);
  if (error) return { ok: false, error };

  await prisma.payrollEntry.update({
    where: { id },
    data: {
      employeeId: input.employeeId,
      type: input.type,
      amount: input.amount,
      date: new Date(input.date),
      note: input.note.trim() || null,
    },
  });

  revalidatePath("/admin/payroll");
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function deletePayrollEntry(id: string) {
  await requireEmployee("ADMIN");
  await prisma.payrollEntry.delete({ where: { id } });
  revalidatePath("/admin/payroll");
  revalidatePath("/admin/reports");
}
