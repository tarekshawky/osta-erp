import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, corsPreflight, parseJsonBody } from "@/lib/apiResponse";
import { submitByCustomer } from "@/lib/acquote/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

const Body = z.object({ book: z.boolean().default(false) });

// "Send to Osta" (book: false) or "Book Installation" (book: true). The team is told; neither confirms an appointment.
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = Body.safeParse((await parseJsonBody<unknown>(request)) ?? {});
  if (!body.success) return apiError("invalid_request", "Invalid request.", 400);
  const r = await submitByCustomer(token, body.data.book);
  if (!r.ok) return apiError("invalid_state", r.error, 409);
  return apiSuccess({ received: true, number: r.number, booking: body.data.book });
}
