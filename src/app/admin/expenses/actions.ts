"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { parseWorkbookRows, type ImportResult } from "@/lib/excel";
import { findDuplicateExpense } from "@/lib/expenseDuplicate";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  VEHICLES,
  VEHICLE_EXPENSE_TYPES,
  ADVERTISING_PLATFORMS,
  canonicalExpensePayment,
  generateExpenseNumber,
} from "@/lib/expenseData";

export type ExpenseFormInput = {
  category: string;
  vehicle: string;
  subcategory: string;
  payment: string;
  amount: number;
  date: string;
  description: string;
  notes?: string | null;
  attachmentUrl?: string | null;
  vendor?: string | null;
  referenceNumber?: string | null;
  creditCardId?: string | null;
};

// Returns the card id to persist (or an error) for a payment method that resolves
// to "Credit Card" -- a card must be selected and Active, otherwise wallet totals
// would drift from what the admin sees on screen.
async function resolveCreditCard(
  payment: string,
  creditCardId: string | null | undefined
): Promise<{ ok: true; creditCardId: string | null } | { ok: false; error: string }> {
  if (canonicalExpensePayment(payment) !== "Credit Card") return { ok: true, creditCardId: null };
  if (!creditCardId) return { ok: false, error: "Select a credit card." };
  const card = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
  if (!card || card.status !== "Active") return { ok: false, error: "Select an active credit card." };
  return { ok: true, creditCardId: card.id };
}

function resolveVehicleAndSubcategory(input: Pick<ExpenseFormInput, "category" | "vehicle" | "subcategory">) {
  if (input.category === "Vehicle") {
    return { vehicle: input.vehicle || null, subcategory: input.subcategory || null };
  }
  if (input.category === "Advertising") {
    return { vehicle: null, subcategory: input.subcategory || null };
  }
  return { vehicle: null, subcategory: null };
}

export async function createExpense(input: ExpenseFormInput): Promise<{ ok: boolean; error?: string }> {
  const employee = await requireEmployee("ADMIN");

  if (!input.description.trim() || !Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Please fill in a shop name and a valid amount." };
  }

  const cardResult = await resolveCreditCard(input.payment, input.creditCardId);
  if (!cardResult.ok) return { ok: false, error: cardResult.error };
  const { creditCardId } = cardResult;

  const date = new Date(input.date);
  const details = resolveVehicleAndSubcategory(input);
  const duplicate = await findDuplicateExpense({
    date,
    description: input.description,
    category: input.category,
    ...details,
    payment: input.payment,
    amount: input.amount,
    createdById: employee.id,
    creditCardId,
  });
  if (duplicate) {
    return { ok: false, error: "This identical expense has already been recorded for this date." };
  }

  const number = await generateExpenseNumber();

  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        number,
        date,
        description: input.description.trim(),
        notes: input.notes?.trim() || null,
        category: input.category,
        ...details,
        payment: input.payment,
        amount: input.amount,
        attachmentUrl: input.attachmentUrl || null,
        vendor: input.vendor?.trim() || null,
        referenceNumber: input.referenceNumber?.trim() || null,
        creditCardId,
        teamId: employee.teamId,
        createdById: employee.id,
      },
    });
    if (creditCardId) {
      await tx.creditCardAuditLog.create({
        data: {
          creditCardId,
          action: "Expense Added",
          description: `Expense ${expense.number ?? expense.id} "${expense.description}" added — AED ${expense.amount.toFixed(2)}`,
          newValue: expense.amount.toFixed(2),
          performedById: employee.id,
        },
      });
    }
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/marketing");
  if (creditCardId) revalidatePath(`/admin/wallets/credit-cards/${creditCardId}`);
  return { ok: true };
}

