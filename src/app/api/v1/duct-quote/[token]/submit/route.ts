import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, corsPreflight, parseJsonBody } from "@/lib/apiResponse";
import { REQUEST_TYPES, submitDuct } from "@/lib/ductwork/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

const Body = z.object({ type: z.enum(REQUEST_TYPES) });

// "Request Site Inspection" (inspection), "Request Final Quotation" (final) or "Submit Project Inquiry" (inquiry). The team is told;
// none of them confirms anything.
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = Body.safeParse(await parseJsonBody<unknown>(request));
  if (!body.success) return apiError("invalid_request", "Invalid request.", 400);
  const r = await submitDuct(token, body.data.type);
  if (!r.ok) return apiError("invalid_state", r.error, 409);
  return apiSuccess({ received: true, number: r.number, type: body.data.type });
}
