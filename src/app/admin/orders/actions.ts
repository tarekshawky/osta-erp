"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { parseUaeDateTimeLocal } from "@/lib/orderData";

export type OrderCustomerInput = {
  type: "INDIVIDUAL" | "COMPANY";
  name: string;
  companyName: string;
  trn: string;
  phone: string;
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

async function upsertOrderCustomer(customer: OrderCustomerInput, billName: string) {
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

  const billName = customer.type === "COMPANY" ? customer.companyName.trim() : customer.name.trim();
  const error = validateOrderInput(customer, details);
  if (error) return { ok: false, error };

  const dbCustomer = await upsertOrderCustomer(customer, billName);

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

  const billName = customer.type === "COMPANY" ? customer.companyName.trim() : customer.name.trim();
  const error = validateOrderInput(customer, details);
  if (error) return { ok: false, error };

  const dbCustomer = await upsertOrderCustomer(customer, billName);
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

export async function deleteOrder(orderId: string) {
  await requireAdmin();
  await prisma.order.delete({ where: { id: orderId } });
  revalidatePath("/employee/orders");
  redirect("/admin/orders?toast=1");
}
