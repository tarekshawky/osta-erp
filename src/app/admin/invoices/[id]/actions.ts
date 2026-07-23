"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
}

export async function deleteInvoice(id: string) {
  await requireAdmin();
  await prisma.invoice.delete({ where: { id } });
  redirect("/admin/invoices");
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
  return { ok: true };
}
