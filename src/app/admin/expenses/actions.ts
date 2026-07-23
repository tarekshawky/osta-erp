"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { parseWorkbookRows, type ImportResult } from "@/lib/excel";
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from "@/lib/expenseData";

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

export async function importExpensesFromExcel(formData: FormData): Promise<ImportResult> {
  const admin = await requireEmployee("ADMIN");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, created: 0, errors: [{ row: 0, message: "No file uploaded." }] };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = await parseWorkbookRows(buffer);

  if (rows.length === 0) {
    return { ok: false, created: 0, errors: [{ row: 0, message: "The file has no data rows." }] };
  }

  let created = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const description = row["Description"]?.trim();
    const amount = Number(row["Amount"]);

    if (!description) {
      errors.push({ row: rowNum, message: "Missing Description." });
      continue;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ row: rowNum, message: "Missing or invalid Amount." });
      continue;
    }

    const category = EXPENSE_CATEGORIES.includes(row["Category"] as (typeof EXPENSE_CATEGORIES)[number])
      ? row["Category"]
      : "Other";
    const payment = EXPENSE_PAYMENT_METHODS.includes(row["Payment"] as (typeof EXPENSE_PAYMENT_METHODS)[number])
      ? row["Payment"]
      : "Cash";
    const date = row["Date"] && !Number.isNaN(Date.parse(row["Date"])) ? new Date(row["Date"]) : new Date();

    try {
      await prisma.expense.create({
        data: {
          date,
          description,
          category,
          payment,
          amount,
          teamId: admin.teamId,
          createdById: admin.id,
        },
      });
      created++;
    } catch {
      errors.push({ row: rowNum, message: "Could not create this expense." });
    }
  }

  revalidatePath("/admin/expenses");
  return { ok: true, created, errors };
}
