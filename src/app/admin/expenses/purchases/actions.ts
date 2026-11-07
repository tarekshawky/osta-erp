"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { writeAudit } from "@/lib/adminGuard";
import { EXPENSE_PAYMENT_METHODS, generateExpenseNumber } from "@/lib/expenseData";
import { EMIRATES } from "@/lib/performanceData";
import { purchaseNumber, purchaseTotal, supplierInvoiceKey, validatePurchaseItems, itemTotal, type PurchaseItemInput } from "@/lib/expenseClasses";
import { resolveCreditCard } from "../actions";
import type { Prisma } from "@/generated/prisma";

// Customer Materials Purchases. A purchase is a document (items, supplier, order, customer); once APPROVED it owns exactly one
// Expense row carrying its total, so the financial reports see the money once. Until a Super Admin approves a purchase
// entered by an Admin it is only a pending document and affects no figure. Nothing here edits older expenses.

export type PurchaseInput = {
  customerId: string;
  orderId?: string | null;
  purchaseDate: string;
  supplierName?: string;
  supplierInvoiceNo?: string;
  paymentMethod: string;
  creditCardId?: string | null;
  notes?: string | null;
  supplierInvoiceUrl?: string | null;
  teamId?: string | null;
  technicianId?: string | null;
  emirate?: string | null;
  items: PurchaseItemInput[];
};

export type OrderLookup = {
  orderId: string; number: string; customerId: string; customerName: string; customerCode: string; emirate: string;
  teamId: string | null; teamName: string | null; technicianId: string | null; technicianName: string | null; invoiceNumber: string | null; status: string;
};
export type CustomerLookup = { id: string; name: string; code: string; phone: string; emirate: string };

const display = (c: { type: string; name: string; companyName: string | null }) => (c.type === "COMPANY" ? c.companyName || c.name : c.name);

export async function searchOrders(raw: string): Promise<OrderLookup[]> {
  await requireEmployee("ADMIN");
  const q = raw.trim();
  if (q.length < 2) return [];
  const rows = await prisma.order.findMany({
    where: { OR: [{ number: { contains: q, mode: "insensitive" } }, { customer: { name: { contains: q, mode: "insensitive" } } }, { customer: { companyName: { contains: q, mode: "insensitive" } } }, { customer: { phone: { contains: q } } }] },
    orderBy: { date: "desc" }, take: 8,
    include: { customer: true, team: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } }, invoice: { select: { number: true } } },
  });
  return rows.map((o) => ({
    orderId: o.id, number: o.number, customerId: o.customerId, customerName: display(o.customer), customerCode: o.customer.code, emirate: o.customer.emirate,
    teamId: o.team?.id ?? null, teamName: o.team?.name ?? null, technicianId: o.assignedTo?.id ?? null, technicianName: o.assignedTo?.name ?? null, invoiceNumber: o.invoice?.number ?? null, status: o.status,
  }));
}

export async function searchCustomers(raw: string): Promise<CustomerLookup[]> {
  await requireEmployee("ADMIN");
  const q = raw.trim();
  if (q.length < 2) return [];
  const rows = await prisma.customer.findMany({
    where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { companyName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { code: { contains: q, mode: "insensitive" } }] },
    orderBy: { updatedAt: "desc" }, take: 8,
  });
  return rows.map((c) => ({ id: c.id, name: display(c), code: c.code, phone: c.phone, emirate: c.emirate }));
}

