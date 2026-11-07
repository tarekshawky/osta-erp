import { NextRequest } from "next/server";
import { loadEngineData } from "@/lib/maintenance/data";
import { evaluateBuilder } from "@/lib/maintenance/builder";
import { EvaluateInput, toNeeds } from "@/lib/maintenance/builderInput";
import { apiSuccess, apiError, parseJsonBody, corsPreflight } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// The live part of the Smart Package Builder: given the package the customer picked and what they need, answers with the upgrade
// notices, the recommended package and the price breakdown. It only reads and calculates; nothing is saved.
export async function POST(request: NextRequest) {
  const parsed = EvaluateInput.safeParse(await parseJsonBody<unknown>(request));
  if (!parsed.success) return apiError("invalid_request", "Check the selection and try again.", 400);
  const input = parsed.data;
  const data = await loadEngineData(input.group).catch(() => null);
  if (!data || !data.config.enabled) return apiError("not_found", "The package builder is not available for this page.", 404);
  const { packages, services } = data.pub;
  if (!packages.some((p) => p.id === input.selectedId) || (input.chosenId && !packages.some((p) => p.id === input.chosenId))) return apiError("not_found", "This package is not available.", 404);
  return apiSuccess(evaluateBuilder({ packages, services, options: data.options, config: data.config, tax: data.tax, selectedId: input.selectedId, chosenId: input.chosenId, needs: toNeeds(input.needs) }));
}
