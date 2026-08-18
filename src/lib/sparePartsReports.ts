import { prisma } from "./prisma";
import { buildCustomDateRange } from "./dateRangeFilter";

export type DateRangeInput = { from: Date; to: Date };

export type SparePartSaleRow = {
  invoiceItemId: string;
  itemName: string;
  category: string | null;
  quantity: number;
  originalPrice: number;
  finalPrice: number;
  purchaseCost: number | null;
  revenue: number;
  profit: number;
  employeeName: string;
  branchName: string | null;
  date: Date;
  invoiceNumber: string;
};

export type SparePartsSalesReport = {
  rows: SparePartSaleRow[];
  summary: { totalQuantity: number; totalRevenue: number; totalProfit: number };
};

// One row per SparePart-type InvoiceItem line -- Purchase Cost/Profit are
// derived from the linked InventoryItem.costPrice at report-query time (never
// stored on the line), consistent with this session's "derive, don't
// denormalize" convention.
export async function getSparePartsSalesReport(range?: DateRangeInput): Promise<SparePartsSalesReport> {
  const items = await prisma.invoiceItem.findMany({
    where: {
      itemType: "SparePart",
      ...(range ? { invoice: { date: buildCustomDateRange(range.from, range.to) } } : {}),
    },
    include: {
      invoice: { include: { createdBy: { select: { name: true } }, team: { select: { name: true } } } },
      inventoryItem: { select: { costPrice: true, category: true } },
    },
    orderBy: { invoice: { date: "desc" } },
  });

  const rows: SparePartSaleRow[] = items.map((item) => {
    const costPrice = item.inventoryItem?.costPrice ?? null;
    const revenue = item.qty * item.unitPrice;
    const profit = item.qty * (item.unitPrice - (costPrice ?? 0));
    return {
      invoiceItemId: item.id,
      itemName: item.serviceName,
      category: item.inventoryItem?.category ?? null,
      quantity: item.qty,
      originalPrice: item.originalPrice ?? item.unitPrice,
      finalPrice: item.unitPrice,
      purchaseCost: costPrice,
      revenue,
      profit,
      employeeName: item.invoice.createdBy.name,
      branchName: item.invoice.team?.name ?? null,
      date: item.invoice.date,
      invoiceNumber: item.invoice.number,
    };
  });

  return {
    rows,
    summary: {
      totalQuantity: rows.reduce((s, r) => s + r.quantity, 0),
      totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
      totalProfit: rows.reduce((s, r) => s + r.profit, 0),
    },
  };
}

export type LabourSaleRow = {
  invoiceItemId: string;
  labourType: string;
  quantity: number;
  defaultPrice: number;
  finalPrice: number;
  revenue: number;
  employeeName: string;
  branchName: string | null;
  date: Date;
  invoiceNumber: string;
};

export type LabourSalesReport = {
  rows: LabourSaleRow[];
  summary: { totalQuantity: number; totalRevenue: number };
};

export async function getLabourSalesReport(range?: DateRangeInput): Promise<LabourSalesReport> {
  const items = await prisma.invoiceItem.findMany({
    where: {
      itemType: "Labour",
      ...(range ? { invoice: { date: buildCustomDateRange(range.from, range.to) } } : {}),
    },
    include: {
      invoice: { include: { createdBy: { select: { name: true } }, team: { select: { name: true } } } },
    },
    orderBy: { invoice: { date: "desc" } },
  });

  const rows: LabourSaleRow[] = items.map((item) => ({
    invoiceItemId: item.id,
    labourType: item.serviceName,
    quantity: item.qty,
    defaultPrice: item.originalPrice ?? item.unitPrice,
    finalPrice: item.unitPrice,
    revenue: item.qty * item.unitPrice,
    employeeName: item.invoice.createdBy.name,
    branchName: item.invoice.team?.name ?? null,
    date: item.invoice.date,
    invoiceNumber: item.invoice.number,
  }));

  return {
    rows,
    summary: {
      totalQuantity: rows.reduce((s, r) => s + r.quantity, 0),
      totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
    },
  };
}

export type PriceModificationRow = {
  invoiceItemId: string;
  itemType: "SparePart" | "Labour";
  itemName: string;
  employeeName: string;
  originalPrice: number;
  finalPrice: number;
  difference: number;
  invoiceNumber: string;
  date: Date;
};

export type PriceModificationReport = {
  rows: PriceModificationRow[];
  summary: { count: number; totalDifference: number };
};

// Both SparePart and Labour lines qualify -- a plain Service line never has
// originalPrice set, so it can never appear here. No new audit table: this is
// a derived query over InvoiceItem's existing originalPrice/unitPrice pair.
export async function getPriceModificationReport(range?: DateRangeInput): Promise<PriceModificationReport> {
  const items = await prisma.invoiceItem.findMany({
    where: {
      itemType: { in: ["SparePart", "Labour"] },
      originalPrice: { not: null },
      ...(range ? { invoice: { date: buildCustomDateRange(range.from, range.to) } } : {}),
    },
    include: {
      invoice: { include: { createdBy: { select: { name: true } } } },
    },
    orderBy: { invoice: { date: "desc" } },
  });

  const rows: PriceModificationRow[] = items
    .filter((item) => item.originalPrice != null && item.originalPrice !== item.unitPrice)
    .map((item) => ({
      invoiceItemId: item.id,
      itemType: item.itemType as "SparePart" | "Labour",
      itemName: item.serviceName,
      employeeName: item.invoice.createdBy.name,
      originalPrice: item.originalPrice!,
      finalPrice: item.unitPrice,
      difference: item.unitPrice - item.originalPrice!,
      invoiceNumber: item.invoice.number,
      date: item.invoice.date,
    }));

  return {
    rows,
    summary: {
      count: rows.length,
      totalDifference: rows.reduce((s, r) => s + r.difference, 0),
    },
  };
}
