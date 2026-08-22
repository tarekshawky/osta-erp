"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import type { InventoryActionResult } from "@/lib/inventoryData";

export async function submitStockRequest(
  inventoryItemId: string,
  requestedQuantity: number,
  reason: string
): Promise<InventoryActionResult> {
  const employee = await requireEmployee("EMPLOYEE");
  if (!inventoryItemId) return { ok: false, error: "Select an item." };
  if (!(requestedQuantity > 0)) return { ok: false, error: "Enter a valid quantity." };

  const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  if (!item || item.status !== "Active") return { ok: false, error: "Inventory item not found." };

  await prisma.stockRequest.create({
    data: {
      employeeId: employee.id,
      inventoryItemId,
      requestedQuantity,
      reason: reason.trim() || null,
    },
  });

  revalidatePath("/employee/inventory");
  revalidatePath("/admin/inventory/requests");
  revalidatePath("/admin/inventory");
  return { ok: true };
}
