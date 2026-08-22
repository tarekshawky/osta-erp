import { prisma } from "./prisma";
import { buildCustomDateRange } from "./dateRangeFilter";
import { generateExpenseNumber } from "./expenseData";
import type { DateRange } from "./financialReportsCore";
import type { Prisma } from "@/generated/prisma";

export const INVENTORY_UNITS = [
  "Piece",
  "Meter",
  "Kg",
  "Liter",
  "Box",
  "Set",
  "Roll",
  "Pack",
  "Bottle",
  "Pair",
  "Other",
] as const;

export const INVENTORY_CATEGORIES = [
  "AC",
  "Electrical",
  "Plumbing",
  "Painting",
  "Cleaning",
  "Pest Control",
  "Maintenance",
  "Tools",
  "Spare Parts",
  "Other",
  // Spare Parts Catalog additions -- 12 AC-parts categories from the Master
  // Spare Parts Catalog spec. Finer breakdown within each lives in
  // InventoryItem.subcategory, populated by the seed script.
  "Electrical & Control Parts",
  "Sensors & PCB",
  "Motors & Fans",
  "Compressors",
  "Copper Pipes & Insulation",
  "Refrigeration Components",
  "Refrigerants",
  "Drainage Parts",
  "Split AC Installation Parts",
  "Central AC/FCU/AHU Parts",
  "Duct AC Parts",
  "General Electrical Parts",
] as const;

export const INVENTORY_ITEM_STATUSES = ["Active", "Inactive"] as const;

export const INVENTORY_TRANSACTION_TYPES = [
  "Stock Received",
  "Stock Transfer",
  "Stock Used",
  "Stock Returned",
  "Stock Damaged",
  "Stock Lost",
  "Stock Adjustment",
  "Stock Reversed",
  // Warehouse Hierarchy additions. "Warehouse Transfer" is Main -> Branch
  // only; Branch -> Employee keeps using the existing "Stock Transfer" type
  // (already load-bearing across every report -- not renamed to avoid a
  // historical-data migration for a label-only difference from the spec).
  "Warehouse Transfer",
  "Employee Transfer",
] as const;

// InventoryTransaction.fromLocation/toLocation hold either a real Warehouse.id,
// an Employee.id, or null (meaning external -- a supplier on receipt, or
// consumed/damaged/lost/reversed on the way out). Kept as plain strings, not
// real Prisma relations, since a relation can't conditionally point at either
// kind of row -- resolved to warehouse/employee names in application code.
export const WAREHOUSE_SEED_NAMES = ["Ajman", "Al Ain", "Dubai", "Sharjah", "Other"] as const;
export const MAIN_WAREHOUSE_NAME = "Main Warehouse";

export async function getWarehouses(
  status?: string,
  type?: "Main" | "Branch"
): Promise<{ id: string; name: string; type: string; status: string }[]> {
  return prisma.warehouse.findMany({
    where: { ...(status ? { status } : {}), ...(type ? { type } : {}) },
    orderBy: { name: "asc" },
  });
}

export type EmployeeStockStatus = "Available" | "Low Stock" | "Shortage" | "Out of Stock";
export type MainStockStatus = "OK" | "Low Stock" | "Out of Stock";
export type InventoryActionResult = { ok: boolean; error?: string };

// Every quantity in this module is derived from summing InventoryTransaction
// rows -- never stored as a running balance on InventoryItem/Employee, mirroring
// how CreditCard.outstanding and vehicle odometer are computed on the fly
// elsewhere in this codebase.
export class InsufficientStockError extends Error {}

type Db = typeof prisma | Prisma.TransactionClient;

export function getInventoryItemDisplayName(item: { name: string; specification: string | null }): string {
  return item.specification ? `${item.name} — ${item.specification}` : item.name;
}

export function deriveEmployeeStockStatus(
  current: number,
  required: number | null,
  minimum: number | null
): EmployeeStockStatus {
  if (current === 0) return "Out of Stock";
  if (required != null && current < required) return "Shortage";
  if (minimum != null && current <= minimum) return "Low Stock";
  return "Available";
}

export async function getLocationQuantity(db: Db, inventoryItemId: string, location: string): Promise<number> {
  const [inSum, outSum] = await Promise.all([
    db.inventoryTransaction.aggregate({ where: { inventoryItemId, toLocation: location }, _sum: { quantity: true } }),
    db.inventoryTransaction.aggregate({ where: { inventoryItemId, fromLocation: location }, _sum: { quantity: true } }),
  ]);
  return (inSum._sum.quantity ?? 0) - (outSum._sum.quantity ?? 0);
}

