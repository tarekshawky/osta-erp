"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { MAX_ORDER_PHOTOS_PER_KIND } from "@/lib/orderData";

export type OrderWorkflowResult = { ok: boolean; error?: string };

async function loadOwnedOrder(orderId: string) {
  const session = await getSession();
  if (!session) return null;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.assignedToId !== session.employeeId) return null;
  return order;
}

function revalidateOrder(orderId: string) {
  revalidatePath(`/employee/orders/${orderId}`);
  revalidatePath("/employee/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function acceptOrder(orderId: string): Promise<OrderWorkflowResult> {
  const order = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, error: "Not authorized." };
  if (order.status !== "Assigned") return { ok: false, error: "This order was already accepted." };

  await prisma.order.update({ where: { id: orderId }, data: { status: "Accepted", acceptedAt: new Date() } });
  revalidateOrder(orderId);
  return { ok: true };
}

export async function startDriving(orderId: string, etaMinutes: string): Promise<OrderWorkflowResult> {
  const order = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, error: "Not authorized." };
  if (order.status !== "Accepted") return { ok: false, error: "Accept the order first." };
  const eta = etaMinutes.trim();
  if (!eta) return { ok: false, error: "Enter the estimated arrival time." };

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "On The Way", departedAt: new Date(), etaMinutes: eta },
  });
  revalidateOrder(orderId);
  return { ok: true };
}

export async function markArrived(orderId: string, lat: number | null, lng: number | null): Promise<OrderWorkflowResult> {
  const order = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, error: "Not authorized." };
  if (order.status !== "On The Way") return { ok: false, error: "Start driving first." };

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "Arrived", arrivedAt: new Date(), arrivalGpsLat: lat, arrivalGpsLng: lng },
  });
  revalidateOrder(orderId);
  return { ok: true };
}

export async function startWork(orderId: string): Promise<OrderWorkflowResult> {
  const order = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, error: "Not authorized." };
  if (order.status !== "Arrived") return { ok: false, error: "Mark the order as arrived first." };

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
  const order = await loadOwnedOrder(orderId);
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
  const order = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, error: "Not authorized." };
  if (order.status !== "In Progress") return { ok: false, error: "Start work first." };

  await prisma.order.update({ where: { id: orderId }, data: { status: "Done" } });
  revalidateOrder(orderId);
  return { ok: true };
}
