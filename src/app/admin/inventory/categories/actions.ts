"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import type { InventoryActionResult } from "@/lib/inventoryData";

function revalidateCategoryPaths() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/categories");
  revalidatePath("/admin/inventory/items");
}

export async function createCategory(name: string, nameAr: string): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Category name is required." };

  const existing = await prisma.inventoryCategory.findUnique({ where: { name: trimmed } });
  if (existing) return { ok: false, error: "A category with this name already exists." };

  await prisma.inventoryCategory.create({ data: { name: trimmed, nameAr: nameAr.trim() || null, createdById: admin.id } });
  revalidateCategoryPaths();
  return { ok: true };
}

// Renames the category AND cascades the string change across every
// InventoryItem.category value that referenced the old name -- InventoryItem
// stores category as a plain string (not a foreign key), so every existing
// filter/report across the app keeps working unchanged after this.
export async function renameCategory(categoryId: string, newName: string, nameAr: string): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  const trimmed = newName.trim();
  if (!trimmed) return { ok: false, error: "Category name is required." };

  const category = await prisma.inventoryCategory.findUnique({ where: { id: categoryId } });
  if (!category) return { ok: false, error: "Category not found." };

  if (trimmed !== category.name) {
    const duplicate = await prisma.inventoryCategory.findUnique({ where: { name: trimmed } });
    if (duplicate) return { ok: false, error: "A category with this name already exists." };
  }

  await prisma.$transaction([
    prisma.inventoryCategory.update({ where: { id: categoryId }, data: { name: trimmed, nameAr: nameAr.trim() || null } }),
    prisma.inventoryItem.updateMany({ where: { category: category.name }, data: { category: trimmed } }),
  ]);
  revalidateCategoryPaths();
  return { ok: true };
}

export async function deactivateCategory(categoryId: string): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  await prisma.inventoryCategory.update({ where: { id: categoryId }, data: { status: "Inactive" } });
  revalidateCategoryPaths();
  return { ok: true };
}

export async function reactivateCategory(categoryId: string): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  await prisma.inventoryCategory.update({ where: { id: categoryId }, data: { status: "Active" } });
  revalidateCategoryPaths();
  return { ok: true };
}

export async function createSubcategory(categoryId: string, name: string): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Subcategory name is required." };

  const category = await prisma.inventoryCategory.findUnique({ where: { id: categoryId } });
  if (!category) return { ok: false, error: "Category not found." };

  const existing = await prisma.inventorySubcategory.findUnique({ where: { categoryId_name: { categoryId, name: trimmed } } });
  if (existing) return { ok: false, error: "A subcategory with this name already exists in this category." };

  await prisma.inventorySubcategory.create({ data: { categoryId, name: trimmed } });
  revalidateCategoryPaths();
  return { ok: true };
}

export async function renameSubcategory(subcategoryId: string, newName: string): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  const trimmed = newName.trim();
  if (!trimmed) return { ok: false, error: "Subcategory name is required." };

  const subcategory = await prisma.inventorySubcategory.findUnique({ where: { id: subcategoryId }, include: { category: true } });
  if (!subcategory) return { ok: false, error: "Subcategory not found." };

  if (trimmed !== subcategory.name) {
    const duplicate = await prisma.inventorySubcategory.findUnique({
      where: { categoryId_name: { categoryId: subcategory.categoryId, name: trimmed } },
    });
    if (duplicate) return { ok: false, error: "A subcategory with this name already exists in this category." };
  }

  await prisma.$transaction([
    prisma.inventorySubcategory.update({ where: { id: subcategoryId }, data: { name: trimmed } }),
    prisma.inventoryItem.updateMany({
      where: { category: subcategory.category.name, subcategory: subcategory.name },
      data: { subcategory: trimmed },
    }),
  ]);
  revalidateCategoryPaths();
  return { ok: true };
}

export async function deactivateSubcategory(subcategoryId: string): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  await prisma.inventorySubcategory.update({ where: { id: subcategoryId }, data: { status: "Inactive" } });
  revalidateCategoryPaths();
  return { ok: true };
}

export async function reactivateSubcategory(subcategoryId: string): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  await prisma.inventorySubcategory.update({ where: { id: subcategoryId }, data: { status: "Active" } });
  revalidateCategoryPaths();
  return { ok: true };
}