// Total units of this item that have ever entered the system and never left it
// (received minus used/damaged/lost, net of adjustments) -- internal transfers
// between MAIN and an employee net to zero here, since every transfer credits
// one location and debits another by the same amount. This is the identity
// that guarantees MAIN + every employee's stock always reconciles to this
// figure (spec's "Total Inventory = Main Warehouse + Employee Inventory").
export async function getItemTotalQuantity(db: Db, inventoryItemId: string): Promise<number> {
  const [inSum, outSum] = await Promise.all([
    db.inventoryTransaction.aggregate({
      where: { inventoryItemId, toLocation: { not: null } },
      _sum: { quantity: true },
    }),
    db.inventoryTransaction.aggregate({
      where: { inventoryItemId, fromLocation: { not: null } },
      _sum: { quantity: true },
    }),
  ]);
  return (inSum._sum.quantity ?? 0) - (outSum._sum.quantity ?? 0);
}

// Sum of an item's stock across every real Warehouse (never employee-held
// stock) -- used to split getItemTotalQuantity's system-wide figure into
// "in a warehouse" vs. "with an employee" now that there's more than one
// warehouse and a plain subtraction against a single MAIN qty no longer works.
export async function getAllWarehousesQuantity(db: Db, inventoryItemId: string): Promise<number> {
  const warehouses = await prisma.warehouse.findMany({ select: { id: true } });
  const sums = await Promise.all(warehouses.map((w) => getLocationQuantity(db, inventoryItemId, w.id)));
  return sums.reduce((s, q) => s + q, 0);
}

// Bulk variants of the three functions above -- each does exactly 2 groupBy
// queries total, REGARDLESS of how many items are asked about, instead of
// 2 (or 2×warehouseCount) queries PER item. A page that maps over N items and
// calls getLocationQuantity/getAllWarehousesQuantity/getItemTotalQuantity once
// per item inside Promise.all fires N (or N×warehouseCount) concurrent queries
// -- fine at the ~10-item scale the base Inventory system shipped with, but it
// floods Neon's connection pool (limit 9) once the Spare Parts catalog's ~226
// rows are seeded. Every page iterating the full item list must use these.
function sumGroupedByItem(groups: { inventoryItemId: string; _sum: { quantity: number | null } }[]): Map<string, number> {
  return new Map(groups.map((g) => [g.inventoryItemId, g._sum.quantity ?? 0]));
}

export async function getBulkLocationQuantities(db: Db, itemIds: string[], location: string): Promise<Record<string, number>> {
  if (itemIds.length === 0) return {};
  const [inSums, outSums] = await Promise.all([
    db.inventoryTransaction.groupBy({ by: ["inventoryItemId"], where: { inventoryItemId: { in: itemIds }, toLocation: location }, _sum: { quantity: true } }),
    db.inventoryTransaction.groupBy({ by: ["inventoryItemId"], where: { inventoryItemId: { in: itemIds }, fromLocation: location }, _sum: { quantity: true } }),
  ]);
  const inMap = sumGroupedByItem(inSums);
  const outMap = sumGroupedByItem(outSums);
  const result: Record<string, number> = {};
  for (const id of itemIds) result[id] = (inMap.get(id) ?? 0) - (outMap.get(id) ?? 0);
  return result;
}

export async function getBulkItemTotalQuantities(db: Db, itemIds: string[]): Promise<Record<string, number>> {
  if (itemIds.length === 0) return {};
  const [inSums, outSums] = await Promise.all([
    db.inventoryTransaction.groupBy({ by: ["inventoryItemId"], where: { inventoryItemId: { in: itemIds }, toLocation: { not: null } }, _sum: { quantity: true } }),
    db.inventoryTransaction.groupBy({ by: ["inventoryItemId"], where: { inventoryItemId: { in: itemIds }, fromLocation: { not: null } }, _sum: { quantity: true } }),
  ]);
  const inMap = sumGroupedByItem(inSums);
  const outMap = sumGroupedByItem(outSums);
  const result: Record<string, number> = {};
  for (const id of itemIds) result[id] = (inMap.get(id) ?? 0) - (outMap.get(id) ?? 0);
  return result;
}

export async function getBulkAllWarehousesQuantities(db: Db, itemIds: string[]): Promise<Record<string, number>> {
  if (itemIds.length === 0) return {};
  const warehouses = await prisma.warehouse.findMany({ select: { id: true } });
  const warehouseIds = warehouses.map((w) => w.id);
  const [inSums, outSums] = await Promise.all([
    db.inventoryTransaction.groupBy({ by: ["inventoryItemId"], where: { inventoryItemId: { in: itemIds }, toLocation: { in: warehouseIds } }, _sum: { quantity: true } }),
    db.inventoryTransaction.groupBy({ by: ["inventoryItemId"], where: { inventoryItemId: { in: itemIds }, fromLocation: { in: warehouseIds } }, _sum: { quantity: true } }),
  ]);
  const inMap = sumGroupedByItem(inSums);
  const outMap = sumGroupedByItem(outSums);
  const result: Record<string, number> = {};
  for (const id of itemIds) result[id] = (inMap.get(id) ?? 0) - (outMap.get(id) ?? 0);
  return result;
}

