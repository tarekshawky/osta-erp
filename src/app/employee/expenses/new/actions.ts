"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function createExpense(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/");

  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: session.employeeId } });

  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const dateStr = String(formData.get("date") ?? "");

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    redirect("/employee/expenses/new?error=1");
  }

  await prisma.expense.create({
    data: {
      date: dateStr ? new Date(dateStr) : new Date(),
      description,
      category: category || null,
      amount,
      teamId: employee.teamId,
      createdById: employee.id,
    },
  });

  redirect("/employee/expenses");
}
