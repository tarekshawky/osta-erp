"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, hashPin } from "@/lib/session";
import { PRICE_MODIFICATION_LEVELS } from "@/lib/pricePermissions";

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
  hasWallet: boolean;
  joinDate: string;
  endOfServiceDate: string;
  sparePartPriceModification: string;
  sparePartMaxDiscountPercent: string;
  labourPriceModification: string;
  labourMaxDiscountPercent: string;
};

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

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
  if (!(PRICE_MODIFICATION_LEVELS as readonly string[]).includes(input.sparePartPriceModification)) {
    return "Invalid Spare Part Price Modification level.";
  }
  if (!(PRICE_MODIFICATION_LEVELS as readonly string[]).includes(input.labourPriceModification)) {
    return "Invalid Labour Price Modification level.";
  }
  if (input.sparePartPriceModification === "Allowed with Maximum Discount") {
    const pct = Number(input.sparePartMaxDiscountPercent);
    if (!(pct >= 0 && pct <= 100)) return "Enter a valid Spare Part Maximum Discount percentage (0-100).";
  }
  if (input.labourPriceModification === "Allowed with Maximum Discount") {
    const pct = Number(input.labourMaxDiscountPercent);
    if (!(pct >= 0 && pct <= 100)) return "Enter a valid Labour Maximum Discount percentage (0-100).";
  }
  return null;
}

function buildPricePermissionData(input: EmployeeFormInput) {
  return {
    sparePartPriceModification: input.sparePartPriceModification,
    sparePartMaxDiscountPercent:
      input.sparePartPriceModification === "Allowed with Maximum Discount" ? Number(input.sparePartMaxDiscountPercent) : null,
    labourPriceModification: input.labourPriceModification,
    labourMaxDiscountPercent:
      input.labourPriceModification === "Allowed with Maximum Discount" ? Number(input.labourMaxDiscountPercent) : null,
  };
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
      hasWallet: input.hasWallet,
      joinDate: parseDate(input.joinDate),
      endOfServiceDate: parseDate(input.endOfServiceDate),
      ...buildPricePermissionData(input),
    },
  });

  revalidatePath("/admin/employees");
  revalidatePath("/admin/wallets");
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
      hasWallet: input.hasWallet,
      joinDate: parseDate(input.joinDate),
      endOfServiceDate: parseDate(input.endOfServiceDate),
      ...buildPricePermissionData(input),
      ...(input.pin ? { pinHash: hashPin(input.pin) } : {}),
    },
  });

  revalidatePath("/admin/employees");
  revalidatePath("/admin/wallets");
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
