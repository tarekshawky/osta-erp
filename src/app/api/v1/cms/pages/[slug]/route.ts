import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
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
    where: { status: "PUBLISHED", deletedAt: null, isHomepage: false, publishedVersion: { slug } },
    include: { publishedVersion: true },
  });
  if (page?.publishedVersion) {
    const [site, area] = await Promise.all([loadJsonLdSite(), loadJsonLdArea(page.areaId)]);
    const publicPage = toPublicPage(page, page.publishedVersion, false, { ...site, area, publishedAt: page.publishedVersion.createdAt });
    if (publicPage) return apiSuccess(publicPage);
  }

  const redirect = await prisma.cmsRedirect.findUnique({ where: { fromPath: `/${slug}` } });
  if (redirect) return apiSuccess({ redirect: redirect.toPath, permanent: redirect.permanent });
  // 200 + flag, not a 404: the public site caches this response, and Next.js would keep serving an unpublished page
  // forever if the refresh came back as an error.
  return apiSuccess({ notFound: true });
}