// Mirrors generateExpenseNumber()/generateOrderNumber(): nullable, not
// backfilled -- only transactions created after this shipped get one. Accepts
// an explicit db handle so callers creating several numbered rows inside one
// $transaction see their own uncommitted prior rows when computing the next
// sequence number.
export async function generateInventoryTransactionNumber(db: Db = prisma): Promise<string> {
  const date = new Date();
  const numberPrefix = `STK-${date.getFullYear()}-`;
  const last = await db.inventoryTransaction.findFirst({
    where: { number: { startsWith: numberPrefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = last?.number ? parseInt(last.number.slice(numberPrefix.length), 10) : 0;
  return `${numberPrefix}${String(lastSeq + 1).padStart(6, "0")}`;
}

export type WarehouseStockRow = {
  itemId: string;
  displayName: string;
  unit: string;
  category: string;
  warehouseQty: number;
  employeeQty: number;
  totalQty: number;
  minimumMainStock: number;
  costPrice: number | null;
  supplierName: string | null;
  stockValue: number;
  status: MainStockStatus;
};

export async function getWarehouseStockSummary(warehouseId: string): Promise<WarehouseStockRow[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { status: "Active" },
    orderBy: { name: "asc" },
    include: { supplier: { select: { name: true } } },
  });
  const itemIds = items.map((i) => i.id);
  const [warehouseQtyMap, totalQtyMap, allWarehousesQtyMap] = await Promise.all([
    getBulkLocationQuantities(prisma, itemIds, warehouseId),
    getBulkItemTotalQuantities(prisma, itemIds),
    getBulkAllWarehousesQuantities(prisma, itemIds),
  ]);
  return items.map((item) => {
    const warehouseQty = warehouseQtyMap[item.id] ?? 0;
    const totalQty = totalQtyMap[item.id] ?? 0;
    const allWarehousesQty = allWarehousesQtyMap[item.id] ?? 0;
    const status: MainStockStatus =
      warehouseQty === 0 ? "Out of Stock" : warehouseQty <= item.minimumMainStock ? "Low Stock" : "OK";
    return {
      itemId: item.id,
      displayName: getInventoryItemDisplayName(item),
      unit: item.unit,
      category: item.category,
      warehouseQty,
      // System-wide employee-held quantity (not scoped to this warehouse) --
      // totalQty minus stock sitting in ANY warehouse, not just this one.
      employeeQty: totalQty - allWarehousesQty,
      totalQty,
      minimumMainStock: item.minimumMainStock,
      costPrice: item.costPrice,
      supplierName: item.supplier?.name ?? null,
      stockValue: warehouseQty * (item.costPrice ?? 0),
      status,
    };
  });
}

export type AllWarehousesSummaryRow = { warehouseId: string; warehouseName: string; rows: WarehouseStockRow[] };

export async function getAllWarehousesStockSummary(): Promise<AllWarehousesSummaryRow[]> {
  const warehouses = await getWarehouses("Active");
  return Promise.all(
    warehouses.map(async (w) => ({ warehouseId: w.id, warehouseName: w.name, rows: await getWarehouseStockSummary(w.id) }))
  );
}

export type EmployeeInventoryRow = {
  itemId: string;
  displayName: string;
  unit: string;
  current: number;
  required: number | null;
  minimum: number | null;
  status: EmployeeStockStatus;
};

export async function getEmployeeInventory(employeeId: string): Promise<EmployeeInventoryRow[]> {
  const [txItems, requirements] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where: { OR: [{ fromLocation: employeeId }, { toLocation: employeeId }] },
      select: { inventoryItemId: true },
      distinct: ["inventoryItemId"],
    }),
    prisma.employeeInventoryRequirement.findMany({ where: { employeeId } }),
  ]);
  const itemIds = new Set([...txItems.map((t) => t.inventoryItemId), ...requirements.map((r) => r.inventoryItemId)]);
  const items = await prisma.inventoryItem.findMany({ where: { id: { in: [...itemIds] } } });
  const reqByItem = new Map(requirements.map((r) => [r.inventoryItemId, r]));

  return Promise.all(
    items.map(async (item) => {
      const current = await getLocationQuantity(prisma, item.id, employeeId);
      const req = reqByItem.get(item.id);
      return {
        itemId: item.id,
        displayName: getInventoryItemDisplayName(item),
        unit: item.unit,
        current,
        required: req?.requiredQuantity ?? null,
        minimum: req?.minimumQuantity ?? null,
        status: deriveEmployeeStockStatus(current, req?.requiredQuantity ?? null, req?.minimumQuantity ?? null),
      };
    })
  );
}