export async function updateExpense(
  id: string,
  input: ExpenseFormInput
): Promise<{ ok: boolean; error?: string }> {
  const employee = await requireEmployee("ADMIN");

  if (!input.description.trim() || !Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Please fill in a shop name and a valid amount." };
  }

  const cardResult = await resolveCreditCard(input.payment, input.creditCardId);
  if (!cardResult.ok) return { ok: false, error: cardResult.error };
  const { creditCardId } = cardResult;

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Expense not found." };

  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.update({
      where: { id },
      data: {
        date: new Date(input.date),
        description: input.description.trim(),
        notes: input.notes?.trim() || null,
        category: input.category,
        ...resolveVehicleAndSubcategory(input),
        payment: input.payment,
        amount: input.amount,
        attachmentUrl: input.attachmentUrl || null,
        vendor: input.vendor?.trim() || null,
        referenceNumber: input.referenceNumber?.trim() || null,
        creditCardId,
      },
    });
    if (creditCardId) {
      await tx.creditCardAuditLog.create({
        data: {
          creditCardId,
          action: "Expense Updated",
          description: `Expense ${expense.number ?? expense.id} "${expense.description}" updated — AED ${expense.amount.toFixed(2)}`,
          oldValue: existing.amount.toFixed(2),
          newValue: expense.amount.toFixed(2),
          performedById: employee.id,
        },
      });
    }
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/marketing");
  if (existing.creditCardId) revalidatePath(`/admin/wallets/credit-cards/${existing.creditCardId}`);
  if (creditCardId && creditCardId !== existing.creditCardId) revalidatePath(`/admin/wallets/credit-cards/${creditCardId}`);
  return { ok: true };
}

export async function deleteExpense(id: string) {
  await requireEmployee("ADMIN");
  const expense = await prisma.expense.delete({ where: { id } });
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/marketing");
  if (expense.creditCardId) revalidatePath(`/admin/wallets/credit-cards/${expense.creditCardId}`);
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
  revalidatePath("/admin/marketing");
  if (expense.creditCardId) revalidatePath(`/admin/wallets/credit-cards/${expense.creditCardId}`);
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

    const shopName = row["Shop Name"]?.trim() || row["Description"]?.trim();
    const notes = row["Shop Name"] ? row["Description"]?.trim() || null : null;
    const amount = Number(row["Amount"]);

    if (!shopName) {
      errors.push({ row: rowNum, message: "Missing Shop Name." });
      continue;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ row: rowNum, message: "Missing or invalid Amount." });
      continue;
    }

    const category = EXPENSE_CATEGORIES.includes(row["Category"] as (typeof EXPENSE_CATEGORIES)[number])
      ? row["Category"]
      : "Other";
    // Bulk import has no way to pick a specific card, so "Credit Card" (which
    // requires a linked CreditCard) is never accepted here -- falls back to Cash.
    const payment =
      EXPENSE_PAYMENT_METHODS.includes(row["Payment"] as (typeof EXPENSE_PAYMENT_METHODS)[number]) &&
      row["Payment"] !== "Credit Card"
        ? row["Payment"]
        : "Cash";
    const date = row["Date"] && !Number.isNaN(Date.parse(row["Date"])) ? new Date(row["Date"]) : new Date();

    const vehicle =
      category === "Vehicle" && VEHICLES.includes(row["Vehicle"] as (typeof VEHICLES)[number])
        ? row["Vehicle"]
        : null;
    const subcategory =
      category === "Vehicle"
        ? VEHICLE_EXPENSE_TYPES.includes(row["Subcategory"] as (typeof VEHICLE_EXPENSE_TYPES)[number])
          ? row["Subcategory"]
          : null
        : category === "Advertising"
          ? ADVERTISING_PLATFORMS.includes(row["Subcategory"] as (typeof ADVERTISING_PLATFORMS)[number])
            ? row["Subcategory"]
            : null
          : null;

    try {
      await prisma.expense.create({
        data: {
          date,
          description: shopName,
          notes,
          category,
          vehicle,
          subcategory,
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
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/marketing");
  return { ok: true, created, errors };
}
