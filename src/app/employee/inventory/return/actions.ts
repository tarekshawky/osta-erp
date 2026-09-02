"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { getLocationQuantity, RETURN_REASONS, type InventoryActionResult } from "@/lib/inventoryData";

export async function submitReturnRequest(
  inventoryItemId: string,
  quantity: number,
  reason: string
): Promise<InventoryActionResult> {
  const employee = await requireEmployee("EMPLOYEE");
  if (!inventoryItemId) return { ok: false, error: "Select an item." };
  if (!(quantity > 0)) return { ok: false, error: "Enter a valid quantity." };
  if (!(RETURN_REASONS as readonly string[]).includes(reason)) return { ok: false, error: "Select a reason." };

  const available = await getLocationQuantity(prisma, inventoryItemId, employee.id);
  if (quantity > available) {
    return { ok: false, error: `You only have ${available.toLocaleString()} of this item.` };
  }

  await prisma.stockReturnRequest.create({
    data: { employeeId: employee.id, inventoryItemId, quantity, reason },
  });

  revalidatePath("/employee/inventory");
  revalidatePath("/admin/inventory/returns");
  revalidatePath("/admin/inventory");
  return { ok: true };
}