export async function distributeStock(
  adminId: string,
  fromWarehouseId: string,
  employeeId: string,
  lines: { inventoryItemId: string; quantity: number }[]
): Promise<InventoryActionResult> {
  if (lines.length === 0) return { ok: false, error: "Add at least one item to distribute." };
  if (lines.some((l) => !(l.quantity > 0))) return { ok: false, error: "Enter a valid quantity for every item." };

  try {
    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const available = await getLocationQuantity(tx, line.inventoryItemId, fromWarehouseId);
        if (line.quantity > available) {
          const item = await tx.inventoryItem.findUnique({ where: { id: line.inventoryItemId } });
          throw new InsufficientStockError(
            `Insufficient Stock for ${item ? getInventoryItemDisplayName(item) : "item"} — Available: ${available.toLocaleString()}, Requested: ${line.quantity.toLocaleString()}.`
          );
        }
        const number = await generateInventoryTransactionNumber(tx);
        await tx.inventoryTransaction.create({
          data: {
            number,
            inventoryItemId: line.inventoryItemId,
            type: "Stock Transfer",
            quantity: line.quantity,
            fromLocation: fromWarehouseId,
            toLocation: employeeId,
            createdById: adminId,
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) return { ok: false, error: err.message };
    throw err;
  }
  return { ok: true };
}

export async function addStock(
  adminId: string,
  warehouseId: string,
  inventoryItemId: string,
  quantity: number,
  notes?: string
): Promise<InventoryActionResult> {
  if (!(quantity > 0)) return { ok: false, error: "Enter a valid quantity." };
  const [item, warehouse] = await Promise.all([
    prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } }),
    prisma.warehouse.findUnique({ where: { id: warehouseId } }),
  ]);
  if (!item) return { ok: false, error: "Inventory item not found." };
  if (!warehouse) return { ok: false, error: "Warehouse not found." };

  const number = await generateInventoryTransactionNumber();
  await prisma.inventoryTransaction.create({
    data: {
      number,
      inventoryItemId,
      type: "Stock Received",
      quantity,
      fromLocation: null,
      toLocation: warehouseId,
      notes: notes?.trim() || null,
      createdById: adminId,
    },
  });
  return { ok: true };
}

export type SupplierPurchaseInput = {
  warehouseId: string;
  inventoryItemId: string;
  quantity: number;
  supplierName: string;
  unitCost: number;
  date: Date;
  notes?: string;
};

// No Vendor/PurchaseOrder model exists anywhere in this app (confirmed via
// exploration) -- this pairs the stock-in transaction with a plain Expense
// row (category "Inventory Purchase", vendor = supplier name), the same shape
// createExpense() already produces, done inline here since it's atomic with
// the InventoryTransaction rather than routed through that action.
// supplierName is free text here (matching Expense.vendor's convention) --
// independent of the new, real Supplier register, which InventoryItem.supplierId
// links to for catalog purposes only.
export async function recordSupplierPurchase(
  adminId: string,
  input: SupplierPurchaseInput
): Promise<InventoryActionResult> {
  if (!(input.quantity > 0)) return { ok: false, error: "Enter a valid quantity." };
  if (!(input.unitCost >= 0)) return { ok: false, error: "Enter a valid unit cost." };
  if (!input.supplierName.trim()) return { ok: false, error: "Supplier name is required." };

  const [item, warehouse] = await Promise.all([
    prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } }),
    prisma.warehouse.findUnique({ where: { id: input.warehouseId } }),
  ]);
  if (!item) return { ok: false, error: "Inventory item not found." };
  if (!warehouse) return { ok: false, error: "Warehouse not found." };

  const total = input.quantity * input.unitCost;
  const [stkNumber, expNumber] = await Promise.all([generateInventoryTransactionNumber(), generateExpenseNumber()]);

  await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        number: stkNumber,
        inventoryItemId: input.inventoryItemId,
        type: "Stock Received",
        quantity: input.quantity,
        fromLocation: null,
        toLocation: input.warehouseId,
        notes: input.notes?.trim() || null,
        createdById: adminId,
      },
    }),
    prisma.expense.create({
      data: {
        number: expNumber,
        date: input.date,
        description: `Stock purchase — ${getInventoryItemDisplayName(item)} × ${input.quantity.toLocaleString()} (${warehouse.name})`,
        category: "Inventory Purchase",
        payment: "Bank Transfer",
        amount: total,
        vendor: input.supplierName.trim(),
        createdById: adminId,
      },
    }),
  ]);
  return { ok: true };
}

