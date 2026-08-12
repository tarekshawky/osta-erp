import { prisma } from "@/lib/prisma";
import { toWaPhoneDigits } from "@/lib/phone";

export const CUSTOMER_STATUSES = ["Active", "Inactive", "VIP", "Blocked"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_STYLES: Record<string, string> = {
  Active: "bg-green-50 text-green-600",
  Inactive: "bg-slate-100 text-slate-600",
  VIP: "bg-purple-50 text-purple-600",
  Blocked: "bg-red-50 text-red-600",
};

export const BUILDING_TYPES = ["Villa", "Apartment", "Office", "Warehouse", "Other"] as const;

export const CUSTOMER_ACTIVITY_FILTERS = [
  "All Customers",
  "New Customers",
  "Customers with Orders",
  "Customers with Completed Orders",
  "Customers with Outstanding Payments",
  "Inactive Customers",
] as const;
export type CustomerActivityFilter = (typeof CUSTOMER_ACTIVITY_FILTERS)[number];

const NEW_CUSTOMER_WINDOW_DAYS = 30;
const INACTIVE_WINDOW_DAYS = 90;

// Generates the next sequential CUST-000001-style code. Not safe under concurrent
// writers (no DB-level sequence), matching the same best-effort pattern already used
// for Order/Invoice/Quotation numbers elsewhere in this codebase.
export async function generateCustomerCode(): Promise<string> {
  const last = await prisma.customer.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
  const lastSeq = last ? parseInt(last.code.slice("CUST-".length), 10) || 0 : 0;
  return `CUST-${String(lastSeq + 1).padStart(6, "0")}`;
}

export type CustomerFinancials = {
  totalOrders: number;
  completedOrders: number;
  invoiceCount: number;
  // Gross billed value across every invoice regardless of status.
  totalRevenue: number;
  // Actually collected: totalRevenue minus refunds minus whatever is still Unpaid.
  paidAmount: number;
  // Sum of invoice.amount for invoices currently marked Unpaid by the admin.
  outstandingAmount: number;
  lastOrderDate: Date | null;
  lastInvoiceDate: Date | null;
};

const EMPTY_FINANCIALS: CustomerFinancials = {
  totalOrders: 0,
  completedOrders: 0,
  invoiceCount: 0,
  totalRevenue: 0,
  paidAmount: 0,
  outstandingAmount: 0,
  lastOrderDate: null,
  lastInvoiceDate: null,
};

// Batched aggregation (4 queries total, independent of customer count) so the
// Customers list/export can show revenue/orders columns without N+1 queries.
export async function getCustomersFinancialMap(customerIds?: string[]): Promise<Map<string, CustomerFinancials>> {
  const customerFilter = customerIds ? { customerId: { in: customerIds } } : {};

  const [orderStats, completedStats, invoiceStats, unpaidStats] = await Promise.all([
    prisma.order.groupBy({ by: ["customerId"], where: customerFilter, _count: { _all: true }, _max: { date: true } }),
    prisma.order.groupBy({
      by: ["customerId"],
      where: { ...customerFilter, status: "Done" },
      _count: { _all: true },
    }),
    prisma.invoice.groupBy({
      by: ["customerId"],
      where: customerFilter,
      _count: { _all: true },
      _sum: { amount: true, refundedAmount: true },
      _max: { date: true },
    }),
    // Unpaid invoices always carry refundedAmount 0 (a refund can only be recorded
    // against a Paid/Partially Refunded/Refunded invoice), so their full amount is
    // what's still owed.
    prisma.invoice.groupBy({
      by: ["customerId"],
      where: { ...customerFilter, status: "Unpaid" },
      _sum: { amount: true },
    }),
  ]);

  const map = new Map<string, CustomerFinancials>();
  const get = (id: string) => {
    let entry = map.get(id);
    if (!entry) {
      entry = { ...EMPTY_FINANCIALS };
      map.set(id, entry);
    }
    return entry;
  };

  for (const row of orderStats) {
    const entry = get(row.customerId);
    entry.totalOrders = row._count._all;
    entry.lastOrderDate = row._max.date;
  }
  for (const row of completedStats) {
    get(row.customerId).completedOrders = row._count._all;
  }
  for (const row of invoiceStats) {
    const entry = get(row.customerId);
    entry.invoiceCount = row._count._all;
    entry.totalRevenue = row._sum.amount ?? 0;
    // Paid = billed - refunded - still-unpaid; corrected below once unpaidStats is applied.
    entry.paidAmount = (row._sum.amount ?? 0) - (row._sum.refundedAmount ?? 0);
    entry.lastInvoiceDate = row._max.date;
  }
  for (const row of unpaidStats) {
    const entry = get(row.customerId);
    entry.outstandingAmount = row._sum.amount ?? 0;
    entry.paidAmount -= entry.outstandingAmount;
  }

  return map;
}

export function getFinancialsFor(map: Map<string, CustomerFinancials>, customerId: string): CustomerFinancials {
  return map.get(customerId) ?? EMPTY_FINANCIALS;
}

export function matchesActivityFilter(
  filter: CustomerActivityFilter,
  customer: { createdAt: Date },
  financials: CustomerFinancials
): boolean {
  const now = Date.now();
  switch (filter) {
    case "All Customers":
      return true;
    case "New Customers":
      return now - customer.createdAt.getTime() <= NEW_CUSTOMER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    case "Customers with Orders":
      return financials.totalOrders > 0;
    case "Customers with Completed Orders":
      return financials.completedOrders > 0;
    case "Customers with Outstanding Payments":
      return financials.outstandingAmount > 0;
    case "Inactive Customers":
      return !financials.lastOrderDate || now - financials.lastOrderDate.getTime() > INACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    default:
      return true;
  }
}

// The customer's own saved WhatsApp number is used when set, falling back to phone
// -- matching the same fallback used by the employee order workflow's Send to
// Customer links.
export function buildCustomerWhatsAppUrl(customer: { phone: string; whatsapp: string | null }) {
  const number = customer.whatsapp || customer.phone;
  return `https://wa.me/${toWaPhoneDigits(number)}`;
}

export type ActivityEvent = {
  date: Date;
  title: string;
  detail?: string;
};

export function buildCustomerActivity(customer: {
  orders: {
    number: string;
    createdAt: Date;
    acceptedAt: Date | null;
    departedAt: Date | null;
    arrivedAt: Date | null;
    status: string;
    assignedTo: { name: string };
    doneAt: Date | null;
    doneBy: { name: string } | null;
    cancelledAt: Date | null;
    cancelledBy: { name: string } | null;
    cancellationReason: string | null;
    rescheduledAt: Date | null;
    rescheduledBy: { name: string } | null;
    rescheduleReason: string | null;
  }[];
  invoices: { number: string; createdAt: Date }[];
  quotations: { number: string; createdAt: Date }[];
  customerNotes: { note: string; createdAt: Date; createdBy: { name: string } }[];
}): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const order of customer.orders) {
    events.push({ date: order.createdAt, title: "New Order Created", detail: order.number });
    if (order.acceptedAt) events.push({ date: order.acceptedAt, title: "Order Accepted", detail: `Employee: ${order.assignedTo.name}` });
    if (order.departedAt) events.push({ date: order.departedAt, title: "Employee On The Way", detail: order.number });
    if (order.arrivedAt) events.push({ date: order.arrivedAt, title: "Employee Arrived", detail: order.number });
    if (order.status === "Done") {
      events.push({
        date: order.doneAt ?? order.createdAt,
        title: "Order Completed",
        detail: order.doneBy ? `${order.number} · Marked by ${order.doneBy.name}` : order.number,
      });
    }
    if (order.cancelledAt) {
      events.push({
        date: order.cancelledAt,
        title: "Order Cancelled",
        detail: [
          order.cancelledBy ? `Cancelled By: ${order.cancelledBy.name}` : null,
          order.cancellationReason,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }
    if (order.rescheduledAt) {
      events.push({
        date: order.rescheduledAt,
        title: "Order Rescheduled",
        detail: [
          order.rescheduledBy ? `By: ${order.rescheduledBy.name}` : null,
          order.rescheduleReason,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }
  }
  for (const invoice of customer.invoices) {
    events.push({ date: invoice.createdAt, title: "Invoice Created", detail: invoice.number });
  }
  for (const quotation of customer.quotations) {
    events.push({ date: quotation.createdAt, title: "Quotation Created", detail: quotation.number });
  }
  for (const note of customer.customerNotes) {
    events.push({ date: note.createdAt, title: "Note Added", detail: `${note.createdBy.name}: ${note.note}` });
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}
