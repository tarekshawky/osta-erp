import { NextRequest } from "next/server";
import { apiError, apiSuccess, corsPreflight, parseJsonBody } from "@/lib/apiResponse";
import { InputSchema, buildDuct } from "@/lib/ductwork/engine";
import { loadConfig } from "@/lib/ductwork/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// The live summary while the customer fills in the calculator. The website draws what this answers and works nothing out itself.
export async function POST(request: NextRequest) {
  const parsed = InputSchema.safeParse(await parseJsonBody<unknown>(request));
  if (!parsed.success) return apiError("invalid_request", "Please check the duct sections, components and services.", 400);
  const r = buildDuct(await loadConfig(), parsed.data);
  if (!r.ok) return apiError("invalid_request", r.error, 400);
  return apiSuccess({ lines: r.lines, sections: r.sections, totals: r.totals });
}