export async function returnToWarehouse(
  adminId: string,
  employeeId: string,
  toWarehouseId: string,
  inventoryItemId: string,
  quantity: number
): Promise<InventoryActionResult> {
  if (!(quantity > 0)) return { ok: false, error: "Enter a valid quantity." };
  const available = await getLocationQuantity(prisma, inventoryItemId, employeeId);
  if (quantity > available) {
    return {
      ok: false,
      error: `Insufficient Stock — Available: ${available.toLocaleString()}, Requested: ${quantity.toLocaleString()}.`,
    };
  }
  const number = await generateInventoryTransactionNumber();
  await prisma.inventoryTransaction.create({
    data: {
      number,
      inventoryItemId,
      type: "Stock Returned",
      quantity,
      fromLocation: employeeId,
      toLocation: toWarehouseId,
      createdById: adminId,
    },
  });
  return { ok: true };
}

async function recordLossEvent(
  adminId: string,
  location: string,
  inventoryItemId: string,
  quantity: number,
  type: "Stock Damaged" | "Stock Lost",
  reason: string,
  notes?: string
): Promise<InventoryActionResult> {
  if (!(quantity > 0)) return { ok: false, error: "Enter a valid quantity." };
  if (!reason.trim()) return { ok: false, error: "A reason is required." };
  const available = await getLocationQuantity(prisma, inventoryItemId, location);
  if (quantity > available) {
    return {
      ok: false,
      error: `Insufficient Stock — Available: ${available.toLocaleString()}, Requested: ${quantity.toLocaleString()}.`,
    };
  }
  const number = await generateInventoryTransactionNumber();
  await prisma.inventoryTransaction.create({
    data: {
      number,
      inventoryItemId,
      type,
      quantity,
      fromLocation: location,
      toLocation: null,
      reason: reason.trim(),
      notes: notes?.trim() || null,
      createdById: adminId,
    },
  });
  return { ok: true };
}

// A shortage only ever means "the employee needs more stock" -- Lost/Damaged
// are only ever recorded here, explicitly, by an admin action. Never inferred
// from a shortage.
export async function recordDamaged(
  adminId: string,
  location: string,
  inventoryItemId: string,
  quantity: number,
  reason: string,
  notes?: string
): Promise<InventoryActionResult> {
  return recordLossEvent(adminId, location, inventoryItemId, quantity, "Stock Damaged", reason, notes);
}

export async function recordLost(
  adminId: string,
  location: string,
  inventoryItemId: string,
  quantity: number,
  reason: string,
  notes?: string
): Promise<InventoryActionResult> {
  return recordLossEvent(adminId, location, inventoryItemId, quantity, "Stock Lost", reason, notes);
}

export async function adjustStock(
  adminId: string,
  location: string,
  inventoryItemId: string,
  newPhysicalCount: number,
  reason: string
): Promise<InventoryActionResult> {
  if (!(newPhysicalCount >= 0)) return { ok: false, error: "Enter a valid physical count." };
  if (!reason.trim()) return { ok: false, error: "Adjustment reason is required." };
  const current = await getLocationQuantity(prisma, inventoryItemId, location);
  const delta = newPhysicalCount - current;
  if (delta === 0) return { ok: false, error: "Physical count matches the current recorded quantity — nothing to adjust." };

  const number = await generateInventoryTransactionNumber();
  await prisma.inventoryTransaction.create({
    data: {
      number,
      inventoryItemId,
      type: "Stock Adjustment",
      quantity: Math.abs(delta),
      fromLocation: delta < 0 ? location : null,
      toLocation: delta > 0 ? location : null,
      reason: reason.trim(),
      createdById: adminId,
    },
  });
  return { ok: true };
}

// Called from inside createInvoiceFromWizard's own $transaction (passed as
// `tx`) so an insufficient-stock line rolls back the whole Invoice creation --
// invoice, items, and inventory usage are all-or-nothing. Throws rather than
// returning a Result since the caller needs the whole transaction to abort.
export async function recordInventoryUsage(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  employeeId: string,
  lines: { inventoryItemId: string; quantity: number }[],
  createdById: string
): Promise<void> {
  for (const line of lines) {
    if (!(line.quantity > 0)) {
      throw new InsufficientStockError("Enter a valid quantity for every inventory item.");
    }
    const available = await getLocationQuantity(tx, line.inventoryItemId, employeeId);
    if (line.quantity > available) {
      const item = await tx.inventoryItem.findUnique({ where: { id: line.inventoryItemId } });
      throw new InsufficientStockError(
        `Insufficient Stock for ${item ? getInventoryItemDisplayName(item) : "item"} — Available: ${available.toLocaleString()}, Requested: ${line.quantity.toLocaleString()}.`
      );
    }
    const number = await generateInventoryTransactionNumber(tx);
    const transaction = await tx.inventoryTransaction.create({
      data: {
        number,
        inventoryItemId: line.inventoryItemId,
        type: "Stock Used",
        quantity: line.quantity,
        fromLocation: employeeId,
        toLocation: null,
        invoiceId,
        createdById,
      },
    });
    await tx.invoiceInventoryUsage.create({
      data: { invoiceId, inventoryItemId: line.inventoryItemId, employeeId, quantity: line.quantity, transactionId: transaction.id },
    });
  }
}

