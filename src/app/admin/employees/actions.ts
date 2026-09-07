"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, hashPin } from "@/lib/session";
import { PRICE_MODIFICATION_LEVELS } from "@/lib/pricePermissions";
import { RECORD_ACCESS_LEVELS } from "@/lib/recordAccess";
import { ADMIN_SECTIONS } from "@/lib/adminSections";

// Returns the acting session's role -- "ADMIN" or "SUPER_ADMIN" -- so callers
// can tell the two apart for role-escalation / adminSections enforcement
// below. No extra DB read needed: the role already lives on the session.
async function requireAdmin(): Promise<"ADMIN" | "SUPER_ADMIN"> {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) redirect("/");
  return session.role;
}

export type EmployeeFormInput = {
  code: string;
  name: string;
  jobTitle: string;
  phone: string;
  teamName: string;
  role: "employee" | "admin" | "super_admin";
  pin: string;
  status: "active" | "inactive" | "suspended";
  custody: number;
  monthlySalary: number;
  hasWallet: boolean;
  invoicesAccess: string;
  expensesAccess: string;
  adminSections: string[];
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
  if (!(RECORD_ACCESS_LEVELS as readonly string[]).includes(input.invoicesAccess)) {
    return "Invalid Invoices Access level.";
  }
  if (!(RECORD_ACCESS_LEVELS as readonly string[]).includes(input.expensesAccess)) {
    return "Invalid Expenses Access level.";
  }
  const validSectionKeys = new Set(ADMIN_SECTIONS.map((s) => s.key));
  if (input.adminSections.some((key) => !validSectionKeys.has(key as (typeof ADMIN_SECTIONS)[number]["key"]))) {
    return "Invalid dashboard section selected.";
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

function resolveRole(role: EmployeeFormInput["role"]): "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN" {
  if (role === "super_admin") return "SUPER_ADMIN";
  if (role === "admin") return "ADMIN";
  return "EMPLOYEE";
}

export async function createEmployee(input: EmployeeFormInput): Promise<{ ok: boolean; error?: string }> {
  const actingRole = await requireAdmin();

  const error = validate(input, true);
  if (error) return { ok: false, error };

  // Only a Super Admin can grant Super Admin, and only a Super Admin can
  // hand out anything other than the default "sees everything" -- a plain
  // Admin editing this form can create other Admins, but never a more
  // powerful or more finely-scoped one than themselves.
  if (input.role === "super_admin" && actingRole !== "SUPER_ADMIN") {
    return { ok: false, error: "Only a Super Admin can grant Super Admin access." };
  }
  const adminSections = actingRole === "SUPER_ADMIN" && input.role === "admin" ? input.adminSections : [];

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
      role: resolveRole(input.role),
      pinHash: hashPin(input.pin),
      status: input.status,
      custody: Number.isFinite(input.custody) ? input.custody : 0,
      monthlySalary: Number.isFinite(input.monthlySalary) ? input.monthlySalary : 0,
      hasWallet: input.hasWallet,
      invoicesAccess: input.invoicesAccess,
      expensesAccess: input.expensesAccess,
      adminSections,
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
  const actingRole = await requireAdmin();

  const error = validate(input, false);
  if (error) return { ok: false, error };

  const target = await prisma.employee.findUnique({ where: { id }, select: { role: true, adminSections: true } });
  if (!target) return { ok: false, error: "Employee not found." };

  // Any change that promotes someone TO Super Admin, or demotes an existing
  // Super Admin AWAY from it, is Super Admin's call alone -- but editing an
  // existing Super Admin's other fields (name, phone, ...) without touching
  // their role must still work for a plain Admin, so this only fires when
  // the role is actually changing.
  const roleChanging = resolveRole(input.role) !== target.role;
  const involvesSuperAdmin = input.role === "super_admin" || target.role === "SUPER_ADMIN";
  if (roleChanging && involvesSuperAdmin && actingRole !== "SUPER_ADMIN") {
    return { ok: false, error: "Only a Super Admin can change Super Admin access." };
  }

  const team = await prisma.team.findUnique({ where: { name: input.teamName } });
  const existingCode = await prisma.employee.findFirst({ where: { code: input.code.trim(), NOT: { id } } });
  if (existingCode) return { ok: false, error: "An employee with this code already exists." };

  // A plain Admin editing another Admin's dashboard sections can't narrow or
  // widen them -- that's Super Admin's call alone -- so their submitted
  // value is ignored and the existing one carried forward untouched.
  const adminSections =
    input.role !== "admin" ? [] : actingRole === "SUPER_ADMIN" ? input.adminSections : target.adminSections;

  await prisma.employee.update({
    where: { id },
    data: {
      code: input.code.trim(),
      name: input.name.trim(),
      jobTitle: input.jobTitle.trim(),
      phone: input.phone.trim() || null,
      teamId: team?.id ?? null,
      role: resolveRole(input.role),
      status: input.status,
      custody: Number.isFinite(input.custody) ? input.custody : 0,
      monthlySalary: Number.isFinite(input.monthlySalary) ? input.monthlySalary : 0,
      hasWallet: input.hasWallet,
      invoicesAccess: input.invoicesAccess,
      expensesAccess: input.expensesAccess,
      adminSections,
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
