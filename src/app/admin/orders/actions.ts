"use server";

import { checkOrderSlot, syncOrder } from "@/lib/calendar/service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { getSession, isAdminRole } from "@/lib/session";
import { parseUaeDateTimeLocal, generateOrderNumber } from "@/lib/orderData";
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
  leadSource: string;
};

export type OrderActionResult = { ok: boolean; id?: string; error?: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) redirect("/");
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

  const parsedScheduledAt = details.scheduledAt ? parseUaeDateTimeLocal(details.scheduledAt) : null;

  // A team the calendar manages can never be booked twice at the same time. Checked before anything is created, so a refused order leaves no customer behind.
  const slot = await checkOrderSlot({ teamId: details.teamId || null, scheduledAt: parsedScheduledAt });
  if (!slot.ok) return { ok: false, error: slot.error };

  const dbCustomer = await findOrCreateCustomer({ ...customer, leadSource: details.leadSource }, admin.id);

  const number = await generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      number,
      date: new Date(),
      scheduledAt: parsedScheduledAt,
      customerId: dbCustomer.id,
      locationUrl: details.locationUrl.trim() || null,
      orderType: details.orderType,
      priceAgreed: details.priceAgreed,
      customerLanguage: details.customerLanguage,
      leadSource: details.leadSource,
      notes: details.notes.trim() || null,
      status: "Assigned",
      teamId: details.teamId || null,
      assignedToId: details.assignedToId,
      createdById: admin.id,
    },
  });

  const placed = await syncOrder(order.id, { id: admin.id, name: admin.name });
  if (!placed.ok) {
    // Someone booked the same team and time a moment ago: nothing is created.
    await prisma.order.delete({ where: { id: order.id } });
    return { ok: false, error: placed.error };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/calendar");
  revalidatePath("/employee/orders");
  return { ok: true, id: order.id };
}

export async function updateOrder(
  orderId: string,
  customer: OrderCustomerInput,
  details: OrderDetailsInput
): Promise<OrderActionResult> {
  const admin = await requireEmployee("ADMIN");

  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) return { ok: false, error: "Order not found." };

  const error = validateOrderInput(customer, details);
  if (error) return { ok: false, error };

  const parsedScheduledAt = details.scheduledAt ? parseUaeDateTimeLocal(details.scheduledAt) : null;

  const slot = await checkOrderSlot({ orderId, teamId: details.teamId || null, scheduledAt: parsedScheduledAt, bookableServiceId: existing.bookableServiceId, quantity: existing.quantity });
  if (!slot.ok) return { ok: false, error: slot.error };

  // existing.createdById is null for customer self-booked ("Requested") orders --
  // fall back to the admin doing this edit as the attribution if a new Customer
  // record ends up being created here (rare in the edit flow, but findOrCreateCustomer
  // always needs a createdById).
  const dbCustomer = await findOrCreateCustomer(
    { ...customer, leadSource: details.leadSource },
    existing.createdById ?? admin.id
  );

  await prisma.order.update({
    where: { id: orderId },
    data: {
      customerId: dbCustomer.id,
      scheduledAt: parsedScheduledAt,
      locationUrl: details.locationUrl.trim() || null,
      orderType: details.orderType,
      priceAgreed: details.priceAgreed,
      customerLanguage: details.customerLanguage,
      leadSource: details.leadSource,
      notes: details.notes.trim() || null,
      teamId: details.teamId || null,
      assignedToId: details.assignedToId,
      // A customer-booked order starts as "Requested" (no team/employee yet); the
      // moment an admin assigns one here, it moves into the normal employee workflow.
      ...(existing.status === "Requested" ? { status: "Assigned" } : {}),
    },
  });

  const placed = await syncOrder(orderId, { id: admin.id, name: admin.name });
  if (!placed.ok) return { ok: false, id: orderId, error: `The order was saved, but ${placed.error}` };

  revalidatePath("/admin/orders");
  revalidatePath("/admin/calendar");
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
  if (!session || !isAdminRole(session.role)) redirect("/");

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
    const slot = await checkOrderSlot({ orderId, teamId: order.teamId, scheduledAt: newScheduledAt, bookableServiceId: order.bookableServiceId, quantity: order.quantity });
    if (!slot.ok) return { ok: false, error: slot.error };
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

  // Cancelling frees the team's time; rescheduling moves the booking; a completed order stays on the calendar as done.
  if (status === "Cancelled" || status === "Reschedule") {
    const who = await prisma.employee.findUnique({ where: { id: session.employeeId }, select: { name: true } });
    const placed = await syncOrder(orderId, { id: session.employeeId, name: who?.name ?? "Admin" });
    if (!placed.ok) return { ok: false, id: orderId, error: `The status was saved, but ${placed.error}` };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/calendar");
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
