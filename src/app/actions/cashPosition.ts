"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkOpeningBalance } from "@/lib/financialReportsBalanceSheet";
import { SETTING_ID } from "@/lib/settings";
import { formatAed } from "@/lib/format";

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function getCashPosition() {
  return prisma.cashPosition.findFirst({ orderBy: { updatedAt: "desc" } });
}

// Singleton-style like Setting, but its own table since it carries a distinct
// updatedBy audit relation. There should only ever be one row -- upsert against
// the existing row's id if present, otherwise create the first one.
export async function updateCashPosition(
  openingBalance: string,
  openingDate: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "Not authorized." };

  const amount = Number(openingBalance);
  if (Number.isNaN(amount)) return { ok: false, error: "Enter a valid opening balance." };
  const date = parseDate(openingDate);

  const setting = await prisma.setting.findUnique({
    where: { id: SETTING_ID },
    select: { shareCapital: true, statutoryReserves: true, shareholderEmployeeId: true },
  });
  const check = await checkOpeningBalance({
    openingBalance: amount,
    openingDate: date ?? new Date(0),
    shareCapital: setting?.shareCapital ?? 0,
    statutoryReserves: setting?.statutoryReserves ?? 0,
    shareholderEmployeeId: setting?.shareholderEmployeeId ?? null,
  });
  if (!check.isBalanced) {
    return {
      ok: false,
      error: `This opening balance leaves the Statement of Financial Position unbalanced by ${formatAed(Math.abs(check.difference))} as at the opening date. Set the Opening Balance to ${formatAed(check.suggestedOpeningBalance)} to balance it (or adjust Share Capital / Statutory Reserves in Settings first).`,
    };
  }

  const existing = await prisma.cashPosition.findFirst({ orderBy: { updatedAt: "desc" } });
  const data = { openingBalance: amount, openingDate: date, updatedById: session.employeeId };

  if (existing) {
    await prisma.cashPosition.update({ where: { id: existing.id }, data });
  } else {
    await prisma.cashPosition.create({ data });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
