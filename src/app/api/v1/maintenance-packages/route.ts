import { NextRequest } from "next/server";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { loadPublicPackages } from "@/lib/maintenance/data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Public, unauthenticated: the active annual maintenance packages, their services and the page texts and terms for the website.
export async function GET(request: NextRequest) {
  // ?group=<key> picks one set of packages (for example commercial-maintenance); without it, the original home packages.
  const group = (request.nextUrl.searchParams.get("group") ?? "").toLowerCase().slice(0, 40);
  if (group && !/^[a-z0-9-]+$/.test(group)) return apiSuccess({ key: group, ctaMode: "subscribe", settings: null, services: [], packages: [], comparison: [], terms: { en: [], ar: [] }, builder: null });
  try {
    return apiSuccess(await loadPublicPackages(group));
  } catch {
    // The packages tables are not there yet (or the database hiccuped): the website shows nothing instead of failing the page.
    return apiSuccess({ key: group, ctaMode: "subscribe", settings: null, services: [], packages: [], comparison: [], terms: { en: [], ar: [] }, builder: null });
  }
}
