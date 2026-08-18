"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import type { InventoryActionResult } from "@/lib/inventoryData";

export type LabourItemFormInput = {
  code: string;
  nameAr: string;
  nameEn: string;
  defaultPrice: string;
  status: string;
};

function validate(input: LabourItemFormInput) {
  if (!input.code.trim()) return "Code is required.";
  if (!input.nameEn.trim()) return "English Name is required.";
  if (!input.nameAr.trim()) return "Arabic Name is required.";
  if (!(Number(input.defaultPrice) >= 0)) return "Enter a valid Default Price.";
  if (!["Active", "Inactive"].includes(input.status)) return "Invalid status.";
  return null;
}

function buildData(input: LabourItemFormInput) {
  return {
    code: input.code.trim(),
    nameAr: input.nameAr.trim(),
    nameEn: input.nameEn.trim(),
    defaultPrice: Number(input.defaultPrice),
    status: input.status,
  };
}

function revalidateLabourPaths() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/labour");
}

export async function createLabourItem(input: LabourItemFormInput): Promise<InventoryActionResult & { id?: string }> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.labourItem.findUnique({ where: { code: input.code.trim() } });
  if (existing) return { ok: false, error: "A labour item with this code already exists." };

  const labourItem = await prisma.labourItem.create({ data: { ...buildData(input), createdById: admin.id } });
  revalidateLabourPaths();
  return { ok: true, id: labourItem.id };
}

export async function updateLabourItem(labourItemId: string, input: LabourItemFormInput): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.labourItem.findUnique({ where: { id: labourItemId } });
  if (!existing) return { ok: false, error: "Labour item not found." };

  const duplicate = await prisma.labourItem.findFirst({ where: { code: input.code.trim(), id: { not: labourItemId } } });
  if (duplicate) return { ok: false, error: "A labour item with this code already exists." };

  await prisma.labourItem.update({ where: { id: labourItemId }, data: buildData(input) });
  revalidateLabourPaths();
  return { ok: true };
}
