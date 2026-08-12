"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
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
    prisma.invoice.update({ where: { id }, data: { status } }),
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

export async function deleteInvoice(id: string) {
  await requireAdmin();
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/admin/wallets");
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
  revalidatePath("/admin/wallets");
  return { ok: true };
}
