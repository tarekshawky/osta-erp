import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customerAuth";
import { apiSuccess, apiError, parseJsonBody, parsePagination, corsPreflight } from "@/lib/apiResponse";
import { ORDER_TYPES, CUSTOMER_LANGUAGES, generateOrderNumber, parseUaeDateTimeLocal } from "@/lib/orderData";
import { notifyAdminOfBooking } from "@/lib/emailSender";

export function OPTIONS() {
  return corsPreflight();
}

const orderSelect = {
  id: true,
  number: true,
  date: true,
  scheduledAt: true,
  locationUrl: true,
  orderType: true,
  priceAgreed: true,
  customerLanguage: true,
  notes: true,
  status: true,
  team: { select: { name: true } },
  assignedTo: { select: { name: true } },
  invoiceId: true,
  doneAt: true,
  cancelledAt: true,
  cancellationReason: true,
  rescheduledAt: true,
  rescheduleReason: true,
  createdAt: true,
} as const;

export async function GET(request: NextRequest) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const { customer } = auth;

  const { page, pageSize, skip, take } = parsePagination(request.nextUrl.searchParams);
  const status = request.nextUrl.searchParams.get("status");

  const where = { customerId: customer.id, ...(status ? { status } : {}) };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, select: orderSelect, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.order.count({ where }),
  ]);

  return apiSuccess(orders, { meta: { page, pageSize, total } });
}

type BookOrderBody = {
  orderType?: string;
  scheduledAt?: string;
  locationUrl?: string;
  customerLanguage?: string;
  notes?: string;
};

export async function POST(request: NextRequest) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const { customer } = auth;

  const body = await parseJsonBody<BookOrderBody>(request);
  if (body === null) return apiError("invalid_request", "Request body must be valid JSON.", 400);

  const orderType = body.orderType ?? ORDER_TYPES[0];
  if (!ORDER_TYPES.includes(orderType as (typeof ORDER_TYPES)[number])) {
    return apiError("invalid_request", `orderType must be one of: ${ORDER_TYPES.join(", ")}.`, 400);
  }

  const customerLanguage = body.customerLanguage ?? customer.language;
  if (!CUSTOMER_LANGUAGES.includes(customerLanguage as (typeof CUSTOMER_LANGUAGES)[number])) {
    return apiError("invalid_request", `customerLanguage must be one of: ${CUSTOMER_LANGUAGES.join(", ")}.`, 400);
  }

  const scheduledAt = body.scheduledAt ? parseUaeDateTimeLocal(body.scheduledAt) : null;
  if (body.scheduledAt && !scheduledAt) {
    return apiError("invalid_request", "scheduledAt must be formatted as YYYY-MM-DDTHH:mm.", 400);
  }

  const number = await generateOrderNumber();
  const order = await prisma.order.create({
    data: {
      number,
      date: new Date(),
      scheduledAt,
      customerId: customer.id,
      locationUrl: body.locationUrl?.trim() || customer.locationUrl || null,
      orderType,
      customerLanguage,
      notes: body.notes?.trim() || null,
      status: "Requested",
      // No team/employee yet -- an admin triages via the Edit Order page, which
      // flips status to "Assigned" the moment one is set.
      teamId: null,
      assignedToId: null,
      createdById: null,
    },
    select: orderSelect,
  });

  // Same reasoning as the signup endpoint: a flaky email provider must never fail
  // the booking itself, and this is awaited so it finishes before the serverless
  // function returns and gets frozen.
  try {
    // The web app's booking form funnels its service-category picker into
    // "Service requested: <category>\n\n<notes>" since the Order model has no
    // dedicated service-category column -- pull that back out for a readable email.
    const serviceMatch = order.notes?.match(/^Service requested: (.+)$/m);
    await notifyAdminOfBooking({
      orderNumber: order.number,
      customerName: customer.name,
      phone: customer.phone,
      location: order.locationUrl || "Not specified",
      service: serviceMatch?.[1] ?? order.orderType,
      scheduledAt: order.scheduledAt ? order.scheduledAt.toISOString() : "Not specified",
    });
  } catch (err) {
    console.error("[orders] admin notification failed:", err);
  }

  return apiSuccess(order, { status: 201 });
}
