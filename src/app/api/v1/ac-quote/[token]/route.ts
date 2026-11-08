import { NextRequest } from "next/server";
import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { publicView } from "@/lib/acquote/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// The customer's own quotation, from the private link: what it says, where it stands and what they may still do with it.
export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const view = await publicView(token);
  if (!view) return apiError("not_found", "This link is not valid.", 404);
  return apiSuccess(view);
}
