import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { loadPublicKnowledge } from "@/lib/knowledge/data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Public, unauthenticated: the Knowledge Center as the website shows it. `data` is null while the public page is switched
// off (or before its tables exist), so the website answers "not found".
export async function GET() {
  try {
    return apiSuccess(await loadPublicKnowledge());
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2021") return apiSuccess(null);
    throw error;
  }
}
