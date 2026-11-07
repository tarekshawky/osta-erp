import { prisma } from "./prisma";
import { canonicalExpensePayment } from "./expenseData";
import { collectedOf } from "./invoicePayment";
import { resolvePeriod, type Period } from "./performancePeriod";
import { formatDate } from "./format";

// The six expense reports. Each reads the real records for the chosen period and filters; nothing is estimated. A customer
// materials purchase appears only in its own report and in the expense list as one expense -- never twice.
export const REPORTS = {
  company: { title: "Company Expenses Report", ar: "تقرير مصروفات الشركة" },
  employee: { title: "Employee Expenses Report", ar: "تقرير مصروفات العاملين" },
  daily: { title: "Daily Workers Payments Report", ar: "تقرير مدفوعات عمال اليومية" },
  equipment: { title: "Equipment Rental Report", ar: "تقرير إيجار المعدات" },
  transport: { title: "Transport Vehicle Rental Report", ar: "تقرير إيجار سيارات النقل" },
  customer: { title: "Customer Materials Purchases Report", ar: "تقرير مشتريات العملاء" },
} as const;
export type ReportKey = keyof typeof REPORTS;
export const parseReport = (v: string | undefined): ReportKey => ((Object.keys(REPORTS) as string[]).includes(v ?? "") ? (v as ReportKey) : "company");

export type ReportFilters = { period: Period; emirate?: string; teamId?: string; employeeId?: string; payment?: string; kind?: string; customer?: string; order?: string };
export type Cell = string | number | null;
export type ReportColumn = { label: string; num?: boolean; money?: boolean };
export type ReportRow = { cells: Cell[]; href?: string };
export type Report = { key: ReportKey; columns: ReportColumn[]; rows: ReportRow[]; total: number; totalLabel: string; notes?: string };

type RawParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
export function parseReportFilters(sp: RawParams): ReportFilters {
  return {
    period: resolvePeriod({ preset: one(sp.preset), from: one(sp.from), to: one(sp.to) }),
    emirate: one(sp.emirate) || undefined, teamId: one(sp.team) || undefined, employeeId: one(sp.employee) || undefined,
    payment: one(sp.payment) || undefined, kind: one(sp.kind) || undefined, customer: one(sp.customer)?.trim() || undefined, order: one(sp.order)?.trim() || undefined,
  };
}

const d = (v: Date | string | null | undefined) => (v ? formatDate(new Date(v)) : "");
const detail = (e: { details: unknown }) => (e.details && typeof e.details === "object" ? (e.details as Record<string, unknown>) : {});
const s = (v: unknown): string | null => (v === undefined || v === null || v === "" ? null : String(v));
const n = (v: unknown): number | null => (typeof v === "number" ? v : v ? Number(v) || null : null);

