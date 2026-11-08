import { NextRequest } from "next/server";
import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { requestBooking } from "@/lib/splitquote/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// "Request Booking": the team is told. It does not confirm an appointment.
export async function POST(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const r = await requestBooking(token);
  if (!r.ok) return apiError("invalid_state", r.error, 409);
  return apiSuccess({ received: true, number: r.number });
}
