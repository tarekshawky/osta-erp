import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, corsPreflight } from "@/lib/apiResponse";
import { verifyPreviewToken } from "@/lib/cms/pageRules";
import { hasSubPagesBlock, loadSubPages, toPublicPage } from "@/lib/cms/publicPage";

export function OPTIONS() {
  return corsPreflight();
}

// The unpublished draft, only with a valid short-lived token minted by the admin for this page.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!verifyPreviewToken(id, token)) return apiError("forbidden", "Preview link is invalid or has expired.", 403);

  const page = await prisma.cmsPage.findFirst({ where: { id, deletedAt: null } });
  if (!page) return apiError("not_found", "Page not found.", 404);
  const publicPage = toPublicPage(page, { slug: page.slug, titleEn: page.titleEn, titleAr: page.titleAr, blocks: page.draftBlocks, seo: page.draftSeo });
  if (!publicPage) return apiError("invalid_content", "This draft has invalid blocks.", 422);
  return apiSuccess(hasSubPagesBlock(publicPage.blocks) ? { ...publicPage, subPages: await loadSubPages(prisma, page.id, false) } : publicPage);
}