// Reverses every InvoiceInventoryUsage row for an invoice by writing a new
// "Stock Reversed" InventoryTransaction per line (never by deleting the
// original "Stock Used" row -- historical transactions are never deleted, per
// spec Rule 20). The join row itself is deleted since its only purpose is
// pointing at "what this invoice currently still has outstanding to reverse";
// the permanent ledger entry (the original "Stock Used" transaction) is
// untouched. Called from updateInvoiceFromWizard (reverse-then-reapply) and
// deleteInvoice (reverse only), inside their own transactions.
export async function reverseInventoryUsage(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  reason: string,
  performedById: string
): Promise<void> {
  const usages = await tx.invoiceInventoryUsage.findMany({ where: { invoiceId } });
  for (const usage of usages) {
    const number = await generateInventoryTransactionNumber(tx);
    await tx.inventoryTransaction.create({
      data: {
        number,
        inventoryItemId: usage.inventoryItemId,
        type: "Stock Reversed",
        quantity: usage.quantity,
        fromLocation: null,
        toLocation: usage.employeeId,
        invoiceId,
        reason,
        createdById: performedById,
      },
    });
    await tx.invoiceInventoryUsage.delete({ where: { id: usage.id } });
  }
}

export async function getMostUsedItems(
  range?: { from: Date; to: Date }
): Promise<{ itemId: string; displayName: string; unit: string; qtyUsed: number }[]> {
  const grouped = await prisma.inventoryTransaction.groupBy({
    by: ["inventoryItemId"],
    where: { type: "Stock Used", ...(range ? { createdAt: { gte: range.from, lte: range.to } } : {}) },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });
  const items = await prisma.inventoryItem.findMany({ where: { id: { in: grouped.map((g) => g.inventoryItemId) } } });
  const byId = new Map(items.map((i) => [i.id, i]));
  return grouped
    .filter((g) => byId.has(g.inventoryItemId))
    .map((g) => {
      const item = byId.get(g.inventoryItemId)!;
      return { itemId: g.inventoryItemId, displayName: getInventoryItemDisplayName(item), unit: item.unit, qtyUsed: g._sum.quantity ?? 0 };
    });
}

export type EmployeeStockAlert = { employeeId: string; employeeName: string; itemsNeeded: number; severity: "high" | "medium" };

// Feeds the admin dashboard's "Employees Requiring Stock" tile -- computed on
// the fly, mirroring getVehicleAlerts()/getRentalAlerts() exactly.
export async function getEmployeesRequiringStock(): Promise<EmployeeStockAlert[]> {
  const requirements = await prisma.employeeInventoryRequirement.findMany({ include: { employee: true } });
  const byEmployee = new Map<string, { employeeName: string; itemsNeeded: number }>();
  for (const req of requirements) {
    const current = await getLocationQuantity(prisma, req.inventoryItemId, req.employeeId);
    if (current < req.requiredQuantity) {
      const needed = req.requiredQuantity - current;
      const entry = byEmployee.get(req.employeeId) ?? { employeeName: req.employee.name, itemsNeeded: 0 };
      entry.itemsNeeded += needed;
      byEmployee.set(req.employeeId, entry);
    }
  }
  return [...byEmployee.entries()]
    .map(([employeeId, v]) => ({
      employeeId,
      employeeName: v.employeeName,
      itemsNeeded: v.itemsNeeded,
      severity: (v.itemsNeeded >= 5 ? "high" : "medium") as "high" | "medium",
    }))
    .sort((a, b) => b.itemsNeeded - a.itemsNeeded);
}

export type EmployeeInventoryReportRow = {
  itemId: string;
  displayName: string;
  unit: string;
  received: number;
  used: number;
  returned: number;
  damaged: number;
  lost: number;
  current: number;
  required: number | null;
  needed: number;
  status: EmployeeStockStatus;
  costPrice: number | null;
};

export type EmployeeInventoryReport = {
  rows: EmployeeInventoryReportRow[];
  summary: {
    totalDifferentItems: number;
    totalCurrentQuantity: number;
    itemsUsed: number;
    itemsReturned: number;
    damaged: number;
    lost: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalItemsNeeded: number;
  };
  value: { currentValue: number; usedCost: number; damagedLostCost: number; shortageValue: number };
};

