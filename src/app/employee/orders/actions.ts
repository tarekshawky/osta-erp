"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  buildAcceptedWhatsAppMessage,
  buildOnTheWayWhatsAppMessage,
  buildArrivedWhatsAppMessage,
  buildCustomerWhatsAppUrl,
  MAX_ORDER_PHOTOS_PER_KIND,
} from "@/lib/orderData";

export type OrderWorkflowResult = { ok: boolean; error?: string; whatsappUrl?: string };

async function loadOwnedOrder(orderId: string) {
  const session = await getSession();
  if (!session) return { session: null, order: null };
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, assignedTo: true },
  });
  if (!order || order.assignedToId !== session.employeeId) return { session, order: null };
  return { session, order };
}

function revalidateOrder(orderId: string) {
  revalidatePath(`/employee/orders/${orderId}`);
  revalidatePath("/employee/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function acceptOrder(orderId: string): Promise<OrderWorkflowResult> {
  const { order } = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, error: "Not authorized." };
  if (order.status !== "Assigned") return { ok: false, error: "This order was already accepted." };

  await prisma.order.update({ where: { id: orderId }, data: { status: "Accepted", acceptedAt: new Date() } });
  revalidateOrder(orderId);
  return { ok: true };
}

export async function sendAcceptedWhatsApp(orderId: string): Promise<OrderWorkflowResult> {
  const { session, order } = await loadOwnedOrder(orderId);
  if (!order || !session) return { ok: false, error: "Not authorized." };
  if (order.status !== "Accepted") return { ok: false, error: "Accept the order first." };
  if (order.acceptedWhatsAppSentAt) return { ok: false, error: "This message was already sent." };

  const message = buildAcceptedWhatsAppMessage(order.customer.name, order.assignedTo.name, order.customerLanguage);
  const url = buildCustomerWhatsAppUrl(order.customer.phone, message);

  await prisma.order.update({ where: { id: orderId }, data: { acceptedWhatsAppSentAt: new Date() } });
  await prisma.orderWhatsAppLog.create({ data: { orderId, messageType: "Accepted", sentById: session.employeeId } });
  revalidateOrder(orderId);
  return { ok: true, whatsappUrl: url };
}

export async function sendOnTheWayWhatsApp(orderId: string, etaMinutes: string): Promise<OrderWorkflowResult> {
  const { session, order } = await loadOwnedOrder(orderId);
  if (!order || !session) return { ok: false, error: "Not authorized." };
  if (order.status !== "Accepted" || !order.acceptedWhatsAppSentAt) {
    return { ok: false, error: "Send the acceptance message first." };
  }
  const eta = etaMinutes.trim();
  if (!eta) return { ok: false, error: "Enter the estimated arrival time." };

  const message = buildOnTheWayWhatsAppMessage(order.customer.name, eta, order.customerLanguage);
  const url = buildCustomerWhatsAppUrl(order.customer.phone, message);

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "On The Way", departedAt: new Date(), etaMinutes: eta, onTheWayWhatsAppSentAt: new Date() },
  });
  await prisma.orderWhatsAppLog.create({ data: { orderId, messageType: "On The Way", sentById: session.employeeId } });
  revalidateOrder(orderId);
  return { ok: true, whatsappUrl: url };
}

export async function markArrived(orderId: string, lat: number | null, lng: number | null): Promise<OrderWorkflowResult> {
  const { order } = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, error: "Not authorized." };
  if (order.status !== "On The Way") return { ok: false, error: "Start driving first." };

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "Arrived", arrivedAt: new Date(), arrivalGpsLat: lat, arrivalGpsLng: lng },
  });
  revalidateOrder(orderId);
  return { ok: true };
}

export async function sendArrivedWhatsApp(orderId: string): Promise<OrderWorkflowResult> {
  const { session, order } = await loadOwnedOrder(orderId);
  if (!order || !session) return { ok: false, error: "Not authorized." };
  if (order.status !== "Arrived") return { ok: false, error: "Mark the order as arrived first." };
  if (order.arrivedWhatsAppSentAt) return { ok: false, error: "This message was already sent." };

  const message = buildArrivedWhatsAppMessage(order.customer.name, order.customerLanguage);
  const url = buildCustomerWhatsAppUrl(order.customer.phone, message);

  await prisma.order.update({ where: { id: orderId }, data: { arrivedWhatsAppSentAt: new Date() } });
  await prisma.orderWhatsAppLog.create({ data: { orderId, messageType: "Arrived", sentById: session.employeeId } });
  revalidateOrder(orderId);
  return { ok: true, whatsappUrl: url };
}

export async function startWork(orderId: string): Promise<OrderWorkflowResult> {
  const { order } = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, error: "Not authorized." };
  if (order.status !== "Arrived" || !order.arrivedWhatsAppSentAt) {
    return { ok: false, error: "Send the arrival message first." };
  }
  await prisma.order.update({ where: { id: orderId }, data: { status: "In Progress", workStartedAt: new Date() } });
  revalidateOrder(orderId);
  return { ok: true };
}

export async function saveJobDetails(
  orderId: string,
  jobNotes: string,
  beforePhotos: string[],
  afterPhotos: string[]
): Promise<OrderWorkflowResult> {
  const { order } = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, error: "Not authorized." };
  if (order.status !== "In Progress") return { ok: false, error: "Start work first." };
  if (beforePhotos.length > MAX_ORDER_PHOTOS_PER_KIND || afterPhotos.length > MAX_ORDER_PHOTOS_PER_KIND) {
    return { ok: false, error: `Up to ${MAX_ORDER_PHOTOS_PER_KIND} photos per set.` };
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { jobNotes: jobNotes.trim() || null } }),
    prisma.orderPhoto.deleteMany({ where: { orderId } }),
    prisma.orderPhoto.createMany({
      data: [
        ...beforePhotos.map((dataUrl) => ({ orderId, kind: "Before", dataUrl })),
        ...afterPhotos.map((dataUrl) => ({ orderId, kind: "After", dataUrl })),
      ],
    }),
  ]);
  revalidateOrder(orderId);
  return { ok: true };
}

export async function completeJob(orderId: string): Promise<OrderWorkflowResult> {
  const { order } = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, error: "Not authorized." };
  if (order.status !== "In Progress") return { ok: false, error: "Start work first." };

  await prisma.order.update({ where: { id: orderId }, data: { status: "Done" } });
  revalidateOrder(orderId);
  return { ok: true };
}
