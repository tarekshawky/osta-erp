import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { promoteDueScheduledPages } from "@/lib/cms/publish";
import { hasSubPagesBlock, loadSubPages, toPublicPage } from "@/lib/cms/publicPage";
import { loadJsonLdArea, loadJsonLdSite } from "@/lib/seo/context";
import { loadAreaPageContext } from "@/lib/locations/data";
import { resolveGlobalBlocks } from "@/lib/cms/globalBlocks";

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
    const [site, ctx] = await Promise.all([loadJsonLdSite(), loadAreaPageContext(page)]);
    const area = await loadJsonLdArea(page.areaId, ctx.branches.ld);
    const publicPage = toPublicPage(page, { ...page.publishedVersion, blocks: await resolveGlobalBlocks(page.publishedVersion.blocks, prisma) }, false, { ...site, area, parent: ctx.parent, publishedAt: page.publishedVersion.createdAt });
    if (publicPage) {
      // An emirate page shows its real branch(es) automatically, and links to the pages under it.
      const subPages = hasSubPagesBlock(publicPage.blocks) ? await loadSubPages(prisma, page.id, true) : page.type === "area" && ctx.children.length ? ctx.children : undefined;
      return apiSuccess({ ...publicPage, ...(subPages ? { subPages } : {}), ...(ctx.branches.pub.length ? { locations: ctx.branches.pub } : {}), ...(ctx.parent ? { parent: ctx.parent } : {}) });
    }
  }

  const redirect = await prisma.cmsRedirect.findUnique({ where: { fromPath: `/${slug}` } });
  if (redirect) return apiSuccess({ redirect: redirect.toPath, permanent: redirect.permanent });
  // 200 + flag, not a 404: the public site caches this response, and Next.js would keep serving an unpublished page
  // forever if the refresh came back as an error.
  return apiSuccess({ notFound: true });
}
