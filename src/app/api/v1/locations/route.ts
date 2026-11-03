import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { loadBranches } from "@/lib/locations/data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Public: every active branch (real office) with its address, coordinates, map, contact details, hours, coverage areas and FAQs.
export async function GET() {
  const { pub } = await loadBranches();
  return apiSuccess({ locations: pub });
}
