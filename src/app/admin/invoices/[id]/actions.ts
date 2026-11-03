"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole } from "@/lib/session";
import { reverseInventoryUsage } from "@/lib/inventoryData";
import { amountReceived, planPayment } from "@/lib/invoicePayment";
import { PAYMENT_METHODS } from "@/lib/invoiceData";

async function requireAdmin() {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) redirect("/");
  return session;
}

// Admin-only Paid <-> Unpaid toggle. Refunded/Partially Refunded are a separate
// concern owned by the Refund flow, so the toggle is only offered while the
// invoice is still in Paid or Unpaid.
export async function setInvoiceStatus(id: string, status: "Paid" | "Unpaid"): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status !== "Paid" && invoice.status !== "Unpaid") {
    return { ok: false, error: "This invoice has been refunded and its status can no longer be toggled." };
  }
  if (invoice.status === status) return { ok: true };

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id },
      data:
        status === "Paid"
          ? { status, paidAmount: invoice.amount, paymentDate: new Date() }
          : { status, paidAmount: 0, paymentDate: null },
    }),
    prisma.invoicePayment.create({
      data: {
        invoiceId: id,
        kind: status === "Paid" ? "Payment Received" : "Payment Reversed",
        previousStatus: invoice.status,
        newStatus: status,
        amount: status === "Paid" ? Math.max(0, invoice.amount - amountReceived(invoice)) : 0,
        paidAfter: status === "Paid" ? invoice.amount : 0,
        method: invoice.payment,
        paymentDate: status === "Paid" ? new Date() : null,
        previousPaymentDate: invoice.paymentDate,
        changedById: session.employeeId,
      },
    }),
    prisma.invoiceStatusChange.create({
      data: {
        invoiceId: id,
        previousStatus: invoice.status,
        newStatus: status,
        changedById: session.employeeId,
      },
    }),
  ]);

  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/customers");
  return { ok: true };
}

// Record money received on an invoice (a full or a part payment) with the date it actually arrived. The invoice date never
// changes. Every call appends a history row, so the payment date can't be changed without a trace.
export async function recordPayment(
  id: string,
  input: { amount: number; paymentDate: string; method: string }
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate)) return { ok: false, error: "Choose the payment date." };
  if (!(PAYMENT_METHODS as readonly string[]).includes(input.method)) return { ok: false, error: "Choose a payment method." };
  const paymentDate = new Date(`${input.paymentDate}T12:00:00+04:00`);
  if (Number.isNaN(paymentDate.getTime())) return { ok: false, error: "Choose the payment date." };
  if (paymentDate.getTime() > Date.now() + 36 * 3_600_000) return { ok: false, error: "The payment date can't be in the future." };

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id } });
    if (!invoice) return { ok: false as const, error: "Invoice not found." };
    if (invoice.status !== "Paid" && invoice.status !== "Unpaid") return { ok: false as const, error: "A refunded invoice can't take payments." };
    if (paymentDate.getTime() < invoice.date.getTime() - 36 * 3_600_000) return { ok: false as const, error: "The payment date can't be before the invoice date." };
    const plan = planPayment(invoice, input.amount);
    if (!plan.ok) return plan;
    await tx.invoice.update({ where: { id }, data: { paidAmount: plan.paidAmount, status: plan.status, paymentDate, payment: input.method } });
    await tx.invoicePayment.create({
      data: {
        invoiceId: id,
        kind: "Payment Received",
        previousStatus: invoice.status,
        newStatus: plan.status,
        amount: plan.received,
        paidAfter: plan.paidAmount,
        method: input.method,
        paymentDate,
        previousPaymentDate: invoice.paymentDate,
        changedById: session.employeeId,
      },
    });
    if (invoice.status !== plan.status) {
      await tx.invoiceStatusChange.create({ data: { invoiceId: id, previousStatus: invoice.status, newStatus: plan.status, changedById: session.employeeId } });
    }
    return { ok: true as const };
  });
  if (!result.ok) return result;

  revalidatePath(`/admin/invoices/${id}`);
  for (const p of ["/admin", "/admin/invoices", "/admin/wallets", "/admin/reports", "/admin/marketing", "/admin/customers"]) revalidatePath(p);
  revalidatePath("/admin/financial-reports", "layout");
  return { ok: true };
}

export async function deleteInvoice(id: string) {
  const session = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    // A hard delete never strands consumed stock unaccounted for -- reverse
    // every InvoiceInventoryUsage row for this invoice via a new "Stock
    // Reversed" transaction before the invoice (and its usage rows, cascaded)
    // are removed.
    await reverseInventoryUsage(tx, id, "Invoice Deleted", session.employeeId);
    await tx.invoice.delete({ where: { id } });
  });
  // Every page that sums invoices -- same set the Paid/Unpaid toggle refreshes --
  // so no revenue figure can keep showing a deleted invoice.
  revalidatePath("/admin");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/financial-reports", "layout");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/warehouse");
  revalidatePath("/admin/inventory/employees");
  revalidatePath("/admin/inventory/transactions");
  revalidatePath("/employee/inventory");
  redirect("/admin/invoices?toast=1");
}

export async function processRefund(
  id: string,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { ok: false, error: "Invoice not found." };

  const remaining = invoice.amount - invoice.refundedAmount;
  if (amount <= 0 || amount > remaining + 0.001) {
    return { ok: false, error: `Enter an amount up to AED ${remaining.toFixed(2)}.` };
  }

  const refundedAmount = Math.min(invoice.amount, invoice.refundedAmount + amount);
  const status = refundedAmount >= invoice.amount - 0.001 ? "Refunded" : "Partially Refunded";

  await prisma.invoice.update({
    where: { id },
    data: { refundedAmount, status },
  });

  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/financial-reports", "layout");
  revalidatePath("/admin/wallets");
  return { ok: true };
}
