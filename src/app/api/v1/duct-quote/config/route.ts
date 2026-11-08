import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { publicConfig } from "@/lib/ductwork/config";
import { loadConfig } from "@/lib/ductwork/service";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// The ductwork calculator's price list and options: only what the administrator has switched on. Prices are public by design.
export async function GET() {
  return apiSuccess(publicConfig(await loadConfig()));
}
