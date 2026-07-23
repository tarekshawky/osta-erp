"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";

export type ExpenseFormInput = {
  category: string;
  payment: string;
  amount: number;
  date: string;
  description: string;
};

export async function createExpense(input: ExpenseFormInput): Promise<{ ok: boolean; error?: string }> {
  const employee = await requireEmployee("ADMIN");

  if (!input.description.trim() || !Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Please fill in a description and a valid amount." };
  }

  await prisma.expense.create({
    data: {
      date: new Date(input.date),
      description: input.description.trim(),
      category: input.category,
      payment: input.payment,
      amount: input.amount,
      teamId: employee.teamId,
      createdById: employee.id,
    },
  });

  revalidatePath("/admin/expenses");
  return { ok: true };
}

export async function updateExpense(
  id: string,
  input: ExpenseFormInput
): Promise<{ ok: boolean; error?: string }> {
  await requireEmployee("ADMIN");

  if (!input.description.trim() || !Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Please fill in a description and a valid amount." };
  }

  await prisma.expense.update({
    where: { id },
    data: {
      date: new Date(input.date),
      description: input.description.trim(),
      category: input.category,
      payment: input.payment,
      amount: input.amount,
    },
  });

  revalidatePath("/admin/expenses");
  return { ok: true };
}

export async function deleteExpense(id: string) {
  await requireEmployee("ADMIN");
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/admin/expenses");
}

export async function refundExpense(
  id: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  await requireEmployee("ADMIN");

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return { ok: false, error: "Expense not found." };

  const remaining = expense.amount - expense.refundedAmount;
  if (amount <= 0 || amount > remaining + 0.001) {
    return { ok: false, error: `Enter an amount up to AED ${remaining.toFixed(2)}.` };
  }

  const refundedAmount = Math.min(expense.amount, expense.refundedAmount + amount);
  const status = refundedAmount >= expense.amount - 0.001 ? "Refunded" : "Partially Refunded";

  await prisma.expense.update({
    where: { id },
    data: { refundedAmount, status },
  });

  revalidatePath("/admin/expenses");
  return { ok: true };
}