async function nextNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CMP-${year}-`;
  const last = await prisma.customerPurchase.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  return purchaseNumber(year, last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1);
}

type Validated = { ok: true; date: Date; emirate: string | null; teamName: string | null; technicianName: string | null; card: string | null; orderNumber: string | null; customerName: string } | { ok: false; error: string };

async function validate(input: PurchaseInput, excludeId?: string): Promise<Validated> {
  const itemsError = validatePurchaseItems(input.items);
  if (itemsError) return { ok: false, error: itemsError };
  if (!input.customerId) return { ok: false, error: "Choose the customer." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.purchaseDate)) return { ok: false, error: "Choose the purchase date." };
  if (!(EXPENSE_PAYMENT_METHODS as readonly string[]).includes(input.paymentMethod)) return { ok: false, error: "Choose the payment method." };
  if (input.emirate && !(EMIRATES as readonly string[]).includes(input.emirate)) return { ok: false, error: "Choose a valid emirate." };
  const card = await resolveCreditCard(input.paymentMethod, input.creditCardId);
  if (!card.ok) return { ok: false, error: card.error };

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) return { ok: false, error: "Customer not found." };
  let orderNumber: string | null = null;
  if (input.orderId) {
    const order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { number: true, customerId: true } });
    if (!order) return { ok: false, error: "Service order not found." };
    if (order.customerId !== input.customerId) return { ok: false, error: "That service order belongs to a different customer." };
    orderNumber = order.number;
  }
  const [team, tech] = await Promise.all([
    input.teamId ? prisma.team.findUnique({ where: { id: input.teamId }, select: { name: true } }) : null,
    input.technicianId ? prisma.employee.findUnique({ where: { id: input.technicianId }, select: { name: true } }) : null,
  ]);

  // The same supplier invoice, or the same order + day + total + supplier, is the same purchase.
  const total = purchaseTotal(input.items);
  const key = supplierInvoiceKey(input.supplierName, input.supplierInvoiceNo);
  const day = new Date(`${input.purchaseDate}T00:00:00Z`);
  const next = new Date(day.getTime() + 86_400_000);
  const dup = await prisma.customerPurchase.findFirst({
    where: {
      status: { not: "Rejected" }, ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        ...(key ? [{ supplierInvoiceNo: { equals: (input.supplierInvoiceNo ?? "").trim(), mode: "insensitive" as const }, supplierName: { equals: (input.supplierName ?? "").trim(), mode: "insensitive" as const } }] : []),
        ...(input.orderId ? [{ orderId: input.orderId, purchaseDate: { gte: day, lt: next }, total, supplierName: { equals: (input.supplierName ?? "").trim(), mode: "insensitive" as const } }] : []),
      ],
    },
    select: { number: true },
  });
  if (dup) return { ok: false, error: `This purchase has already been recorded (${dup.number}).` };

  return { ok: true, date: new Date(`${input.purchaseDate}T12:00:00Z`), emirate: input.emirate || customer.emirate || null, teamName: team?.name ?? null, technicianName: tech?.name ?? null, card: card.creditCardId, orderNumber, customerName: display(customer) };
}

const itemRows = (items: PurchaseItemInput[]) => items.map((i) => ({ name: i.name.trim(), description: i.description?.trim() || null, qty: i.qty, unitPrice: i.unitPrice, total: itemTotal(i.qty, i.unitPrice), supplier: i.supplier?.trim() || null, supplierInvoiceNo: i.supplierInvoiceNo?.trim() || null }));

// The single Expense row of an approved purchase.
async function createExpenseFor(tx: Prisma.TransactionClient, p: { id: string; number: string; purchaseDate: Date; total: number; paymentMethod: string; creditCardId: string | null; supplierName: string | null; supplierInvoiceNo: string | null; supplierInvoiceUrl: string | null; teamId: string | null; emirate: string | null; createdById: string; notes: string | null; customerId: string; orderId: string | null }, label: string, items: number) {
  const number = await generateExpenseNumber();
  const e = await tx.expense.create({
    data: {
      number, date: p.purchaseDate, description: `Customer materials — ${p.number} — ${label}`, notes: p.notes, category: "Materials", payment: p.paymentMethod, amount: p.total,
      vendor: p.supplierName, referenceNumber: p.supplierInvoiceNo, attachmentUrl: p.supplierInvoiceUrl, creditCardId: p.creditCardId, teamId: p.teamId, createdById: p.createdById,
      expenseClass: "CUSTOMER_PURCHASE", expenseKind: "Customer Materials Purchase", emirate: p.emirate, details: { purchaseId: p.id, purchaseNumber: p.number, customerId: p.customerId, orderId: p.orderId, items },
    },
  });
  if (p.creditCardId) {
    await tx.creditCardAuditLog.create({ data: { creditCardId: p.creditCardId, action: "Expense Added", description: `Expense ${e.number ?? e.id} "${e.description}" added — AED ${e.amount.toFixed(2)}`, newValue: e.amount.toFixed(2), performedById: p.createdById } });
  }
  return e;
}

function refresh(id?: string) {
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/expenses/purchases");
  revalidatePath("/admin/expenses/reports");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/reports/performance");
  if (id) revalidatePath(`/admin/expenses/purchases/${id}`);
}

export async function createCustomerPurchase(input: PurchaseInput): Promise<{ ok: boolean; error?: string; id?: string }> {
  const admin = await requireEmployee("ADMIN");
  const v = await validate(input);
  if (!v.ok) return v;
  const total = purchaseTotal(input.items);
  const approved = admin.role === "SUPER_ADMIN";
  const number = await nextNumber();

  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.customerPurchase.create({
      data: {
        number, status: approved ? "Approved" : "Pending", purchaseDate: v.date, customerId: input.customerId, orderId: input.orderId || null,
        teamId: input.teamId || null, teamName: v.teamName, technicianId: input.technicianId || null, technicianName: v.technicianName, emirate: v.emirate,
        supplierName: input.supplierName?.trim() || null, supplierInvoiceNo: input.supplierInvoiceNo?.trim() || null, paymentMethod: input.paymentMethod, creditCardId: v.card,
        notes: input.notes?.trim() || null, supplierInvoiceUrl: input.supplierInvoiceUrl || null, total, createdById: admin.id,
        ...(approved ? { approvedById: admin.id, approvedAt: new Date() } : {}),
        items: { create: itemRows(input.items) },
      },
    });
    if (approved) {
      const e = await createExpenseFor(tx, p, `${v.customerName}${v.orderNumber ? ` — ${v.orderNumber}` : ""}`, input.items.length);
      await tx.customerPurchase.update({ where: { id: p.id }, data: { expenseId: e.id } });
    }
    return p;
  });
  await writeAudit(admin, "create", "CustomerPurchase", purchase.id, null, { number, total, status: purchase.status, items: input.items.length });
  refresh(purchase.id);
  return { ok: true, id: purchase.id };
}

// Edit a purchase. Allowed while Pending/Rejected, and for a Super Admin on an Approved one (its Expense follows the new
// total). The payment method and card of an approved purchase stay as they were. Every edit is written to the audit log.
export async function updateCustomerPurchase(id: string, input: PurchaseInput): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireEmployee("ADMIN");
  const existing = await prisma.customerPurchase.findUnique({ where: { id }, include: { items: true } });
  if (!existing) return { ok: false, error: "Purchase not found." };
  if (existing.status === "Approved" && admin.role !== "SUPER_ADMIN") return { ok: false, error: "Only a Super Admin can change an approved purchase." };
  const lockPayment = existing.status === "Approved";
  const v = await validate(lockPayment ? { ...input, paymentMethod: existing.paymentMethod, creditCardId: existing.creditCardId } : input, id);
  if (!v.ok) return v;
  const total = purchaseTotal(input.items);

  await prisma.$transaction(async (tx) => {
    await tx.customerPurchaseItem.deleteMany({ where: { purchaseId: id } });
    const p = await tx.customerPurchase.update({
      where: { id },
      data: {
        purchaseDate: v.date, customerId: input.customerId, orderId: input.orderId || null, teamId: input.teamId || null, teamName: v.teamName,
        technicianId: input.technicianId || null, technicianName: v.technicianName, emirate: v.emirate, supplierName: input.supplierName?.trim() || null,
        supplierInvoiceNo: input.supplierInvoiceNo?.trim() || null, notes: input.notes?.trim() || null, supplierInvoiceUrl: input.supplierInvoiceUrl || null, total,
        ...(lockPayment ? {} : { paymentMethod: input.paymentMethod, creditCardId: v.card }),
        ...(existing.status === "Rejected" ? { status: "Pending", rejectionReason: null } : {}),
        items: { create: itemRows(input.items) },
      },
    });
    if (existing.expenseId) {
      await tx.expense.update({
        where: { id: existing.expenseId },
        data: { date: v.date, amount: total, vendor: p.supplierName, referenceNumber: p.supplierInvoiceNo, attachmentUrl: p.supplierInvoiceUrl, notes: p.notes, teamId: p.teamId, emirate: p.emirate, description: `Customer materials — ${p.number} — ${v.customerName}${v.orderNumber ? ` — ${v.orderNumber}` : ""}` },
      });
    }
  });
  await writeAudit(admin, "update", "CustomerPurchase", id, { total: existing.total, items: existing.items.map((i) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice })), supplier: existing.supplierName }, { total, items: input.items.map((i) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice })), supplier: input.supplierName ?? null });
  refresh(id);
  return { ok: true };
}

export async function approveCustomerPurchase(id: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireEmployee("ADMIN");
  if (admin.role !== "SUPER_ADMIN") return { ok: false, error: "Only a Super Admin can approve purchases." };
  const p = await prisma.customerPurchase.findUnique({ where: { id }, include: { items: true, customer: true, order: { select: { number: true } } } });
  if (!p) return { ok: false, error: "Purchase not found." };
  if (p.status === "Approved" || p.expenseId) return { ok: false, error: "This purchase is already approved." };
  await prisma.$transaction(async (tx) => {
    const e = await createExpenseFor(tx, p, `${display(p.customer)}${p.order ? ` — ${p.order.number}` : ""}`, p.items.length);
    await tx.customerPurchase.update({ where: { id }, data: { status: "Approved", approvedById: admin.id, approvedAt: new Date(), rejectionReason: null, expenseId: e.id } });
  });
  await writeAudit(admin, "approve", "CustomerPurchase", id, { status: p.status }, { status: "Approved", total: p.total });
  refresh(id);
  return { ok: true };
}

export async function rejectCustomerPurchase(id: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireEmployee("ADMIN");
  if (admin.role !== "SUPER_ADMIN") return { ok: false, error: "Only a Super Admin can reject purchases." };
  if (!reason.trim()) return { ok: false, error: "Write the reason for rejecting." };
  const p = await prisma.customerPurchase.findUnique({ where: { id } });
  if (!p) return { ok: false, error: "Purchase not found." };
  if (p.status !== "Pending") return { ok: false, error: "Only a pending purchase can be rejected." };
  await prisma.customerPurchase.update({ where: { id }, data: { status: "Rejected", rejectionReason: reason.trim(), approvedById: admin.id, approvedAt: new Date() } });
  await writeAudit(admin, "reject", "CustomerPurchase", id, { status: "Pending" }, { status: "Rejected", reason: reason.trim() });
  refresh(id);
  return { ok: true };
}

// Deleting removes the document and, for an approved one, its Expense -- the full record is kept in the audit log.
export async function deleteCustomerPurchase(id: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireEmployee("ADMIN");
  const p = await prisma.customerPurchase.findUnique({ where: { id }, include: { items: true, expense: true } });
  if (!p) return { ok: false, error: "Purchase not found." };
  if (p.status === "Approved" && admin.role !== "SUPER_ADMIN") return { ok: false, error: "Only a Super Admin can delete an approved purchase." };
  const snapshot = { number: p.number, status: p.status, total: p.total, customerId: p.customerId, orderId: p.orderId, supplier: p.supplierName, supplierInvoiceNo: p.supplierInvoiceNo, items: p.items.map((i) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice, total: i.total })) };
  await prisma.$transaction(async (tx) => {
    await tx.customerPurchase.delete({ where: { id } });
    if (p.expenseId) {
      await tx.expense.delete({ where: { id: p.expenseId } });
      if (p.creditCardId) {
        await tx.creditCardAuditLog.create({ data: { creditCardId: p.creditCardId, action: "Expense Deleted", description: `Expense ${p.expense?.number ?? p.expenseId} (customer purchase ${p.number}) deleted — AED ${p.total.toFixed(2)}`, oldValue: p.total.toFixed(2), performedById: admin.id } });
      }
    }
  });
  await writeAudit(admin, "delete", "CustomerPurchase", id, snapshot, null);
  refresh();
  return { ok: true };
}
