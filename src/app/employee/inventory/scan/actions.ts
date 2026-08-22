"use server";

import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { getInventoryItemDisplayName, getLocationQuantity } from "@/lib/inventoryData";

// Employee-facing lookup -- never returns Purchase Cost, per the established
// "Purchase Cost never shown to employee" convention.
export type EmployeeScanLookupResult = {
  id: string;
  displayName: string;
  sku: string | null;
  category: string;
  sellingPrice: number | null;
  myStock: number;
  unit: string;
};

export async function lookupItemByCode(code: string): Promise<EmployeeScanLookupResult | null> {
  const employee = await requireEmployee("EMPLOYEE");
  const trimmed = code.trim();
  if (!trimmed) return null;

  const item = await prisma.inventoryItem.findFirst({ where: { OR: [{ barcode: trimmed }, { sku: trimmed }] } });
  if (!item) return null;

  const myStock = await getLocationQuantity(prisma, item.id, employee.id);

  return {
    id: item.id,
    displayName: getInventoryItemDisplayName(item),
    sku: item.sku,
    category: item.category,
    sellingPrice: item.sellingPrice,
    myStock,
    unit: item.unit,
  };
}
