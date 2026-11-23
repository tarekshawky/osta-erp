import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { searchableDocs } from "@/lib/legal/publicLegal";
import { searchDocs } from "@/lib/legal/search";

export function OPTIONS() { return corsPreflight(); }

// Searches the published documents: /api/v1/legal/search?q=...&lang=en|ar&category=A&country=AE
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 200);
  if (q.length < 2) return apiError("bad_request", "Type at least 2 characters.", 400);
  const lang = sp.get("lang") === "ar" ? "ar" : "en";
  const hits = searchDocs(await searchableDocs(), q, { lang, category: sp.get("category") || undefined, country: sp.get("country") || undefined, limit: 20 });
  return apiSuccess({ query: q, hits });
}
