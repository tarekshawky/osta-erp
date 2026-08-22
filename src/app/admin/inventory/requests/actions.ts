"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { distributeStock as distributeStockLib, type InventoryActionResult } from "@/lib/inventoryData";

function revalidateRequestPaths(employeeId?: string) {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/requests");
  revalidatePath("/employee/inventory");
  if (employeeId) revalidatePath(`/admin/employees/${employeeId}`);
}

// Approving (fully or partially) is the only path that ever moves real stock
// -- it calls the EXISTING distributeStock() (Branch -> Employee), so the
// maximumQuantity override and the Branch-only source check both apply
// automatically. The StockRequest row itself is pure workflow state; it is
// only updated once the real transfer has actually succeeded.
export async function approveStockRequest(
  requestId: string,
  approvedQuantity: number,
  sourceWarehouseId: string,
  overrideLimit?: boolean
): Promise<InventoryActionResult & { requiresOverride?: boolean }> {
  const admin = await requireEmployee("ADMIN");
  if (!(approvedQuantity > 0)) return { ok: false, error: "Enter a valid approved quantity." };
  if (!sourceWarehouseId) return { ok: false, error: "Select a source Branch Warehouse." };

  const request = await prisma.stockRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status !== "Pending") return { ok: false, error: "This request has already been decided." };
  if (approvedQuantity > request.requestedQuantity) {
    return { ok: false, error: `Cannot approve more than the requested quantity (${request.requestedQuantity.toLocaleString()}).` };
  }

  const transferResult = await distributeStockLib(
    admin.id,
    sourceWarehouseId,
    request.employeeId,
    [{ inventoryItemId: request.inventoryItemId, quantity: approvedQuantity }],
    overrideLimit
  );
  if (!transferResult.ok) return transferResult;

  await prisma.stockRequest.update({
    where: { id: requestId },
    data: {
      status: approvedQuantity === request.requestedQuantity ? "Approved" : "PartiallyApproved",
      approvedQuantity,
      sourceWarehouseId,
      decidedById: admin.id,
      decidedAt: new Date(),
    },
  });

  revalidateRequestPaths(request.employeeId);
  return { ok: true };
}

export async function rejectStockRequest(requestId: string): Promise<InventoryActionResult> {
  const admin = await requireEmployee("ADMIN");
  const request = await prisma.stockRequest.findUnique({ where: { id: requestId } });
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status !== "Pending") return { ok: false, error: "This request has already been decided." };

  await prisma.stockRequest.update({
    where: { id: requestId },
    data: { status: "Rejected", approvedQuantity: 0, decidedById: admin.id, decidedAt: new Date() },
  });

  revalidateRequestPaths(request.employeeId);
  return { ok: true };
}
