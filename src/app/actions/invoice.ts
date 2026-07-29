"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CUSTOM_SERVICE_VALUE, WARRANTY_DAYS } from "@/lib/invoiceData";
import type { CustomerFormData, ServiceFormData, PaymentFormData, CreateInvoiceResult } from "@/components/invoice/types";

function resolveItems(service: ServiceFormData) {
  return service.items
    .map((item) => ({
      serviceName: item.service === CUSTOM_SERVICE_VALUE ? item.customName.trim() : item.service,
      description: item.description.trim() || null,
      qty: Math.max(1, Math.round(Number(item.qty) || 1)),
      unitPrice: Number(item.unitPrice) || 0,
    }))
    .filter((item) => item.serviceName && item.unitPrice > 0);
}

async function upsertCustomer(customer: CustomerFormData, billName: string) {
  return prisma.customer.upsert({
    where: { phone: customer.phone.trim() },
    update: {
      type: customer.type,
      name: customer.name.trim(),
      companyName: customer.type === "COMPANY" ? customer.companyName.trim() : null,
      trn: customer.type === "COMPANY" ? customer.trn.trim() || null : null,
      emirate: customer.emirate,
      buildingName: customer.buildingName.trim() || null,
      flatNo: customer.flatNo.trim() || null,
    },
    create: {
      phone: customer.phone.trim(),
      type: customer.type,
      name: customer.name.trim() || billName,
      companyName: customer.type === "COMPANY" ? customer.companyName.trim() : null,
      trn: customer.type === "COMPANY" ? customer.trn.trim() || null : null,
      emirate: customer.emirate,
      buildingName: customer.buildingName.trim() || null,
      flatNo: customer.flatNo.trim() || null,
    },
  });
}

export async function createInvoiceFromWizard(
  customer: CustomerFormData,
  service: ServiceFormData,
  payment: PaymentFormData
): Promise<CreateInvoiceResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
  if (!employee) return { ok: false, error: "Your session has expired. Please log in again." };

  const billName = customer.type === "COMPANY" ? customer.companyName.trim() : customer.name.trim();
  if (!billName || !customer.phone.trim()) {
    return { ok: false, error: "Customer name and phone are required." };
  }

  const items = resolveItems(service);
  if (items.length === 0) {
    return { ok: false, error: "Add at least one service with a price." };
  }

  const amount = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const dbCustomer = await upsertCustomer(customer, billName);

  const date = new Date();
  const warrantyUntil = new Date(date);
  warrantyUntil.setDate(warrantyUntil.getDate() + WARRANTY_DAYS);

  const numberPrefix = `INV-${date.getFullYear()}-`;
  const lastInvoice = await prisma.invoice.findFirst({
    where: { number: { startsWith: numberPrefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = lastInvoice ? parseInt(lastInvoice.number.slice(numberPrefix.length), 10) : 0;
  const number = `${numberPrefix}${String(lastSeq + 1).padStart(6, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      number,
      date,
      customerId: dbCustomer.id,
      serviceType: service.serviceType,
      category: service.category,
      payment: payment.method,
      amount,
      status: "Paid",
      warrantyUntil,
      teamId: employee.teamId,
      createdById: employee.id,
      items: {
        create: items,
      },
    },
  });

  return { ok: true, number: invoice.number, amount: invoice.amount };
}

export async function updateInvoiceFromWizard(
  invoiceId: string,
  customer: CustomerFormData,
  service: ServiceFormData,
  payment: PaymentFormData
): Promise<CreateInvoiceResult> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "Not authorized." };

  const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!existing) return { ok: false, error: "Invoice not found." };

  const billName = customer.type === "COMPANY" ? customer.companyName.trim() : customer.name.trim();
  if (!billName || !customer.phone.trim()) {
    return { ok: false, error: "Customer name and phone are required." };
  }

  const items = resolveItems(service);
  if (items.length === 0) {
    return { ok: false, error: "Add at least one service with a price." };
  }

  const amount = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const dbCustomer = await upsertCustomer(customer, billName);

  await prisma.invoiceItem.deleteMany({ where: { invoiceId } });
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      customerId: dbCustomer.id,
      serviceType: service.serviceType,
      category: service.category,
      payment: payment.method,
      amount,
      items: { create: items },
    },
  });

  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");

  return { ok: true, number: existing.number, amount };
}
