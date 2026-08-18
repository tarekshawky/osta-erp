"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import type { InventoryActionResult } from "@/lib/inventoryData";

export type WarehouseFormInput = {
  name: string;
  status: string;
};

function validate(input: WarehouseFormInput) {
  if (!input.name.trim()) return "Warehouse name is required.";
  if (!["Active", "Inactive"].includes(input.status)) return "Invalid status.";
  return null;
}

function revalidateWarehousePaths() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/warehouses");
  revalidatePath("/admin/inventory/warehouse");
  revalidatePath("/admin/inventory/distribute");
}

export async function createWarehouse(input: WarehouseFormInput): Promise<InventoryActionResult & { id?: string }> {
  await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.warehouse.findUnique({ where: { name: input.name.trim() } });
  if (existing) return { ok: false, error: "A warehouse with this name already exists." };

  const warehouse = await prisma.warehouse.create({ data: { name: input.name.trim(), status: input.status } });
  revalidateWarehousePaths();
  return { ok: true, id: warehouse.id };
}

export async function updateWarehouse(warehouseId: string, input: WarehouseFormInput): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!existing) return { ok: false, error: "Warehouse not found." };

  const duplicate = await prisma.warehouse.findFirst({ where: { name: input.name.trim(), id: { not: warehouseId } } });
  if (duplicate) return { ok: false, error: "A warehouse with this name already exists." };

  await prisma.warehouse.update({ where: { id: warehouseId }, data: { name: input.name.trim(), status: input.status } });
  revalidateWarehousePaths();
  return { ok: true };
}
