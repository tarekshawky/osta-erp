import { NextRequest } from "next/server";
import { apiError, apiSuccess, corsPreflight, parseJsonBody } from "@/lib/apiResponse";
import { InputSchema, buildLines } from "@/lib/acquote/engine";
import { loadConfig } from "@/lib/acquote/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// The live price while the customer fills in the calculator. The website draws what this answers and works nothing out itself.
export async function POST(request: NextRequest) {
  const parsed = InputSchema.safeParse(await parseJsonBody<unknown>(request));
  if (!parsed.success) return apiError("invalid_request", "Please check the units and services.", 400);
  const r = buildLines(await loadConfig(), parsed.data);
  if (!r.ok) return apiError("invalid_request", r.error, 400);
  return apiSuccess({ lines: r.lines, totals: r.totals });
}
