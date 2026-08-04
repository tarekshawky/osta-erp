"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";

export async function updateMyPhoto(dataUrl: string): Promise<{ ok: boolean; error?: string }> {
  const employee = await requireEmployee("EMPLOYEE");
  if (!dataUrl.startsWith("data:image/")) return { ok: false, error: "Invalid image." };

  await prisma.employee.update({
    where: { id: employee.id },
    data: { photoData: dataUrl },
  });

  revalidatePath("/employee/profile");
  revalidatePath("/employee");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/employees");
  return { ok: true };
}

export async function removeMyPhoto(): Promise<{ ok: boolean; error?: string }> {
  const employee = await requireEmployee("EMPLOYEE");

  await prisma.employee.update({
    where: { id: employee.id },
    data: { photoData: null },
  });

  revalidatePath("/employee/profile");
  revalidatePath("/employee");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/employees");
  return { ok: true };
}
