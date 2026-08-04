"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { getEmployeeFinancials } from "@/lib/walletData";

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

// Resets a wallet like a cash till: Custody, RevenueWithdrawn, and (via walletResetAt)
// Cash/Revenue/Expenses all go to 0. Nothing transfers to any other wallet — only
// invoices/expenses dated from this point forward count again, until the next collect.
export async function collectWallet(employeeId: string): Promise<{ ok: boolean; error?: string }> {
  await requireEmployee("ADMIN");

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { ok: false, error: "Employee not found." };

  await prisma.employee.update({
    where: { id: employeeId },
    data: { custody: 0, revenueWithdrawn: 0, walletResetAt: new Date() },
  });

  revalidatePath("/admin/wallets");
  revalidatePath("/admin/employees");
  revalidatePath("/employee");
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

  const { revenue, expenses } = await getEmployeeFinancials(employeeId, employee.walletResetAt);
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
