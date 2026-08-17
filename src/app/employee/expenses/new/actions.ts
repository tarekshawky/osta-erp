"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { findDuplicateExpense } from "@/lib/expenseDuplicate";
import {
  VEHICLES,
  VEHICLE_EXPENSE_TYPES,
  ADVERTISING_PLATFORMS,
  EXPENSE_PAYMENT_METHODS,
  canonicalExpensePayment,
  generateExpenseNumber,
} from "@/lib/expenseData";

export async function createExpense(formData: FormData) {
  const employee = await requireEmployee("EMPLOYEE");

  const description = String(formData.get("description") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const vehicleInput = String(formData.get("vehicle") ?? "").trim();
  const subcategoryInput = String(formData.get("subcategory") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const dateStr = String(formData.get("date") ?? "");
  const vendor = String(formData.get("vendor") ?? "").trim();
  const referenceNumber = String(formData.get("referenceNumber") ?? "").trim();
  const paymentInput = String(formData.get("payment") ?? "Cash").trim();
  const creditCardIdInput = String(formData.get("creditCardId") ?? "").trim();

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    redirect("/employee/expenses/new?error=1");
  }

  const payment = EXPENSE_PAYMENT_METHODS.includes(paymentInput as (typeof EXPENSE_PAYMENT_METHODS)[number])
    ? paymentInput
    : "Cash";

  let creditCardId: string | null = null;
  if (canonicalExpensePayment(payment) === "Credit Card") {
    if (!creditCardIdInput) redirect("/employee/expenses/new?error=1");
    const card = await prisma.creditCard.findUnique({ where: { id: creditCardIdInput } });
    if (!card || card.status !== "Active") redirect("/employee/expenses/new?error=1");
    creditCardId = creditCardIdInput;
  }

  const vehicle =
    category === "Vehicle" && VEHICLES.includes(vehicleInput as (typeof VEHICLES)[number]) ? vehicleInput : null;
  const subcategory =
    category === "Vehicle"
      ? VEHICLE_EXPENSE_TYPES.includes(subcategoryInput as (typeof VEHICLE_EXPENSE_TYPES)[number])
        ? subcategoryInput
        : null
      : category === "Advertising"
        ? ADVERTISING_PLATFORMS.includes(subcategoryInput as (typeof ADVERTISING_PLATFORMS)[number])
          ? subcategoryInput
          : null
        : null;

  const date = dateStr ? new Date(dateStr) : new Date();
  const duplicate = await findDuplicateExpense({
    date,
    description,
    category: category || null,
    vehicle,
    subcategory,
    payment,
    amount,
    createdById: employee.id,
    creditCardId,
  });
  if (duplicate) {
    redirect("/employee/expenses/new?error=duplicate");
  }

  const number = await generateExpenseNumber();

  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        number,
        date,
        description,
        notes: notes || null,
        category: category || null,
        vehicle,
        subcategory,
        payment,
        amount,
        vendor: vendor || null,
        referenceNumber: referenceNumber || null,
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
  revalidatePath("/admin");
  revalidatePath("/employee");
  if (creditCardId) revalidatePath(`/admin/wallets/credit-cards/${creditCardId}`);
  redirect("/employee/expenses?toast=1");
}
