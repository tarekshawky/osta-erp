import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, corsPreflight } from "@/lib/apiResponse";
import { promoteDueScheduledPages } from "@/lib/cms/publish";
import { toPublicPage } from "@/lib/cms/publicPage";
import { loadJsonLdArea, loadJsonLdSite } from "@/lib/seo/context";

export function OPTIONS() {
  return corsPreflight();
}

// Published content only. Drafts never leave the admin.
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  await promoteDueScheduledPages();

  const page = await prisma.cmsPage.findFirst({
    where: { status: "PUBLISHED", deletedAt: null, publishedVersion: { slug } },
    include: { publishedVersion: true },
  });
  if (page?.publishedVersion) {
    const [site, area] = await Promise.all([loadJsonLdSite(), loadJsonLdArea(page.areaId)]);
    const publicPage = toPublicPage(page, page.publishedVersion, false, { ...site, area, publishedAt: page.publishedVersion.createdAt });
    if (publicPage) return apiSuccess(publicPage);
  }

  const redirect = await prisma.cmsRedirect.findUnique({ where: { fromPath: `/${slug}` } });
  if (redirect) return apiSuccess({ redirect: redirect.toPath, permanent: redirect.permanent });
  return apiError("not_found", "Page not found.", 404);
}
