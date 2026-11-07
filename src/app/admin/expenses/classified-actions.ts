"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { writeAudit } from "@/lib/adminGuard";
import { EXPENSE_PAYMENT_METHODS, generateExpenseNumber } from "@/lib/expenseData";
import { EMIRATES } from "@/lib/performanceData";
import { EMPLOYEE_KINDS, RENTAL_KINDS, dailyWorkerTotal, inclusiveDays, type RentalGroup } from "@/lib/expenseClasses";
import { resolveCreditCard } from "./actions";

// Records an employee expense (daily worker, temporary labour, overtime, housing, transport, bonus, other) or a rental
// (equipment, transport vehicle) as a classified expense. The amount of a daily worker or a transport rental is always
// worked out here from days x rate, never trusted from the browser. Salaries and advances are not accepted: they belong to
// Payroll and entering them here too would count them twice.
export type ClassifiedExpenseInput = {
  group: "employee" | RentalGroup;
  kind: string;
  date: string;
  payment: string;
  creditCardId?: string | null;
  teamId?: string | null;
  emirate?: string | null;
  description?: string;
  notes?: string | null;
  attachmentUrl?: string | null;
  amount?: number;
  employeeId?: string | null;
  // daily worker
  workerName?: string;
  workerPhone?: string;
  days?: number;
  dailyRate?: number;
  // rentals
  equipmentName?: string;
  supplier?: string;
  startDate?: string;
  endDate?: string;
  invoiceNumber?: string;
  vehicleType?: string;
};

const isDay = (v: string | undefined) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)));
const aed = (n: number) => `AED ${n.toFixed(2)}`;

