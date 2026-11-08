import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { publicConfig } from "@/lib/acquote/config";
import { loadConfig } from "@/lib/acquote/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// The calculator's price list: only what the administrator has switched on. Prices are public by design (the page shows them).
export async function GET() {
  return apiSuccess(publicConfig(await loadConfig()));
}