export async function loadExpenseReport(key: ReportKey, f: ReportFilters): Promise<Report> {
  const range = { gte: f.period.from, lte: f.period.to };
  const teams = new Map((await prisma.team.findMany({ select: { id: true, name: true } })).map((t) => [t.id, t.name]));
  const team = (id: string | null) => (id ? (teams.get(id) ?? "") : "");

  if (key === "customer") return loadCustomer(f, range, team);

  const classFilter =
    key === "company" ? { OR: [{ expenseClass: null }, { expenseClass: "COMPANY" }] }
    : key === "employee" ? { expenseClass: "EMPLOYEE" }
    : { expenseKind: key === "daily" ? "Daily Worker" : key === "equipment" ? "Equipment Rental" : "Transport Vehicle Rental" };

  const expenses = await prisma.expense.findMany({
    where: {
      AND: [
        { date: range }, classFilter,
        ...(f.emirate ? [{ emirate: f.emirate }] : []), ...(f.teamId ? [{ teamId: f.teamId }] : []), ...(f.employeeId ? [{ createdById: f.employeeId }] : []),
        ...(f.kind ? [key === "company" || key === "employee" ? { OR: [{ category: f.kind }, { expenseKind: f.kind }] } : {}] : []),
      ],
    },
    orderBy: { date: "desc" }, include: { createdBy: { select: { name: true } } },
  });
  const rows = expenses.filter((e) => !f.payment || canonicalExpensePayment(e.payment) === f.payment);
  const pay = (e: { payment: string }) => canonicalExpensePayment(e.payment);
  const link = (e: { attachmentUrl: string | null }) => (e.attachmentUrl ? "Attached" : "");

  if (key === "company") {
    return {
      key, totalLabel: "Total company expenses", total: rows.reduce((a, e) => a + e.amount - e.refundedAmount, 0),
      columns: [{ label: "Date" }, { label: "Number" }, { label: "Category" }, { label: "Kind" }, { label: "Description" }, { label: "Vendor" }, { label: "Team" }, { label: "Emirate" }, { label: "Payment" }, { label: "Net amount", num: true, money: true }],
      rows: rows.map((e) => ({ cells: [d(e.date), e.number, e.category, e.expenseKind, e.description, e.vendor, team(e.teamId), e.emirate, pay(e), e.amount - e.refundedAmount] })),
      notes: "Includes every company expense, older ones too. Customer materials purchases and employee expenses are in their own reports, so nothing appears twice.",
    };
  }
  if (key === "employee") {
    const payroll = f.emirate || f.kind || f.payment
      ? []
      : await prisma.payrollEntry.findMany({
          where: { date: range, ...(f.employeeId ? { employeeId: f.employeeId } : {}), ...(f.teamId ? { employee: { teamId: f.teamId } } : {}) },
          orderBy: { date: "desc" }, include: { employee: { select: { name: true, teamId: true } } },
        });
    const all = [
      ...rows.map((e) => ({ at: e.date.getTime(), amount: e.amount - e.refundedAmount, cells: [d(e.date), "Expense", e.expenseKind ?? e.category, s(detail(e).workerName) ?? s(detail(e).employeeName) ?? e.vendor, e.description, team(e.teamId), e.emirate, pay(e), e.amount - e.refundedAmount] as Cell[] })),
      ...payroll.map((p) => { const amt = p.type === "Deduction" ? -p.amount : p.amount; return { at: p.date.getTime(), amount: amt, cells: [d(p.date), "Payroll", p.type, p.employee.name, p.note ?? "", team(p.employee.teamId), "", "", amt] as Cell[] }; }),
    ].sort((a, b) => b.at - a.at);
    return {
      key, totalLabel: "Total employee expenses", total: all.reduce((a, r) => a + r.amount, 0),
      columns: [{ label: "Date" }, { label: "Source" }, { label: "Type" }, { label: "Person" }, { label: "Description" }, { label: "Team" }, { label: "Emirate" }, { label: "Payment" }, { label: "Amount", num: true, money: true }],
      rows: all.map((r) => ({ cells: r.cells })),
      notes: "Employee expenses plus Payroll (Salary + Advance − Deduction). Salaries and advances are recorded only in Payroll, so they are counted once.",
    };
  }
  if (key === "daily") {
    return {
      key, totalLabel: "Total paid to daily workers", total: rows.reduce((a, e) => a + e.amount - e.refundedAmount, 0),
      columns: [{ label: "Work date" }, { label: "Worker" }, { label: "Phone" }, { label: "Days", num: true }, { label: "Daily rate", num: true, money: true }, { label: "Total", num: true, money: true }, { label: "Team" }, { label: "Emirate" }, { label: "Payment" }, { label: "Work" }, { label: "Proof" }],
      rows: rows.map((e) => { const x = detail(e); return { cells: [d(e.date), s(x.workerName), s(x.workerPhone), n(x.days), n(x.dailyRate), e.amount - e.refundedAmount, team(e.teamId), e.emirate, pay(e), s(x.work), link(e)] }; }),
    };
  }
  if (key === "equipment") {
    return {
      key, totalLabel: "Total equipment rental", total: rows.reduce((a, e) => a + e.amount - e.refundedAmount, 0),
      columns: [{ label: "Equipment" }, { label: "Supplier" }, { label: "Start" }, { label: "End" }, { label: "Days", num: true }, { label: "Price", num: true, money: true }, { label: "Team" }, { label: "Emirate" }, { label: "Payment" }, { label: "Invoice" }, { label: "File" }],
      rows: rows.map((e) => { const x = detail(e); return { cells: [s(x.equipmentName), s(x.supplier) ?? e.vendor, s(x.startDate), s(x.endDate), n(x.days), e.amount - e.refundedAmount, team(e.teamId), e.emirate, pay(e), e.referenceNumber, link(e)] }; }),
    };
  }
  return {
    key, totalLabel: "Total transport vehicle rental", total: rows.reduce((a, e) => a + e.amount - e.refundedAmount, 0),
    columns: [{ label: "Date" }, { label: "Vehicle type" }, { label: "Supplier / lessor" }, { label: "Days", num: true }, { label: "Daily rate", num: true, money: true }, { label: "Total", num: true, money: true }, { label: "Team" }, { label: "Emirate" }, { label: "Payment" }, { label: "Invoice" }],
    rows: rows.map((e) => { const x = detail(e); return { cells: [d(e.date), s(x.vehicleType), s(x.supplier) ?? e.vendor, n(x.days), n(x.dailyRate), e.amount - e.refundedAmount, team(e.teamId), e.emirate, pay(e), e.referenceNumber] }; }),
  };
}

