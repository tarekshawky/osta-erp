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
] as const;

// Sentinel used in InventoryTransaction.fromLocation/toLocation for the Main
// Warehouse. The other two possible values for those columns are an
// Employee.id, or null (meaning external -- a supplier on receipt, or
// consumed/damaged/lost/reversed on the way out). Kept as plain strings, not
// real Prisma relations, since a relation can't conditionally point at a
// sentinel or a real row -- resolved to employee names in application code.
export const MAIN_LOCATION = "MAIN";

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

export type MainWarehouseRow = {
  itemId: string;
  displayName: string;
  unit: string;
  category: string;
  mainQty: number;
  employeeQty: number;
  totalQty: number;
  minimumMainStock: number;
  costPrice: number | null;
  status: MainStockStatus;
};

export async function getMainWarehouseSummary(): Promise<MainWarehouseRow[]> {
  const items = await prisma.inventoryItem.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } });
  return Promise.all(
    items.map(async (item) => {
      const [mainQty, totalQty] = await Promise.all([
        getLocationQuantity(prisma, item.id, MAIN_LOCATION),
        getItemTotalQuantity(prisma, item.id),
      ]);
      const status: MainStockStatus =
        mainQty === 0 ? "Out of Stock" : mainQty <= item.minimumMainStock ? "Low Stock" : "OK";
      return {
        itemId: item.id,
        displayName: getInventoryItemDisplayName(item),
        unit: item.unit,
        category: item.category,
        mainQty,
        employeeQty: totalQty - mainQty,
        totalQty,
        minimumMainStock: item.minimumMainStock,
        costPrice: item.costPrice,
        status,
      };
    })
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
  employeeId: string,
  lines: { inventoryItemId: string; quantity: number }[]
): Promise<InventoryActionResult> {
  if (lines.length === 0) return { ok: false, error: "Add at least one item to distribute." };
  if (lines.some((l) => !(l.quantity > 0))) return { ok: false, error: "Enter a valid quantity for every item." };

  try {
    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const available = await getLocationQuantity(tx, line.inventoryItemId, MAIN_LOCATION);
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
            fromLocation: MAIN_LOCATION,
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
  inventoryItemId: string,
  quantity: number,
  notes?: string
): Promise<InventoryActionResult> {
  if (!(quantity > 0)) return { ok: false, error: "Enter a valid quantity." };
  const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } });
  if (!item) return { ok: false, error: "Inventory item not found." };

  const number = await generateInventoryTransactionNumber();
  await prisma.inventoryTransaction.create({
    data: {
      number,
      inventoryItemId,
      type: "Stock Received",
      quantity,
      fromLocation: null,
      toLocation: MAIN_LOCATION,
      notes: notes?.trim() || null,
      createdById: adminId,
    },
  });
  return { ok: true };
}

export type SupplierPurchaseInput = {
  inventoryItemId: string;
  quantity: number;
  supplierName: string;
  unitCost: number;
  date: Date;
  notes?: string;
};

// No Supplier/Vendor/PurchaseOrder model exists anywhere in this app (confirmed
// via exploration) -- this pairs the stock-in transaction with a plain Expense
// row (category "Inventory Purchase", vendor = supplier name), the same shape
// createExpense() already produces, done inline here since it's atomic with
// the InventoryTransaction rather than routed through that action.
export async function recordSupplierPurchase(
  adminId: string,
  input: SupplierPurchaseInput
): Promise<InventoryActionResult> {
  if (!(input.quantity > 0)) return { ok: false, error: "Enter a valid quantity." };
  if (!(input.unitCost >= 0)) return { ok: false, error: "Enter a valid unit cost." };
  if (!input.supplierName.trim()) return { ok: false, error: "Supplier name is required." };

  const item = await prisma.inventoryItem.findUnique({ where: { id: input.inventoryItemId } });
  if (!item) return { ok: false, error: "Inventory item not found." };

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
        toLocation: MAIN_LOCATION,
        notes: input.notes?.trim() || null,
        createdById: adminId,
      },
    }),
    prisma.expense.create({
      data: {
        number: expNumber,
        date: input.date,
        description: `Stock purchase — ${getInventoryItemDisplayName(item)} × ${input.quantity.toLocaleString()}`,
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
      toLocation: MAIN_LOCATION,
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

  const employeeIds = new Set<string>();
  for (const t of transactions) {
    if (t.fromLocation && t.fromLocation !== MAIN_LOCATION) employeeIds.add(t.fromLocation);
    if (t.toLocation && t.toLocation !== MAIN_LOCATION) employeeIds.add(t.toLocation);
  }
  const employees = await prisma.employee.findMany({ where: { id: { in: [...employeeIds] } } });
  const employeeName = new Map(employees.map((e) => [e.id, e.name]));

  const resolveLocation = (loc: string | null): string => {
    if (loc === null) return "—";
    if (loc === MAIN_LOCATION) return "Main Warehouse";
    return employeeName.get(loc) ?? "Unknown Employee";
  };
  const resolveEmployeeLabel = (loc: string | null): string | null =>
    loc && loc !== MAIN_LOCATION ? employeeName.get(loc) ?? null : null;

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
  mainStock: number;
  employeeStock: number;
  lowStock: number;
  outOfStock: number;
  employeesWithShortages: number;
  totalInventoryValue: number;
};

export async function computeInventoryDashboardSummary(): Promise<InventoryDashboardSummary> {
  const items = await prisma.inventoryItem.findMany({ where: { status: "Active" } });
  let mainStock = 0;
  let employeeStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let totalInventoryValue = 0;

  for (const item of items) {
    const [mainQty, totalQty] = await Promise.all([
      getLocationQuantity(prisma, item.id, MAIN_LOCATION),
      getItemTotalQuantity(prisma, item.id),
    ]);
    mainStock += mainQty;
    employeeStock += totalQty - mainQty;
    if (mainQty === 0) outOfStock++;
    else if (mainQty <= item.minimumMainStock) lowStock++;
    // Main Warehouse valuation only, per spec §44 -- not the employee-held portion.
    totalInventoryValue += mainQty * (item.costPrice ?? 0);
  }

  const employeesRequiringStock = await getEmployeesRequiringStock();
  return {
    totalItems: items.length,
    totalStock: mainStock + employeeStock,
    mainStock,
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
