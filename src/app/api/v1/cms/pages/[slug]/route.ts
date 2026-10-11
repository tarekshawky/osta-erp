import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, corsPreflight } from "@/lib/apiResponse";
import { promoteDueScheduledPages } from "@/lib/cms/publish";
import { toPublicPage } from "@/lib/cms/publicPage";
import { siteOrigin } from "@/lib/seo/context";

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
    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" }, select: { siteNameEn: true, phone: true } });
    const publicPage = toPublicPage(page, page.publishedVersion, false, {
      origin: siteOrigin(), name: settings?.siteNameEn ?? "OSTA Services", phone: settings?.phone || undefined, publishedAt: page.publishedVersion.createdAt,
    });
    if (publicPage) return apiSuccess(publicPage);
  }

  const redirect = await prisma.cmsRedirect.findUnique({ where: { fromPath: `/${slug}` } });
  if (redirect) return apiSuccess({ redirect: redirect.toPath, permanent: redirect.permanent });
  return apiError("not_found", "Page not found.", 404);
}
