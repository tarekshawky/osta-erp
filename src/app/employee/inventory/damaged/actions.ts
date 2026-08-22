"use server";

import { revalidatePath } from "next/cache";
import { requireEmployee } from "@/lib/auth";
import { recordDamaged, type InventoryActionResult } from "@/lib/inventoryData";

// Employee-callable, but a direct/unapproved action -- the spec never asks
// for an admin approval step for damage reports (unlike Stock Requests and
// Returns, which explicitly do). Reuses the EXISTING recordDamaged() lib
// function verbatim, just called with location = the employee's own id.
export async function reportDamagedStock(
  inventoryItemId: string,
  quantity: number,
  reason: string
): Promise<InventoryActionResult> {
  const employee = await requireEmployee("EMPLOYEE");
  const result = await recordDamaged(employee.id, employee.id, inventoryItemId, quantity, reason);
  if (result.ok) {
    revalidatePath("/employee/inventory");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/damaged");
    revalidatePath("/admin/inventory/transactions");
  }
  return result;
}
