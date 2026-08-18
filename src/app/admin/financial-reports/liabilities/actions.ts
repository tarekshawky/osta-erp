"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { LIABILITY_TYPES, LIABILITY_CATEGORIES } from "@/lib/financialReportsCore";

export type LiabilityFormInput = {
  name: string;
  type: string;
  category: string;
  amount: number;
  notes: string;
};

export type LiabilityActionResult = { ok: boolean; id?: string; error?: string };

function validate(input: LiabilityFormInput) {
  if (!input.name.trim()) return "Liability Name is required.";
  if (!(LIABILITY_TYPES as readonly string[]).includes(input.type)) return "Invalid type.";
  if (!(LIABILITY_CATEGORIES as readonly string[]).includes(input.category)) return "Invalid category.";
  if (!(input.amount > 0)) return "Amount must be greater than 0.";
  return null;
}

export async function createLiability(input: LiabilityFormInput): Promise<LiabilityActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const liability = await prisma.liability.create({
    data: {
      name: input.name.trim(),
      type: input.type,
      category: input.category,
      amount: input.amount,
      notes: input.notes.trim() || null,
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/financial-reports/liabilities");
  revalidatePath("/admin/financial-reports/balance-sheet");
  return { ok: true, id: liability.id };
}

export async function updateLiability(liabilityId: string, input: LiabilityFormInput): Promise<LiabilityActionResult> {
  await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.liability.findUnique({ where: { id: liabilityId } });
  if (!existing) return { ok: false, error: "Liability not found." };

  await prisma.liability.update({
    where: { id: liabilityId },
    data: {
      name: input.name.trim(),
      type: input.type,
      category: input.category,
      amount: input.amount,
      notes: input.notes.trim() || null,
    },
  });

  revalidatePath("/admin/financial-reports/liabilities");
  revalidatePath("/admin/financial-reports/balance-sheet");
  return { ok: true, id: liabilityId };
}

export async function deleteLiability(liabilityId: string): Promise<LiabilityActionResult> {
  await requireEmployee("ADMIN");
  const existing = await prisma.liability.findUnique({ where: { id: liabilityId } });
  if (!existing) return { ok: false, error: "Liability not found." };

  await prisma.liability.delete({ where: { id: liabilityId } });

  revalidatePath("/admin/financial-reports/liabilities");
  revalidatePath("/admin/financial-reports/balance-sheet");
  return { ok: true };
}
