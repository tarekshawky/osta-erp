import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, corsPreflight, parseJsonBody } from "@/lib/apiResponse";
import { requireCustomer } from "@/lib/customerAuth";
import { createHold } from "@/lib/calendar/public";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

const schema = z.object({
  regionId: z.string().min(1).max(64),
  lines: z.array(z.object({ serviceId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(500) })).min(1).max(20),
  scheduledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
});

// Keeps the time the customer chose for a few minutes while they finish booking. One hold at a time per customer: a new one replaces the old.
export async function POST(request: NextRequest) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await parseJsonBody<unknown>(request));
  if (!parsed.success) return apiError("invalid_request", "Choose the date and time again.", 400);
  const r = await createHold({ customerId: auth.customer.id, ...parsed.data });
  if (!r.ok) return apiError(r.code, r.error, r.code === "slot_taken" ? 409 : 400);
  return apiSuccess(r.hold, { status: 201 });
}
