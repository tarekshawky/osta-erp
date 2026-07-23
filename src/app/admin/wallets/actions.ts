"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";

export async function addCustody(
  employeeId: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  await requireEmployee("ADMIN");

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { custody: { increment: amount } },
  });

  revalidatePath("/admin/wallets");
  return { ok: true };
}

export async function withdrawCustody(
  employeeId: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  await requireEmployee("ADMIN");

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { ok: false, error: "Employee not found." };
  if (amount > employee.custody) {
    return { ok: false, error: `Only AED ${employee.custody.toFixed(2)} available to withdraw.` };
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { custody: { decrement: amount } },
  });

  revalidatePath("/admin/wallets");
  return { ok: true };
}

export async function withdrawRevenue(
  employeeId: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireEmployee("ADMIN");

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { ok: false, error: "Employee not found." };

  const [revenueAgg, expenseAgg] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { createdById: employeeId, status: "Paid" },
    }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { createdById: employeeId } }),
  ]);

  const revenue = revenueAgg._sum.amount ?? 0;
  const expenses = expenseAgg._sum.amount ?? 0;
  const available = revenue - expenses - employee.revenueWithdrawn;

  if (amount > available + 0.001) {
    return { ok: false, error: `Only AED ${Math.max(available, 0).toFixed(2)} available to withdraw.` };
  }

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employeeId },
      data: { revenueWithdrawn: { increment: amount } },
    }),
    prisma.employee.update({
      where: { id: admin.id },
      data: { custody: { increment: amount } },
    }),
  ]);

  revalidatePath("/admin/wallets");
  return { ok: true };
}
