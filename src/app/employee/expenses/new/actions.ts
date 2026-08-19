"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { findDuplicateExpense } from "@/lib/expenseDuplicate";
import {
  ADVERTISING_PLATFORMS,
  EXPENSE_PAYMENT_METHODS,
  canonicalExpensePayment,
  generateExpenseNumber,
} from "@/lib/expenseData";
import { VEHICLE_EXPENSE_TYPES, getVehicleCurrentOdometer, checkOdometerReading } from "@/lib/vehicleData";

export async function createExpense(
  formData: FormData
): Promise<{ ok: boolean; error?: string; requiresOverride?: boolean } | void> {
  const employee = await requireEmployee("EMPLOYEE");

  const description = String(formData.get("description") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const vehicleIdInput = String(formData.get("vehicleId") ?? "").trim();
  const subcategoryInput = String(formData.get("subcategory") ?? "").trim();
  const odometerInput = String(formData.get("odometer") ?? "").trim();
  const detailTypeInput = String(formData.get("detailType") ?? "").trim();
  const litersInput = String(formData.get("liters") ?? "").trim();
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

  const subcategory =
    category === "Vehicle"
      ? VEHICLE_EXPENSE_TYPES.includes(subcategoryInput as (typeof VEHICLE_EXPENSE_TYPES)[number]) && subcategoryInput !== "Fine"
        ? subcategoryInput
        : null
      : category === "Advertising"
        ? ADVERTISING_PLATFORMS.includes(subcategoryInput as (typeof ADVERTISING_PLATFORMS)[number])
          ? subcategoryInput
          : null
        : null;

  let vehicleId: string | null = null;
  let odometer: number | null = null;
  let detailType: string | null = null;
  let liters: number | null = null;
  if (category === "Vehicle") {
    if (!vehicleIdInput) redirect("/employee/expenses/new?error=1");
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleIdInput } });
    if (!vehicle || vehicle.status !== "Active") redirect("/employee/expenses/new?error=1");
    vehicleId = vehicle.id;

    odometer = odometerInput ? Number(odometerInput) : null;
    if (!odometer || odometer <= 0) redirect("/employee/expenses/new?error=1");

    const current = await getVehicleCurrentOdometer(vehicleId, vehicle.initialOdometer);
    const overrideMileage = formData.get("overrideMileage") === "1";
    if (checkOdometerReading(odometer, current) === "below-current" && !overrideMileage) {
      return {
        ok: false,
        error: `Odometer reading is lower than the last recorded ${current.toLocaleString()} KM.`,
        requiresOverride: true,
      };
    }

    detailType = detailTypeInput || null;
    liters = subcategory === "Petrol / Fuel" && litersInput ? Number(litersInput) : null;
  }

  const date = dateStr ? new Date(dateStr) : new Date();
  const duplicate = await findDuplicateExpense({
    date,
    description,
    category: category || null,
    vehicleId,
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
        vehicleId,
        subcategory,
        odometer,
        detailType,
        liters,
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
  if (vehicleId) revalidatePath(`/admin/vehicles/${vehicleId}`);
  redirect("/employee/expenses?toast=1");
}
