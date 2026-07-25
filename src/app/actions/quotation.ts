"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CUSTOM_SERVICE_VALUE } from "@/lib/invoiceData";
import type { CustomerFormData, ServiceFormData } from "@/components/invoice/types";

export type CreateQuotationResult = {
  ok: boolean;
  number?: string;
  amount?: number;
  error?: string;
};

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

export async function createQuotationFromWizard(
  customer: CustomerFormData,
  service: ServiceFormData
): Promise<CreateQuotationResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
  if (!employee) return { ok: false, error: "Your session has expired. Please log in again." };

  const billName = customer.type === "COMPANY" ? customer.companyName.trim() : customer.name.trim();
  if (!billName) {
    return { ok: false, error: "Customer name is required." };
  }

  const items = resolveItems(service);
  if (items.length === 0) {
    return { ok: false, error: "Add at least one service with a price." };
  }

  const amount = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const date = new Date();
  const count = await prisma.quotation.count();
  const number = `QUO-${date.getFullYear()}-${String(count + 1).padStart(6, "0")}`;

  const quotation = await prisma.quotation.create({
    data: {
      number,
      date,
      customerType: customer.type,
      customerName: customer.name.trim(),
      companyName: customer.type === "COMPANY" ? customer.companyName.trim() : null,
      trn: customer.type === "COMPANY" ? customer.trn.trim() || null : null,
      phone: customer.phone.trim() || null,
      emirate: customer.emirate,
      buildingName: customer.buildingName.trim() || null,
      flatNo: customer.flatNo.trim() || null,
      teamId: employee.teamId,
      createdById: employee.id,
      items: {
        create: items,
      },
    },
  });

  return { ok: true, number: quotation.number, amount };
}

export async function updateQuotationFromWizard(
  quotationId: string,
  customer: CustomerFormData,
  service: ServiceFormData
): Promise<CreateQuotationResult> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return { ok: false, error: "Not authorized." };

  const existing = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!existing) return { ok: false, error: "Quotation not found." };

  const billName = customer.type === "COMPANY" ? customer.companyName.trim() : customer.name.trim();
  if (!billName) {
    return { ok: false, error: "Customer name is required." };
  }

  const items = resolveItems(service);
  if (items.length === 0) {
    return { ok: false, error: "Add at least one service with a price." };
  }

  const amount = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  await prisma.quotationItem.deleteMany({ where: { quotationId } });
  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      customerType: customer.type,
      customerName: customer.name.trim(),
      companyName: customer.type === "COMPANY" ? customer.companyName.trim() : null,
      trn: customer.type === "COMPANY" ? customer.trn.trim() || null : null,
      phone: customer.phone.trim() || null,
      emirate: customer.emirate,
      buildingName: customer.buildingName.trim() || null,
      flatNo: customer.flatNo.trim() || null,
      items: { create: items },
    },
  });

  revalidatePath(`/admin/quotations/${quotationId}`);
  revalidatePath("/admin/quotations");

  return { ok: true, number: existing.number, amount };
}
