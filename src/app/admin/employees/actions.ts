"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, hashPin } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
}

export type EmployeeFormInput = {
  code: string;
  name: string;
  jobTitle: string;
  phone: string;
  teamName: string;
  role: "employee" | "admin";
  pin: string;
  status: "active" | "inactive" | "suspended";
  custody: number;
  monthlySalary: number;
};

function validate(input: EmployeeFormInput, isCreate: boolean) {
  if (!input.code.trim() || !input.name.trim()) {
    return "Employee code and full name are required.";
  }
  if (isCreate && !/^\d{4}$/.test(input.pin)) {
    return "PIN code must be exactly 4 digits.";
  }
  if (input.pin && !/^\d{4}$/.test(input.pin)) {
    return "PIN code must be exactly 4 digits.";
  }
  return null;
}

export async function createEmployee(input: EmployeeFormInput): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const error = validate(input, true);
  if (error) return { ok: false, error };

  const team = await prisma.team.findUnique({ where: { name: input.teamName } });
  const existingCode = await prisma.employee.findUnique({ where: { code: input.code.trim() } });
  if (existingCode) return { ok: false, error: "An employee with this code already exists." };

  await prisma.employee.create({
    data: {
      code: input.code.trim(),
      name: input.name.trim(),
      jobTitle: input.jobTitle.trim(),
      phone: input.phone.trim() || null,
      teamId: team?.id ?? null,
      role: input.role === "admin" ? "ADMIN" : "EMPLOYEE",
      pinHash: hashPin(input.pin),
      status: input.status,
      custody: Number.isFinite(input.custody) ? input.custody : 0,
      monthlySalary: Number.isFinite(input.monthlySalary) ? input.monthlySalary : 0,
    },
  });

  revalidatePath("/admin/employees");
  return { ok: true };
}

export async function updateEmployee(
  id: string,
  input: EmployeeFormInput
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const error = validate(input, false);
  if (error) return { ok: false, error };

  const team = await prisma.team.findUnique({ where: { name: input.teamName } });
  const existingCode = await prisma.employee.findFirst({ where: { code: input.code.trim(), NOT: { id } } });
  if (existingCode) return { ok: false, error: "An employee with this code already exists." };

  await prisma.employee.update({
    where: { id },
    data: {
      code: input.code.trim(),
      name: input.name.trim(),
      jobTitle: input.jobTitle.trim(),
      phone: input.phone.trim() || null,
      teamId: team?.id ?? null,
      role: input.role === "admin" ? "ADMIN" : "EMPLOYEE",
      status: input.status,
      custody: Number.isFinite(input.custody) ? input.custody : 0,
      monthlySalary: Number.isFinite(input.monthlySalary) ? input.monthlySalary : 0,
      ...(input.pin ? { pinHash: hashPin(input.pin) } : {}),
    },
  });

  revalidatePath("/admin/employees");
  return { ok: true };
}

export async function deleteEmployee(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const [invoiceCount, expenseCount] = await Promise.all([
    prisma.invoice.count({ where: { createdById: id } }),
    prisma.expense.count({ where: { createdById: id } }),
  ]);
  if (invoiceCount > 0 || expenseCount > 0) {
    return { ok: false, error: "Can't delete an employee with existing invoices or expenses." };
  }

  await prisma.employee.delete({ where: { id } });
  revalidatePath("/admin/employees");
  return { ok: true };
}