export async function createClassifiedExpense(input: ClassifiedExpenseInput): Promise<{ ok: boolean; error?: string; id?: string }> {
  const admin = await requireEmployee("ADMIN");

  if (!isDay(input.date)) return { ok: false, error: "Choose the date." };
  if (!(EXPENSE_PAYMENT_METHODS as readonly string[]).includes(input.payment)) return { ok: false, error: "Choose the payment method." };
  if (input.emirate && !(EMIRATES as readonly string[]).includes(input.emirate)) return { ok: false, error: "Choose a valid emirate." };
  const card = await resolveCreditCard(input.payment, input.creditCardId);
  if (!card.ok) return { ok: false, error: card.error };
  if (input.teamId && !(await prisma.team.findUnique({ where: { id: input.teamId }, select: { id: true } }))) return { ok: false, error: "Team not found." };

  let expenseClass: "EMPLOYEE" | "COMPANY";
  let kind: string;
  let category: string;
  let amount = 0;
  let description = (input.description ?? "").trim();
  let vendor: string | null = null;
  let reference: string | null = null;
  let date = input.date;
  const details: Record<string, unknown> = {};
  const need = (cond: boolean, msg: string) => (cond ? null : msg);
  let problem: string | null = null;

  if (input.group === "employee") {
    expenseClass = "EMPLOYEE";
    const def = EMPLOYEE_KINDS.find((k) => k.kind === input.kind);
    if (!def) return { ok: false, error: "Choose the type of employee expense." };
    if (def.viaPayroll) return { ok: false, error: `${def.kind} is recorded in Payroll, so it is not entered here (it would be counted twice).` };
    kind = def.kind;
    category = def.category!;
    if (kind === "Daily Worker") {
      const days = Number(input.days);
      const rate = Number(input.dailyRate);
      problem =
        need(Boolean(input.workerName?.trim()), "Enter the worker's name.") ||
        need(days > 0, "Enter the number of working days.") ||
        need(rate > 0, "Enter the daily rate.") ||
        need(Boolean(input.teamId), "Choose the team.") ||
        need(Boolean(input.emirate), "Choose the emirate.") ||
        need(Boolean(input.description?.trim()), "Describe the work.");
      amount = dailyWorkerTotal(days, rate);
      vendor = input.workerName?.trim() || null;
      description = `Daily Worker — ${input.workerName?.trim()} (${days} day${days === 1 ? "" : "s"} × ${aed(rate)}): ${description}`;
      Object.assign(details, { workerName: input.workerName?.trim(), workerPhone: input.workerPhone?.trim() || null, workDate: input.date, days, dailyRate: rate, total: amount, work: input.description?.trim() });
    } else {
      amount = Number(input.amount);
      problem = need(amount > 0, "Enter the amount.") || need(Boolean(description), "Write a short description.");
      if (input.employeeId) {
        const emp = await prisma.employee.findUnique({ where: { id: input.employeeId }, select: { id: true, name: true } });
        if (!emp) return { ok: false, error: "Employee not found." };
        details.employeeId = emp.id;
        details.employeeName = emp.name;
        vendor = emp.name;
        description = `${kind} — ${emp.name}: ${description}`;
      } else if (input.workerName?.trim()) {
        details.workerName = input.workerName.trim();
        vendor = input.workerName.trim();
        description = `${kind} — ${input.workerName.trim()}: ${description}`;
      } else {
        description = `${kind}: ${description}`;
      }
    }
  } else {
    expenseClass = "COMPANY";
    const def = RENTAL_KINDS[input.group as RentalGroup];
    if (!def) return { ok: false, error: "Unknown rental type." };
    kind = def.kind;
    category = def.category;
    if (input.group === "equipment-rental") {
      amount = Number(input.amount);
      const days = inclusiveDays(input.startDate ?? "", input.endDate ?? "");
      problem =
        need(Boolean(input.equipmentName?.trim()), "Enter the equipment name.") ||
        need(Boolean(input.supplier?.trim()), "Enter the supplier.") ||
        need(isDay(input.startDate) && isDay(input.endDate), "Enter the start and end dates.") ||
        need(days > 0, "The end date can't be before the start date.") ||
        need(amount > 0, "Enter the rental price.") ||
        need(Boolean(input.teamId), "Choose the team using the equipment.") ||
        need(Boolean(input.emirate), "Choose the emirate.");
      vendor = input.supplier?.trim() || null;
      reference = input.invoiceNumber?.trim() || null;
      date = input.startDate ?? input.date;
      description = `Equipment rental — ${input.equipmentName?.trim()} (${days} day${days === 1 ? "" : "s"})`;
      Object.assign(details, { equipmentName: input.equipmentName?.trim(), supplier: vendor, startDate: input.startDate, endDate: input.endDate, days, price: amount, invoiceNumber: reference });
    } else {
      const days = Number(input.days);
      const rate = Number(input.dailyRate);
      problem =
        need(Boolean(input.vehicleType?.trim()), "Enter the vehicle type.") ||
        need(Boolean(input.supplier?.trim()), "Enter the supplier or lessor.") ||
        need(days > 0, "Enter the number of days.") ||
        need(rate > 0, "Enter the daily rental rate.") ||
        need(Boolean(input.teamId), "Choose the team that benefits.") ||
        need(Boolean(input.emirate), "Choose the emirate.");
      amount = dailyWorkerTotal(days, rate);
      vendor = input.supplier?.trim() || null;
      reference = input.invoiceNumber?.trim() || null;
      description = `Transport vehicle rental — ${input.vehicleType?.trim()} (${days} day${days === 1 ? "" : "s"} × ${aed(rate)})`;
      Object.assign(details, { vehicleType: input.vehicleType?.trim(), supplier: vendor, days, dailyRate: rate, total: amount, invoiceNumber: reference });
    }
  }
  if (problem) return { ok: false, error: problem };
  if (!(amount > 0)) return { ok: false, error: "The amount must be more than 0." };

  // The same expense entered twice (same kind, day, amount and wording) is refused.
  const day = new Date(`${date}T00:00:00Z`);
  const next = new Date(day.getTime() + 86_400_000);
  const duplicate = await prisma.expense.findFirst({
    where: { expenseClass, expenseKind: kind, date: { gte: day, lt: next }, amount, description: { equals: description, mode: "insensitive" }, payment: input.payment },
    select: { id: true },
  });
  if (duplicate) return { ok: false, error: "This identical expense has already been recorded for this date." };

  const number = await generateExpenseNumber();
  const created = await prisma.$transaction(async (tx) => {
    const e = await tx.expense.create({
      data: {
        number, date: new Date(`${date}T12:00:00Z`), description, notes: input.notes?.trim() || null, category, payment: input.payment, amount,
        attachmentUrl: input.attachmentUrl || null, vendor, referenceNumber: reference, creditCardId: card.creditCardId,
        teamId: input.teamId || admin.teamId, createdById: admin.id, expenseClass, expenseKind: kind, emirate: input.emirate || null,
        details: details as object,
      },
    });
    if (card.creditCardId) {
      await tx.creditCardAuditLog.create({
        data: { creditCardId: card.creditCardId, action: "Expense Added", description: `Expense ${e.number ?? e.id} "${e.description}" added — ${aed(e.amount)}`, newValue: e.amount.toFixed(2), performedById: admin.id },
      });
    }
    return e;
  });
  await writeAudit(admin, "create", "Expense", created.id, null, { expenseClass, kind, amount, emirate: input.emirate ?? null });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/reports/performance");
  if (card.creditCardId) revalidatePath(`/admin/wallets/credit-cards/${card.creditCardId}`);
  return { ok: true, id: created.id };
}
