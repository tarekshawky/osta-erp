import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";
import { clientIp } from "@/lib/authLimits";
import { acceptByLink, publicView } from "@/lib/contracts/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

const tokenOk = (t: string) => /^[A-Za-z0-9_-]{20,64}$/.test(t);

// The customer's own agreement page: what they agreed to, its status and, when it is waiting for them, the step they must take.
export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!tokenOk(token)) return apiError("not_found", "This link is not valid.", 404);
  const view = await publicView(token);
  if (!view) return apiError("not_found", "This link is not valid.", 404);
  return apiSuccess(view);
}

const Accept = z.object({ accepted: z.array(z.boolean()).length(5) });

// The customer accepts a new or revised version (a renewal or a price change) with all five statements ticked.
export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!tokenOk(token)) return apiError("not_found", "This link is not valid.", 404);
  const parsed = Accept.safeParse(await parseJsonBody<unknown>(request));
  if (!parsed.success || !parsed.data.accepted.every(Boolean)) return apiError("agreement_required", "Please accept every statement to continue.", 400);
  const r = await acceptByLink(token, { ip: clientIp(request.headers), agent: request.headers.get("user-agent") ?? "" });
  if (!r.ok) return apiError("invalid_state", r.error, 409);
  return apiSuccess({ accepted: true, number: r.number });
}