export async function getEmployeeInventoryReport(
  employeeId: string,
  range?: { from: Date; to: Date }
): Promise<EmployeeInventoryReport> {
  const dateFilter = range ? { createdAt: { gte: range.from, lte: range.to } } : {};
  const [txItems, requirements] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where: { OR: [{ fromLocation: employeeId }, { toLocation: employeeId }] },
      select: { inventoryItemId: true },
      distinct: ["inventoryItemId"],
    }),
    prisma.employeeInventoryRequirement.findMany({ where: { employeeId } }),
  ]);
  const itemIds = new Set([...txItems.map((t) => t.inventoryItemId), ...requirements.map((r) => r.inventoryItemId)]);
  const items = await prisma.inventoryItem.findMany({ where: { id: { in: [...itemIds] } } });
  const reqByItem = new Map(requirements.map((r) => [r.inventoryItemId, r]));

  const rows: EmployeeInventoryReportRow[] = [];
  for (const item of items) {
    const [receivedSum, usedSum, returnedSum, damagedSum, lostSum, current] = await Promise.all([
      // "Received" also folds in Stock Reversed (invoice-cancellation returns) --
      // both increase the employee's holdings the same way a distribution does,
      // and the spec's own report table has no separate reversal column.
      prisma.inventoryTransaction.aggregate({
        where: { inventoryItemId: item.id, toLocation: employeeId, type: { in: ["Stock Transfer", "Stock Reversed"] }, ...dateFilter },
        _sum: { quantity: true },
      }),
      prisma.inventoryTransaction.aggregate({
        where: { inventoryItemId: item.id, fromLocation: employeeId, type: "Stock Used", ...dateFilter },
        _sum: { quantity: true },
      }),
      prisma.inventoryTransaction.aggregate({
        where: { inventoryItemId: item.id, fromLocation: employeeId, type: "Stock Returned", ...dateFilter },
        _sum: { quantity: true },
      }),
      prisma.inventoryTransaction.aggregate({
        where: { inventoryItemId: item.id, fromLocation: employeeId, type: "Stock Damaged", ...dateFilter },
        _sum: { quantity: true },
      }),
      prisma.inventoryTransaction.aggregate({
        where: { inventoryItemId: item.id, fromLocation: employeeId, type: "Stock Lost", ...dateFilter },
        _sum: { quantity: true },
      }),
      getLocationQuantity(prisma, item.id, employeeId),
    ]);
    const req = reqByItem.get(item.id);
    const status = deriveEmployeeStockStatus(current, req?.requiredQuantity ?? null, req?.minimumQuantity ?? null);
    const needed = req ? Math.max(0, req.requiredQuantity - current) : 0;
    rows.push({
      itemId: item.id,
      displayName: getInventoryItemDisplayName(item),
      unit: item.unit,
      received: receivedSum._sum.quantity ?? 0,
      used: usedSum._sum.quantity ?? 0,
      returned: returnedSum._sum.quantity ?? 0,
      damaged: damagedSum._sum.quantity ?? 0,
      lost: lostSum._sum.quantity ?? 0,
      current,
      required: req?.requiredQuantity ?? null,
      needed,
      status,
      costPrice: item.costPrice,
    });
  }

  const summary = {
    totalDifferentItems: rows.length,
    totalCurrentQuantity: rows.reduce((s, r) => s + r.current, 0),
    itemsUsed: rows.reduce((s, r) => s + r.used, 0),
    itemsReturned: rows.reduce((s, r) => s + r.returned, 0),
    damaged: rows.reduce((s, r) => s + r.damaged, 0),
    lost: rows.reduce((s, r) => s + r.lost, 0),
    lowStockItems: rows.filter((r) => r.status === "Low Stock").length,
    outOfStockItems: rows.filter((r) => r.status === "Out of Stock").length,
    totalItemsNeeded: rows.reduce((s, r) => s + r.needed, 0),
  };

  // Always Cost Price, never Selling Price, per spec §45.
  const value = {
    currentValue: rows.reduce((s, r) => s + r.current * (r.costPrice ?? 0), 0),
    usedCost: rows.reduce((s, r) => s + r.used * (r.costPrice ?? 0), 0),
    damagedLostCost: rows.reduce((s, r) => s + (r.damaged + r.lost) * (r.costPrice ?? 0), 0),
    shortageValue: rows.reduce((s, r) => s + r.needed * (r.costPrice ?? 0), 0),
  };

  return { rows, summary, value };
}

export type InventoryTransactionFilters = {
  inventoryItemId?: string;
  employeeId?: string;
  type?: string;
  from?: Date;
  to?: Date;
  search?: string;
};

export type InventoryTransactionRow = {
  id: string;
  number: string | null;
  date: Date;
  itemDisplayName: string;
  unit: string;
  type: string;
  quantity: number;
  fromLabel: string;
  toLabel: string;
  employeeLabel: string | null;
  reference: string | null;
  createdByName: string;
};

