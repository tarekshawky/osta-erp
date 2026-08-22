"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { returnToWarehouse as returnToWarehouseLib, type InventoryActionResult } from "@/lib/inventoryData";

function revalidateReturnPaths(employeeId?: string) {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/returns");
  revalidatePath("/employee/inventory");
  if (employeeId) revalidatePath(`/admin/employees/${employeeId}`);
}

// Approving is the only path that ever moves real stock -- it calls the
// EXISTING returnToWarehouse() (Employee -> Branch). The StockReturnRequest
// row is pure workflow state, only updated once the real return succeeds.
export async function approveReturnRequest(requestId: string, destinationWarehouseId: string): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  if (!destinationWarehouseId) return { ok: false, error: "Select a destination Branch Warehouse." };

  const request = await prisma.stockReturnRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status !== "Pending") return { ok: false, error: "This request has already been decided." };

  const result = await returnToWarehouseLib(admin.id, request.employeeId, destinationWarehouseId, request.inventoryItemId, request.quantity);
  if (!result.ok) return result;

  await prisma.stockReturnRequest.update({
    where: { id: requestId },
    data: { status: "Approved", destinationWarehouseId, decidedById: admin.id, decidedAt: new Date() },
  });

  revalidateReturnPaths(request.employeeId);
  return { ok: true };
}

export async function rejectReturnRequest(requestId: string): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  const request = await prisma.stockReturnRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status !== "Pending") return { ok: false, error: "This request has already been decided." };

  await prisma.stockReturnRequest.update({
    where: { id: requestId },
    data: { status: "Rejected", decidedById: admin.id, decidedAt: new Date() },
  });

  revalidateReturnPaths(request.employeeId);
  return { ok: true };
}
