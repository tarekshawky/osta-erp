"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import {
  INVENTORY_UNITS,
  INVENTORY_CATEGORIES,
  INVENTORY_ITEM_STATUSES,
  addStock as addStockLib,
  recordSupplierPurchase as recordSupplierPurchaseLib,
  transferToBranch as transferToBranchLib,
  distributeStock as distributeStockLib,
  returnToWarehouse as returnToWarehouseLib,
  recordDamaged as recordDamagedLib,
  recordLost as recordLostLib,
  adjustStock as adjustStockLib,
  type InventoryActionResult,
} from "@/lib/inventoryData";

export type InventoryItemFormInput = {
  name: string;
  specification: string;
  unit: string;
  category: string;
  description: string;
  costPrice: string;
  sellingPrice: string;
  minimumMainStock: number;
  status: string;
  supplierId: string;
};

function validateItem(input: InventoryItemFormInput) {
  if (!input.name.trim()) return "Item Name is required.";
  if (!(INVENTORY_UNITS as readonly string[]).includes(input.unit)) return "Invalid unit.";
  if (!(INVENTORY_CATEGORIES as readonly string[]).includes(input.category)) return "Invalid category.";
  if (!(INVENTORY_ITEM_STATUSES as readonly string[]).includes(input.status)) return "Invalid status.";
  if (input.minimumMainStock < 0) return "Minimum Main Stock cannot be negative.";
  return null;
}

function buildData(input: InventoryItemFormInput) {
  return {
    name: input.name.trim(),
    specification: input.specification.trim() || null,
    unit: input.unit,
    category: input.category,
    description: input.description.trim() || null,
    costPrice: input.costPrice ? Number(input.costPrice) : null,
    sellingPrice: input.sellingPrice ? Number(input.sellingPrice) : null,
    minimumMainStock: input.minimumMainStock,
    status: input.status,
    supplierId: input.supplierId || null,
  };
}

export async function createInventoryItem(input: InventoryItemFormInput): Promise<InventoryActionResult & { id?: string }> {
  const admin = await requireEmployee("ADMIN");
  const error = validateItem(input);
  if (error) return { ok: false, error };

  const item = await prisma.inventoryItem.create({ data: { ...buildData(input), createdById: admin.id } });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/items");
  revalidatePath("/admin/inventory/warehouse");
  return { ok: true, id: item.id };
}

export async function updateInventoryItem(itemId: string, input: InventoryItemFormInput): Promise<InventoryActionResult> {
  await requireEmployee("ADMIN");
  const error = validateItem(input);
  if (error) return { ok: false, error };

  const existing = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!existing) return { ok: false, error: "Inventory item not found." };

  await prisma.inventoryItem.update({ where: { id: itemId }, data: buildData(input) });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/items");
  revalidatePath("/admin/inventory/warehouse");
  return { ok: true };
}

export async function addStock(
  warehouseId: string,
  inventoryItemId: string,
  quantity: number,
  notes: string
): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  const result = await addStockLib(admin.id, warehouseId, inventoryItemId, quantity, notes);
  if (result.ok) {
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/main-warehouse");
    revalidatePath("/admin/inventory/transactions");
  }
  return result;
}

export async function transferToBranch(
  mainWarehouseId: string,
  branchWarehouseId: string,
  inventoryItemId: string,
  quantity: number,
  notes: string
): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  const result = await transferToBranchLib(admin.id, mainWarehouseId, branchWarehouseId, inventoryItemId, quantity, notes);
  if (result.ok) {
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/main-warehouse");
    revalidatePath("/admin/inventory/warehouse");
    revalidatePath("/admin/inventory/transactions");
  }
  return result;
}

export type SupplierPurchaseFormInput = {
  warehouseId: string;
  inventoryItemId: string;
  quantity: number;
  supplierName: string;
  unitCost: number;
  date: string;
  notes: string;
};

export async function recordSupplierPurchase(input: SupplierPurchaseFormInput): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  if (!input.date) return { ok: false, error: "Date is required." };
  const result = await recordSupplierPurchaseLib(admin.id, { ...input, date: new Date(input.date) });
  if (result.ok) {
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/main-warehouse");
    revalidatePath("/admin/inventory/transactions");
    revalidatePath("/admin/expenses");
  }
  return result;
}

function revalidateStockPaths(employeeId?: string) {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/warehouse");
  revalidatePath("/admin/inventory/employees");
  revalidatePath("/admin/inventory/transactions");
  revalidatePath("/admin");
  if (employeeId) revalidatePath(`/admin/employees/${employeeId}`);
}

export async function distributeStock(
  fromWarehouseId: string,
  employeeId: string,
  lines: { inventoryItemId: string; quantity: number }[]
): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  const result = await distributeStockLib(admin.id, fromWarehouseId, employeeId, lines);
  if (result.ok) revalidateStockPaths(employeeId);
  return result;
}

export async function returnToWarehouse(
  employeeId: string,
  toWarehouseId: string,
  inventoryItemId: string,
  quantity: number
): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  const result = await returnToWarehouseLib(admin.id, employeeId, toWarehouseId, inventoryItemId, quantity);
  if (result.ok) revalidateStockPaths(employeeId);
  return result;
}

// `employeeId` is passed explicitly by the caller (rather than derived by
// comparing `location` against a sentinel) since location is now either a
// real Warehouse.id or an Employee.id -- the component rendering the action
// already knows which, from which table it's rendered in.
export async function recordDamaged(
  location: string,
  inventoryItemId: string,
  quantity: number,
  reason: string,
  notes: string,
  employeeId?: string
): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  const result = await recordDamagedLib(admin.id, location, inventoryItemId, quantity, reason, notes);
  if (result.ok) revalidateStockPaths(employeeId);
  return result;
}

export async function recordLost(
  location: string,
  inventoryItemId: string,
  quantity: number,
  reason: string,
  notes: string,
  employeeId?: string
): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  const result = await recordLostLib(admin.id, location, inventoryItemId, quantity, reason, notes);
  if (result.ok) revalidateStockPaths(employeeId);
  return result;
}

export async function adjustStock(
  location: string,
  inventoryItemId: string,
  newPhysicalCount: number,
  reason: string
): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  const result = await adjustStockLib(admin.id, location, inventoryItemId, newPhysicalCount, reason);
  if (result.ok) revalidateStockPaths();
  return result;
}

export async function setEmployeeInventoryRequirement(
  employeeId: string,
  inventoryItemId: string,
  requiredQuantity: number,
  minimumQuantity: number
): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  if (!(requiredQuantity >= 0)) return { ok: false, error: "Enter a valid required quantity." };
  if (!(minimumQuantity >= 0)) return { ok: false, error: "Enter a valid minimum quantity." };

  await prisma.employeeInventoryRequirement.upsert({
    where: { employeeId_inventoryItemId: { employeeId, inventoryItemId } },
    create: { employeeId, inventoryItemId, requiredQuantity, minimumQuantity, createdById: admin.id },
    update: { requiredQuantity, minimumQuantity },
  });

  revalidateStockPaths(employeeId);
  revalidatePath("/admin/inventory/requirements");
  return { ok: true };
}