export async function getInventoryTransactions(filters: InventoryTransactionFilters = {}): Promise<InventoryTransactionRow[]> {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      inventoryItemId: filters.inventoryItemId,
      type: filters.type,
      ...(filters.from || filters.to
        ? { createdAt: { gte: filters.from, lte: filters.to } }
        : {}),
      ...(filters.employeeId
        ? { OR: [{ fromLocation: filters.employeeId }, { toLocation: filters.employeeId }] }
        : {}),
    },
    include: { inventoryItem: true, createdBy: true, invoice: { select: { number: true } } },
    orderBy: { createdAt: "desc" },
  });

  const locationIds = new Set<string>();
  for (const t of transactions) {
    if (t.fromLocation) locationIds.add(t.fromLocation);
    if (t.toLocation) locationIds.add(t.toLocation);
  }
  const [warehouses, employees] = await Promise.all([
    prisma.warehouse.findMany({ where: { id: { in: [...locationIds] } } }),
    prisma.employee.findMany({ where: { id: { in: [...locationIds] } } }),
  ]);
  const warehouseName = new Map(warehouses.map((w) => [w.id, w.name]));
  const employeeName = new Map(employees.map((e) => [e.id, e.name]));

  const resolveLocation = (loc: string | null): string => {
    if (loc === null) return "—";
    if (warehouseName.has(loc)) return warehouseName.get(loc)!;
    return employeeName.get(loc) ?? "Unknown Employee";
  };
  const resolveEmployeeLabel = (loc: string | null): string | null =>
    loc && !warehouseName.has(loc) ? employeeName.get(loc) ?? null : null;

  return transactions
    .filter((t) => !filters.search || getInventoryItemDisplayName(t.inventoryItem).toLowerCase().includes(filters.search!.toLowerCase()))
    .map((t) => ({
      id: t.id,
      number: t.number,
      date: t.createdAt,
      itemDisplayName: getInventoryItemDisplayName(t.inventoryItem),
      unit: t.inventoryItem.unit,
      type: t.type,
      quantity: t.quantity,
      fromLabel: resolveLocation(t.fromLocation),
      toLabel: resolveLocation(t.toLocation),
      employeeLabel: resolveEmployeeLabel(t.fromLocation) ?? resolveEmployeeLabel(t.toLocation),
      reference: t.invoice?.number ?? t.reason ?? null,
      createdByName: t.createdBy.name,
    }));
}

export type InventoryDashboardSummary = {
  totalItems: number;
  totalStock: number;
  warehouseStock: number;
  employeeStock: number;
  lowStock: number;
  outOfStock: number;
  employeesWithShortages: number;
  totalInventoryValue: number;
};

// Company-wide rollup -- warehouseStock/lowStock/outOfStock are summed across
// EVERY warehouse combined, not scoped to any one of them (see the per-warehouse
// view, getWarehouseStockSummary, for a single warehouse's own status).
export async function computeInventoryDashboardSummary(): Promise<InventoryDashboardSummary> {
  const items = await prisma.inventoryItem.findMany({ where: { status: "Active" } });
  const itemIds = items.map((i) => i.id);
  let warehouseStock = 0;
  let employeeStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let totalInventoryValue = 0;

  const [allWarehousesQtyMap, totalQtyMap] = await Promise.all([
    getBulkAllWarehousesQuantities(prisma, itemIds),
    getBulkItemTotalQuantities(prisma, itemIds),
  ]);

  for (const item of items) {
    const allWarehousesQty = allWarehousesQtyMap[item.id] ?? 0;
    const totalQty = totalQtyMap[item.id] ?? 0;
    warehouseStock += allWarehousesQty;
    employeeStock += totalQty - allWarehousesQty;
    if (allWarehousesQty === 0) outOfStock++;
    else if (allWarehousesQty <= item.minimumMainStock) lowStock++;
    // Warehouse valuation only, per spec §44 -- not the employee-held portion.
    totalInventoryValue += allWarehousesQty * (item.costPrice ?? 0);
  }

  const employeesRequiringStock = await getEmployeesRequiringStock();
  return {
    totalItems: items.length,
    totalStock: warehouseStock + employeeStock,
    warehouseStock,
    employeeStock,
    lowStock,
    outOfStock,
    employeesWithShortages: employeesRequiringStock.length,
    totalInventoryValue,
  };
}

// The figure folded into computeIncomeStatement's costOfSales
// (src/lib/financialReportsIncomeStatement.ts) -- Cost Price × quantity for
// every inventory item consumed on an Invoice dated within range.
export async function computeInventoryCogs(range: DateRange): Promise<number> {
  const usages = await prisma.invoiceInventoryUsage.findMany({
    where: { invoice: { date: buildCustomDateRange(range.from, range.to) } },
    include: { inventoryItem: { select: { costPrice: true } } },
  });
  return usages.reduce((sum, u) => sum + u.quantity * (u.inventoryItem.costPrice ?? 0), 0);
}
