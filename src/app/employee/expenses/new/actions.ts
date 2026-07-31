"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { VEHICLES, VEHICLE_EXPENSE_TYPES, ADVERTISING_PLATFORMS } from "@/lib/expenseData";

export async function createExpense(formData: FormData) {
  const employee = await requireEmployee("EMPLOYEE");

  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const vehicleInput = String(formData.get("vehicle") ?? "").trim();
  const subcategoryInput = String(formData.get("subcategory") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const dateStr = String(formData.get("date") ?? "");

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    redirect("/employee/expenses/new?error=1");
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

  await prisma.expense.create({
    data: {
      date: dateStr ? new Date(dateStr) : new Date(),
      description,
      category: category || null,
      vehicle,
      subcategory,
      amount,
      teamId: employee.teamId,
      createdById: employee.id,
    },
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/marketing");
  revalidatePath("/admin");
  revalidatePath("/employee");
  redirect("/employee/expenses?toast=1");
}
