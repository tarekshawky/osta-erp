import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { loadPublicPackages } from "@/lib/maintenance/data";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Public, unauthenticated: the active annual maintenance packages, their services and the page texts and terms for the website.
export async function GET() {
  try {
    return apiSuccess(await loadPublicPackages());
  } catch {
    // The packages tables are not there yet (or the database hiccuped): the website shows nothing instead of failing the page.
    return apiSuccess({ settings: null, services: [], packages: [], comparison: [], terms: { en: [], ar: [] } });
  }
}
