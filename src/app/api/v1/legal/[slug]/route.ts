import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { publicDocument } from "@/lib/legal/publicLegal";

export function OPTIONS() { return corsPreflight(); }

// One published document. `?version=N` returns an earlier published version (for the version history).
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = new URL(request.url).searchParams.get("version");
  const version = raw ? Number.parseInt(raw, 10) : undefined;
  if (raw && (!version || version < 1)) return apiError("bad_request", "version must be a positive number.", 400);
  const doc = await publicDocument(slug, version);
  if (!doc) return apiError("not_found", "Document not found.", 404);
  return apiSuccess(doc);
}
