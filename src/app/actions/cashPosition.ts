"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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

  const existing = await prisma.cashPosition.findFirst({ orderBy: { updatedAt: "desc" } });
  const data = { openingBalance: amount, openingDate: parseDate(openingDate), updatedById: session.employeeId };

  if (existing) {
    await prisma.cashPosition.update({ where: { id: existing.id }, data });
  } else {
    await prisma.cashPosition.create({ data });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
