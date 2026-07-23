"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
}

export async function addCustody(
  employeeId: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

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
  await requireAdmin();

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
