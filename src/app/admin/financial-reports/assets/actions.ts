"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { ASSET_CATEGORIES } from "@/lib/financialReportsCore";

export type AssetFormInput = {
  name: string;
  category: string;
  purchaseCost: number;
  purchaseDate: string;
  usefulLifeYears: number;
  notes: string;
};

export type AssetActionResult = { ok: boolean; id?: string; error?: string };

function validate(input: AssetFormInput) {
  if (!input.name.trim()) return "Asset Name is required.";
  if (!(ASSET_CATEGORIES as readonly string[]).includes(input.category)) return "Invalid category.";
  if (!(input.purchaseCost > 0)) return "Purchase Cost must be greater than 0.";
  if (!input.purchaseDate) return "Purchase Date is required.";
  if (!(input.usefulLifeYears > 0)) return "Useful Life (years) must be greater than 0.";
  return null;
}

export async function createAsset(input: AssetFormInput): Promise<AssetActionResult> {
  const admin = await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const asset = await prisma.asset.create({
    data: {
      name: input.name.trim(),
      category: input.category,
      purchaseCost: input.purchaseCost,
      purchaseDate: new Date(input.purchaseDate),
      usefulLifeYears: input.usefulLifeYears,
      notes: input.notes.trim() || null,
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/financial-reports/assets");
  revalidatePath("/admin/financial-reports/balance-sheet");
  return { ok: true, id: asset.id };
}

export async function updateAsset(assetId: string, input: AssetFormInput): Promise<AssetActionResult> {
  await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!existing) return { ok: false, error: "Asset not found." };

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      name: input.name.trim(),
      category: input.category,
      purchaseCost: input.purchaseCost,
      purchaseDate: new Date(input.purchaseDate),
      usefulLifeYears: input.usefulLifeYears,
      notes: input.notes.trim() || null,
    },
  });

  revalidatePath("/admin/financial-reports/assets");
  revalidatePath("/admin/financial-reports/balance-sheet");
  return { ok: true, id: assetId };
}

export async function deleteAsset(assetId: string): Promise<AssetActionResult> {
  await requireEmployee("ADMIN");
  const existing = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!existing) return { ok: false, error: "Asset not found." };

  await prisma.asset.delete({ where: { id: assetId } });

  revalidatePath("/admin/financial-reports/assets");
  revalidatePath("/admin/financial-reports/balance-sheet");
  return { ok: true };
}