async function loadCustomer(f: ReportFilters, range: { gte: Date; lte: Date }, team: (id: string | null) => string): Promise<Report> {
  const purchases = await prisma.customerPurchase.findMany({
    where: {
      purchaseDate: range, ...(f.emirate ? { emirate: f.emirate } : {}), ...(f.teamId ? { teamId: f.teamId } : {}), ...(f.employeeId ? { technicianId: f.employeeId } : {}),
      ...(f.payment ? { paymentMethod: f.payment === "Bank Transfer" ? { in: ["Bank Transfer", "Bank"] } : f.payment } : {}),
    },
    orderBy: { purchaseDate: "desc" }, include: { customer: true, order: { select: { id: true, number: true } } },
  });
  const name = (c: { type: string; name: string; companyName: string | null }) => (c.type === "COMPANY" ? c.companyName || c.name : c.name);
  const list = purchases.filter((p) => (!f.customer || name(p.customer).toLowerCase().includes(f.customer.toLowerCase()) || p.customer.code.toLowerCase() === f.customer.toLowerCase()) && (!f.order || (p.order?.number ?? "").toLowerCase().includes(f.order.toLowerCase())));

  // billed / collected parts per order, in one query
  const orderIds = [...new Set(list.map((p) => p.orderId).filter((x): x is string => Boolean(x)))];
  const orders = orderIds.length
    ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, invoice: { select: { number: true, amount: true, refundedAmount: true, status: true, paidAmount: true, items: { select: { itemType: true, qty: true, unitPrice: true } } } } } })
    : [];
  const byOrder = new Map(orders.map((o) => [o.id, o.invoice]));

  let cost = 0, billed = 0, collected = 0;
  const rows = list.map((p) => {
    const inv = p.orderId ? byOrder.get(p.orderId) : null;
    const parts = inv ? inv.items.filter((i) => i.itemType === "SparePart").reduce((a, i) => a + i.qty * i.unitPrice, 0) : 0;
    const net = inv ? inv.amount - inv.refundedAmount : 0;
    const share = inv && net > 0 ? Math.min(1, collectedOf(inv) / net) : 0;
    const got = Math.round(parts * share * 100) / 100;
    if (p.status === "Approved") { cost += p.total; billed += parts; collected += got; }
    return { href: `/admin/expenses/purchases/${p.id}`, cells: [p.number, d(p.purchaseDate), name(p.customer), p.order?.number ?? "", inv?.number ?? "", team(p.teamId) || p.teamName, p.technicianName, p.emirate, p.supplierName, p.paymentMethod, p.status, p.total, parts, got, parts > 0 ? Math.round((parts - p.total) * 100) / 100 : null] as Cell[] };
  });
  return {
    key: "customer", totalLabel: "Approved purchase cost", total: cost, rows,
    columns: [{ label: "Purchase" }, { label: "Date" }, { label: "Customer" }, { label: "Order" }, { label: "Invoice" }, { label: "Team" }, { label: "Technician" }, { label: "Emirate" }, { label: "Supplier" }, { label: "Payment" }, { label: "Status" }, { label: "Cost", num: true, money: true }, { label: "Parts billed", num: true, money: true }, { label: "Parts collected", num: true, money: true }, { label: "Margin", num: true, money: true }],
    notes: `Approved purchases only are totalled: cost ${cost.toFixed(2)}, parts billed ${billed.toFixed(2)}, parts collected ${collected.toFixed(2)}, margin on billed ${(billed - cost).toFixed(2)}. Pending and rejected purchases are listed but not counted, and are not expenses.`,
  };
}
