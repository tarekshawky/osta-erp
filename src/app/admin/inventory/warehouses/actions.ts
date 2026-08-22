"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import type { InventoryActionResult } from "@/lib/inventoryData";

export type WarehouseFormInput = {
  name: string;
  type: string;
  status: string;
};

function validate(input: WarehouseFormInput) {
  if (!input.name.trim()) return "Warehouse name is required.";
  if (!["Main", "Branch"].includes(input.type)) return "Invalid type.";
  if (!["Active", "Inactive"].includes(input.status)) return "Invalid status.";
  return null;
}

function revalidateWarehousePaths() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/warehouses");
  revalidatePath("/admin/inventory/warehouse");
  revalidatePath("/admin/inventory/main-warehouse");
  revalidatePath("/admin/inventory/distribute");
}

// A soft singleton, not a hard DB constraint (matches CashPosition/Setting
// elsewhere in this app) -- only one Active "Main" warehouse may exist at a
// time, since Purchase/Stock-Received events only ever target it.
async function assertSingleActiveMain(excludeWarehouseId: string | undefined, type: string, status: string) {
  if (type !== "Main" || status !== "Active") return null;
  const existing = await prisma.warehouse.findFirst({
    where: { type: "Main", status: "Active", ...(excludeWarehouseId ? { id: { not: excludeWarehouseId } } : {}) },
  });
  if (existing) return `An Active Main Warehouse already exists ("${existing.name}") — deactivate it first.`;
  return null;
}

export async function createWarehouse(input: WarehouseFormInput): Promise<InventoryActionResult & { id?: string }> {
  await requireEmployee("ADMIN");
  const error = validate(input);
  if (error) return { ok: false, error };

  const existing = await prisma.warehouse.findUnique({ where: { name: input.name.trim() } });
  if (existing) return { ok: false, error: "A warehouse with this name already exists." };

  const singletonError = await assertSingleActiveMain(undefined, input.type, input.status);
  if (singletonError) return { ok: false, error: singletonError };

  const warehouse = await prisma.warehouse.create({ data: { name: input.name.trim(), type: input.type, status: input.status } });
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

  const singletonError = await assertSingleActiveMain(warehouseId, input.type, input.status);
  if (singletonError) return { ok: false, error: singletonError };

  await prisma.warehouse.update({ where: { id: warehouseId }, data: { name: input.name.trim(), type: input.type, status: input.status } });
  revalidateWarehousePaths();
  return { ok: true };
}
