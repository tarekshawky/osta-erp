import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { publicConfig } from "@/lib/splitquote/config";
import { loadConfig } from "@/lib/splitquote/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// The Split AC calculator's packages, prices, extras and texts: only what the administrator has switched on. Prices are public by design.
export async function GET() {
  return apiSuccess(publicConfig(await loadConfig()));
}
