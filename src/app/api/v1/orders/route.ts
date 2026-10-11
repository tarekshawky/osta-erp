import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customerAuth";
import { apiSuccess, apiError, parseJsonBody, parsePagination, corsPreflight } from "@/lib/apiResponse";
import { ORDER_TYPES, CUSTOMER_LANGUAGES, generateOrderNumber, parseUaeDateTimeLocal } from "@/lib/orderData";
import { notifyAdminOfBooking } from "@/lib/emailSender";
import { z } from "zod";
import { resolveQuote } from "@/lib/pricing/resolve";
import { QuoteError } from "@/lib/pricing/priceQuote";

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
  totalFils: true,
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

// Priced booking: the client sends only *choices*. Any price/total it sends is ignored.
const pricedBookingSchema = z.object({
  serviceId: z.string().min(1),
  regionId: z.string().min(1),
  bookingTypeId: z.string().min(1),
  quantity: z.number().int().min(1).max(500),
  addOnIds: z.array(z.string()).max(20).optional(),
  scheduledAt: z.string().optional(),
  locationUrl: z.string().max(2000).optional(),
  customerLanguage: z.string().optional(),
  notes: z.string().max(2000).optional(),
  consent: z.literal(true),
  idempotencyKey: z.string().min(8).max(100),
});

export async function POST(request: NextRequest) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const { customer } = auth;

  const body = await parseJsonBody<BookOrderBody>(request);
  if (body === null) return apiError("invalid_request", "Request body must be valid JSON.", 400);


  if (typeof (body as { serviceId?: unknown }).serviceId === "string") {
    return createPricedOrder(body, customer);
  }

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

async function createPricedOrder(
  raw: unknown,
  customer: { id: string; name: string; phone: string; language: string; locationUrl: string | null }
) {
  const parsed = pricedBookingSchema.safeParse(raw);
  if (!parsed.success) {
    const consentMissing = parsed.error.issues.some((i) => i.path[0] === "consent");
    return apiError(
      consentMissing ? "consent_required" : "invalid_request",
      consentMissing ? "You must accept the booking terms and visit-fee policy." : "Invalid booking request.",
      400
    );
  }
  const input = parsed.data;

  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: orderSelect });
  if (existing) return apiSuccess(existing, { status: 200 });

  const scheduledAt = input.scheduledAt ? parseUaeDateTimeLocal(input.scheduledAt) : null;
  if (input.scheduledAt && !scheduledAt) {
    return apiError("invalid_request", "scheduledAt must be formatted as YYYY-MM-DDTHH:mm.", 400);
  }

  let resolved;
  try {
    resolved = await resolveQuote(input);
  } catch (err) {
    if (err instanceof QuoteError) return apiError(err.code, err.message, 422);
    if (err instanceof Error && /not_found|unavailable|missing/.test(err.message)) {
      return apiError("invalid_request", "Selected service, booking type or add-on is not available.", 422);
    }
    throw err;
  }

  const number = await generateOrderNumber();
  const now = new Date();
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        number,
        date: now,
        scheduledAt,
        customerId: customer.id,
        locationUrl: input.locationUrl?.trim() || customer.locationUrl || null,
        customerLanguage: input.customerLanguage ?? customer.language,
        notes: input.notes?.trim() || null,
        status: "Requested",
        priceAgreed: (resolved.quote.totalFils / 100).toFixed(2),
        regionId: input.regionId,
        bookableServiceId: input.serviceId,
        bookingTypeId: input.bookingTypeId,
        quantity: input.quantity,
        totalFils: resolved.quote.totalFils,
        pricingSnapshot: { ...resolved.quote, ruleSetId: resolved.ruleSetId, addOnIds: input.addOnIds ?? [] },
        visitFeePolicyId: resolved.policyId,
        consentAcceptedAt: now,
        idempotencyKey: input.idempotencyKey,
      },
      select: orderSelect,
    });
    await tx.orderEvent.create({ data: { orderId: created.id, type: "CREATED" } });
    return created;
  });

  try {
    await notifyAdminOfBooking({
      orderNumber: order.number,
      customerName: customer.name,
      phone: customer.phone,
      location: order.locationUrl || "Not specified",
      service: `${input.quantity} x service (${(resolved.quote.totalFils / 100).toFixed(2)} AED)`,
      scheduledAt: order.scheduledAt ? order.scheduledAt.toISOString() : "Not specified",
    });
  } catch (err) {
    console.error("[orders] admin notification failed:", err);
  }

  return apiSuccess({ ...order, totalFils: resolved.quote.totalFils, pricing: resolved.quote }, { status: 201 });
}
