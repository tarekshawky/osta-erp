import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, corsPreflight, parseJsonBody } from "@/lib/apiResponse";
import { requireCustomer } from "@/lib/customerAuth";
import { releaseHold } from "@/lib/calendar/public";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Lets go of a held time (the customer chose another, or left). The API allows GET and POST only, so this is a POST rather than a DELETE.
export async function POST(request: NextRequest) {
  const auth = await requireCustomer(request);
  if ("error" in auth) return auth.error;
  const parsed = z.object({ holdKey: z.string().min(8).max(100) }).safeParse(await parseJsonBody<unknown>(request));
  if (!parsed.success) return apiError("invalid_request", "Missing hold.", 400);
  await releaseHold(parsed.data.holdKey, auth.customer.id);
  return apiSuccess({ released: true });
}
