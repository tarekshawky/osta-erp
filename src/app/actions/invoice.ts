"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CUSTOM_SERVICE_VALUE, WARRANTY_DAYS } from "@/lib/invoiceData";
import { findOrCreateCustomer } from "@/lib/customerMatch";
import { recordInventoryUsage, reverseInventoryUsage, InsufficientStockError } from "@/lib/inventoryData";
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

function resolveInventoryUsage(service: ServiceFormData) {
  return service.inventoryUsage
    .filter((line) => line.inventoryItemId && Number(line.quantity) > 0)
    .map((line) => ({ inventoryItemId: line.inventoryItemId, quantity: Number(line.quantity) }));
}

function revalidateInventoryPaths() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/warehouse");
  revalidatePath("/admin/inventory/employees");
  revalidatePath("/admin/inventory/transactions");
  revalidatePath("/employee/inventory");
}

function parseInvoiceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

async function resolveInvoiceTeamId(teamId: string, isAdmin: boolean, employeeTeamId: string | null) {
  if (!isAdmin) return employeeTeamId;
  const team = await prisma.team.findFirst({
    where: { id: teamId, name: { in: ["Ajman", "Al Ain"] } },
    select: { id: true },
  });
  return team?.id ?? null;
}

export async function createInvoiceFromWizard(
  customer: CustomerFormData,
  service: ServiceFormData,
  payment: PaymentFormData,
  orderId?: string,
  quotationId?: string
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
  const date = parseInvoiceDate(payment.date);
  if (!date) return { ok: false, error: "Enter a valid invoice date." };
  const teamId = await resolveInvoiceTeamId(payment.teamId, session.role === "ADMIN", employee.teamId);
  if (session.role === "ADMIN" && !teamId) return { ok: false, error: "Select Ajman or Al Ain team." };
  const dbCustomer = await findOrCreateCustomer(customer, employee.id);
  const warrantyUntil = new Date(date);
  warrantyUntil.setUTCDate(warrantyUntil.getUTCDate() + WARRANTY_DAYS);

  const numberPrefix = `INV-${date.getUTCFullYear()}-`;
  const lastInvoice = await prisma.invoice.findFirst({
    where: { number: { startsWith: numberPrefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = lastInvoice ? parseInt(lastInvoice.number.slice(numberPrefix.length), 10) : 0;
  const number = `${numberPrefix}${String(lastSeq + 1).padStart(6, "0")}`;

  const usageLines = resolveInventoryUsage(service);
  const inventoryEmployeeId = service.inventoryEmployeeId || employee.id;

  let invoice;
  try {
    invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          number,
          date,
          customerId: dbCustomer.id,
          serviceType: service.serviceType,
          category: service.category,
          payment: payment.method,
          amount,
          status: "Paid",
          leadSource: customer.leadSource,
          warrantyUntil,
          teamId,
          createdById: employee.id,
          items: {
            create: items,
          },
        },
      });
      if (usageLines.length > 0) {
        await recordInventoryUsage(tx, created.id, inventoryEmployeeId, usageLines, employee.id);
      }
      return created;
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) return { ok: false, error: err.message };
    throw err;
  }

  if (usageLines.length > 0) revalidateInventoryPaths();

  if (orderId) {
    await prisma.order.update({
      where: { id: orderId },
      data: { invoiceId: invoice.id, status: "Done" },
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/employee/orders");
    revalidatePath(`/employee/orders/${orderId}`);
  }

  if (quotationId) {
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { invoiceId: invoice.id },
    });
    revalidatePath("/admin/quotations");
    revalidatePath(`/admin/quotations/${quotationId}`);
  }

  revalidatePath("/admin/wallets");
  revalidatePath("/admin/marketing");
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
  const date = parseInvoiceDate(payment.date);
  if (!date) return { ok: false, error: "Enter a valid invoice date." };
  const teamId = await resolveInvoiceTeamId(payment.teamId, true, null);
  if (!teamId) return { ok: false, error: "Select Ajman or Al Ain team." };
  const dbCustomer = await findOrCreateCustomer(customer, existing.createdById);
  const warrantyUntil = new Date(date);
  warrantyUntil.setUTCDate(warrantyUntil.getUTCDate() + WARRANTY_DAYS);

  const usageLines = resolveInventoryUsage(service);
  const inventoryEmployeeId = service.inventoryEmployeeId || existing.createdById;

  try {
    await prisma.$transaction(async (tx) => {
      // Reverse-then-reapply: every InvoiceInventoryUsage row for this invoice is
      // reversed via a new "Stock Reversed" transaction (never a silent delete of
      // the original "Stock Used" row), then the new usage lines are recorded --
      // mirrors how InvoiceItem rows are fully replaced on every edit.
      await reverseInventoryUsage(tx, invoiceId, "Invoice Edited", session.employeeId);
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          customerId: dbCustomer.id,
          serviceType: service.serviceType,
          category: service.category,
          payment: payment.method,
          amount,
          leadSource: customer.leadSource,
          date,
          warrantyUntil,
          teamId,
          items: { create: items },
        },
      });
      if (usageLines.length > 0) {
        await recordInventoryUsage(tx, invoiceId, inventoryEmployeeId, usageLines, session.employeeId);
      }
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) return { ok: false, error: err.message };
    throw err;
  }

  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/marketing");
  revalidateInventoryPaths();

  return { ok: true, number: existing.number, amount };
}
