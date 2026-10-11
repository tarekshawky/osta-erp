import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { promoteDueScheduledPages } from "@/lib/cms/publish";

export function OPTIONS() {
  return corsPreflight();
}

// Lightweight list of live pages, for the sitemap and menus.
export async function GET() {
  await promoteDueScheduledPages();
  const pages = await prisma.cmsPage.findMany({
    where: { status: "PUBLISHED", deletedAt: null, isHomepage: false, publishedVersion: { isNot: null } },
    include: { publishedVersion: { select: { slug: true, titleEn: true, titleAr: true, seo: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return apiSuccess(
    pages.map((p) => ({
      slug: p.publishedVersion!.slug,
      type: p.type,
      titleEn: p.publishedVersion!.titleEn,
      titleAr: p.publishedVersion!.titleAr,
      showInMenus: p.showInMenus,
      showInSitemap: p.showInSitemap,
      noindex: !!(p.publishedVersion!.seo as { noindex?: boolean } | null)?.noindex,
      updatedAt: p.updatedAt.toISOString(),
    }))
  );
}
