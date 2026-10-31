import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customerAuth";
import { apiSuccess, apiError, parseJsonBody, parsePagination, corsPreflight } from "@/lib/apiResponse";
import { ORDER_TYPES, CUSTOMER_LANGUAGES, generateOrderNumber, generateOrderNumbers, parseUaeDateTimeLocal } from "@/lib/orderData";
import { notifyAdminOfBooking } from "@/lib/emailSender";
import { z } from "zod";
import { resolveQuote } from "@/lib/pricing/resolve";
import { isPaid } from "@/lib/orders/customerFlow";
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
  invoice: { select: { status: true, amount: true } },
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

  // An unpaid invoice is not shown to the customer yet (rate, pay, then the invoice appears).
  const shaped = orders.map(({ invoice, invoiceId, ...o }) => ({ ...o, invoiceId: invoice && isPaid(invoice.status) ? invoiceId : null, paymentDue: invoice && !isPaid(invoice.status) ? invoice.amount : null }));
  return apiSuccess(shaped, { meta: { page, pageSize, total } });
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
  optionId: z.string().min(1).optional(),
  scheduledAt: z.string().optional(),
  locationUrl: z.string().max(2000).optional(),
  customerLanguage: z.string().optional(),
  notes: z.string().max(2000).optional(),
  // More services for the same visit (same place, time and booking type): one order is created for each, the booking fee only once.
  extraServices: z
    .array(z.object({ serviceId: z.string().min(1), quantity: z.number().int().min(1).max(500), addOnIds: z.array(z.string()).max(20).optional(), optionId: z.string().min(1).optional() }))
    .max(19)
    .optional(),
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
  const extras = input.extraServices ?? [];

  // Retrying the same request returns what was already created (the extra orders use "<key>#<n>").
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: orderSelect });
  if (existing) {
    const extraOrders = extras.length ? await prisma.order.findMany({ where: { idempotencyKey: { startsWith: `${input.idempotencyKey}#` } }, select: orderSelect, orderBy: { createdAt: "asc" } }) : [];
    return apiSuccess({ ...existing, extraOrders }, { status: 200 });
  }

  const scheduledAt = input.scheduledAt ? parseUaeDateTimeLocal(input.scheduledAt) : null;
  if (input.scheduledAt && !scheduledAt) {
    return apiError("invalid_request", "scheduledAt must be formatted as YYYY-MM-DDTHH:mm.", 400);
  }

  // Price every service first: if any one is unavailable, nothing is created.
  const lines = [
    { serviceId: input.serviceId, quantity: input.quantity, addOnIds: input.addOnIds, optionId: input.optionId, waive: false },
    ...extras.map((e) => ({ ...e, waive: true })),
  ];
  const resolvedLines: Awaited<ReturnType<typeof resolveQuote>>[] = [];
  try {
    for (const l of lines) {
      resolvedLines.push(await resolveQuote({ regionId: input.regionId, serviceId: l.serviceId, quantity: l.quantity, bookingTypeId: input.bookingTypeId, addOnIds: l.addOnIds, optionId: l.optionId, waiveBookingFee: l.waive }));
    }
  } catch (err) {
    if (err instanceof QuoteError) return apiError(err.code, err.message, 422);
    if (err instanceof Error && /not_found|unavailable|missing/.test(err.message)) {
      return apiError("invalid_request", "Selected service, booking type or add-on is not available.", 422);
    }
    throw err;
  }

  const now = new Date();
  const numbers = await generateOrderNumbers(lines.length);
  const created = await prisma.$transaction(async (tx) => {
    const out = [];
    for (const [i, l] of lines.entries()) {
      const resolved = resolvedLines[i];
      const order = await tx.order.create({
        data: {
          number: numbers[i],
          date: now,
          scheduledAt,
          customerId: customer.id,
          locationUrl: input.locationUrl?.trim() || customer.locationUrl || null,
          customerLanguage: input.customerLanguage ?? customer.language,
          notes: [input.notes?.trim(), i > 0 ? `Booked together with ${numbers[0]}` : lines.length > 1 ? `Booked together with ${numbers.slice(1).join(", ")}` : ""].filter(Boolean).join("\n") || null,
          status: "Requested",
          priceAgreed: (resolved.quote.totalFils / 100).toFixed(2),
          regionId: input.regionId,
          bookableServiceId: l.serviceId,
          bookingTypeId: input.bookingTypeId,
          quantity: resolved.quote.quantity,
          totalFils: resolved.quote.totalFils,
          pricingSnapshot: { ...resolved.quote, ruleSetId: resolved.ruleSetId, addOnIds: resolved.priceMode === "INSPECTION" ? [] : l.addOnIds ?? [], option: resolved.option, priceMode: resolved.priceMode },
          visitFeePolicyId: resolved.policyId,
          consentAcceptedAt: now,
          idempotencyKey: i === 0 ? input.idempotencyKey : `${input.idempotencyKey}#${i}`,
        },
        select: orderSelect,
      });
      await tx.orderEvent.create({ data: { orderId: order.id, type: "CREATED" } });
      out.push(order);
    }
    return out;
  });
  const [order, ...extraOrders] = created;

  try {
    const first = resolvedLines[0];
    await notifyAdminOfBooking({
      orderNumber: order.number,
      customerName: customer.name,
      phone: customer.phone,
      location: order.locationUrl || "Not specified",
      service: lines.length > 1 ? `${lines.length} services booked together (${numbers.join(", ")})` : first.priceMode === "INSPECTION" ? "Price after inspection (booking fee " + (first.quote.totalFils / 100).toFixed(2) + " AED)" : `${input.quantity} x service (${(first.quote.totalFils / 100).toFixed(2)} AED)`,
      scheduledAt: order.scheduledAt ? order.scheduledAt.toISOString() : "Not specified",
    });
  } catch (err) {
    console.error("[orders] admin notification failed:", err);
  }

  return apiSuccess({ ...order, totalFils: resolvedLines[0].quote.totalFils, pricing: resolvedLines[0].quote, extraOrders }, { status: 201 });
}
