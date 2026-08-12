"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { parseUaeDateTimeLocal } from "@/lib/orderData";
import { findOrCreateCustomer } from "@/lib/customerMatch";
import type { Prisma } from "@/generated/prisma";

export type OrderCustomerInput = {
  type: "INDIVIDUAL" | "COMPANY";
  name: string;
  companyName: string;
  trn: string;
  phone: string;
  whatsapp: string;
  emirate: string;
  buildingName: string;
  flatNo: string;
};

export type OrderDetailsInput = {
  teamId: string;
  assignedToId: string;
  notes: string;
  scheduledAt: string;
  locationUrl: string;
  orderType: string;
  priceAgreed: string;
  customerLanguage: string;
};

export type OrderActionResult = { ok: boolean; id?: string; error?: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
}

function validateOrderInput(customer: OrderCustomerInput, details: OrderDetailsInput) {
  const billName = customer.type === "COMPANY" ? customer.companyName.trim() : customer.name.trim();
  if (!billName || !customer.phone.trim()) {
    return "Customer name and phone are required.";
  }
  if (!details.assignedToId) return "Assign the order to an employee.";
  return null;
}

export async function createOrder(
  customer: OrderCustomerInput,
  details: OrderDetailsInput
): Promise<OrderActionResult> {
  const admin = await requireEmployee("ADMIN");

  const error = validateOrderInput(customer, details);
  if (error) return { ok: false, error };

  const dbCustomer = await findOrCreateCustomer(customer, admin.id);

  const date = new Date();
  const numberPrefix = `ORD-${date.getFullYear()}-`;
  const lastOrder = await prisma.order.findFirst({
    where: { number: { startsWith: numberPrefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = lastOrder ? parseInt(lastOrder.number.slice(numberPrefix.length), 10) : 0;
  const number = `${numberPrefix}${String(lastSeq + 1).padStart(6, "0")}`;

  const parsedScheduledAt = details.scheduledAt ? parseUaeDateTimeLocal(details.scheduledAt) : null;

  const order = await prisma.order.create({
    data: {
      number,
      date,
      scheduledAt: parsedScheduledAt,
      customerId: dbCustomer.id,
      locationUrl: details.locationUrl.trim() || null,
      orderType: details.orderType,
      priceAgreed: details.priceAgreed,
      customerLanguage: details.customerLanguage,
      notes: details.notes.trim() || null,
      status: "Assigned",
      teamId: details.teamId || null,
      assignedToId: details.assignedToId,
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/employee/orders");
  return { ok: true, id: order.id };
}

export async function updateOrder(
  orderId: string,
  customer: OrderCustomerInput,
  details: OrderDetailsInput
): Promise<OrderActionResult> {
  await requireEmployee("ADMIN");

  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) return { ok: false, error: "Order not found." };

  const error = validateOrderInput(customer, details);
  if (error) return { ok: false, error };

  const dbCustomer = await findOrCreateCustomer(customer, existing.createdById);
  const parsedScheduledAt = details.scheduledAt ? parseUaeDateTimeLocal(details.scheduledAt) : null;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      customerId: dbCustomer.id,
      scheduledAt: parsedScheduledAt,
      locationUrl: details.locationUrl.trim() || null,
      orderType: details.orderType,
      priceAgreed: details.priceAgreed,
      customerLanguage: details.customerLanguage,
      notes: details.notes.trim() || null,
      teamId: details.teamId || null,
      assignedToId: details.assignedToId,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/employee/orders");
  revalidatePath(`/employee/orders/${orderId}`);
  return { ok: true, id: orderId };
}

// Admin-only status override, layered on top of (and independent from) the
// employee's own Accept/Start Driving/Arrive/Start Work/Complete workflow.
export async function setOrderStatus(
  orderId: string,
  status: string,
  options: { reason?: string; newScheduledAt?: string } = {}
): Promise<OrderActionResult> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found." };

  const previousStatus = order.status;
  if (previousStatus === status && status !== "Reschedule") return { ok: true, id: orderId };

  const now = new Date();
  const reason = options.reason?.trim() || null;
  const updateData: Prisma.OrderUpdateInput = { status };
  let previousScheduledAt: Date | null = null;
  let newScheduledAt: Date | null = null;

  if (status === "Done") {
    updateData.doneAt = now;
    updateData.doneBy = { connect: { id: session.employeeId } };
  } else if (status === "Cancelled") {
    updateData.cancelledAt = now;
    updateData.cancelledBy = { connect: { id: session.employeeId } };
    updateData.cancellationReason = reason;
  } else if (status === "Reschedule") {
    newScheduledAt = options.newScheduledAt ? parseUaeDateTimeLocal(options.newScheduledAt) : null;
    if (!newScheduledAt) return { ok: false, error: "Enter a valid new date and time." };
    previousScheduledAt = order.scheduledAt;
    updateData.rescheduledAt = now;
    updateData.rescheduledBy = { connect: { id: session.employeeId } };
    updateData.rescheduleReason = reason;
    updateData.scheduledAt = newScheduledAt;
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: updateData }),
    prisma.orderStatusChange.create({
      data: {
        orderId,
        previousStatus,
        newStatus: status,
        reason,
        previousScheduledAt,
        newScheduledAt,
        changedById: session.employeeId,
      },
    }),
  ]);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/employee/orders");
  revalidatePath(`/employee/orders/${orderId}`);
  revalidatePath("/admin/customers");
  return { ok: true, id: orderId };
}

export async function deleteOrder(orderId: string) {
  await requireAdmin();
  await prisma.order.delete({ where: { id: orderId } });
  revalidatePath("/employee/orders");
  redirect("/admin/orders?toast=1");
}
