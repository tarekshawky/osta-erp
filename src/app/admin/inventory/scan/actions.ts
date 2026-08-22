"use server";

import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { getInventoryItemDisplayName, getItemStockBreakdown } from "@/lib/inventoryData";

export type ScanLookupResult = {
  id: string;
  displayName: string;
  sku: string | null;
  barcode: string | null;
  category: string;
  costPrice: number | null;
  sellingPrice: number | null;
  mainQty: number;
  branchQty: number;
  employeeQty: number;
  totalStock: number;
};

export async function lookupItemByCode(code: string): Promise<ScanLookupResult | null> {
  await requireEmployee("ADMIN");
  const trimmed = code.trim();
  if (!trimmed) return null;

  const item = await prisma.inventoryItem.findFirst({ where: { OR: [{ barcode: trimmed }, { sku: trimmed }] } });
  if (!item) return null;

  const breakdown = await getItemStockBreakdown(item.id);
  const branchQty = breakdown.branches.reduce((s, b) => s + b.qty, 0);
  const employeeQty = breakdown.employees.reduce((s, e) => s + e.qty, 0);

  return {
    id: item.id,
    displayName: getInventoryItemDisplayName(item),
    sku: item.sku,
    barcode: item.barcode,
    category: item.category,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    mainQty: breakdown.mainQty,
    branchQty,
    employeeQty,
    totalStock: breakdown.totalStock,
  };
}
