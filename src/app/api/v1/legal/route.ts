import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { publicIndex } from "@/lib/legal/publicLegal";

export function OPTIONS() { return corsPreflight(); }

// All published legal documents, grouped by category, in menu order.
export async function GET() {
  return apiSuccess(await publicIndex());
}
