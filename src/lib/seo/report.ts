import { prisma } from "@/lib/prisma";
import { parseBlocks } from "@/lib/cms/blocks";
import { analyzePage, type SeoFields, type SeoIssue } from "./analyze";
import { loadSeoContext } from "./context";

export type PageSeoRow = { id: string; titleEn: string; slug: string; status: string; score: number; issues: SeoIssue[] };

const emptySeo: SeoFields = { titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", canonical: "", noindex: false, ogImage: "" };

// SEO score of every (non-deleted) page's current draft, using one shared scan of the rest of the site.
export async function seoReport(): Promise<PageSeoRow[]> {
  const [pages, ctx] = await Promise.all([
    prisma.cmsPage.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" } }),
    loadSeoContext(),
  ]);
  return pages.map((p) => {
    const parsed = parseBlocks(p.draftBlocks);
    // Duplicates are checked against everyone else, so remove this page from "others" by its own title+seo match.
    const seo = { ...emptySeo, ...((p.draftSeo as Partial<SeoFields>) ?? {}) };
    const others = ctx.others.filter((o) => !(o.label === p.titleEn && o.titleEn === seo.titleEn && o.descriptionEn === seo.descriptionEn));
    const result = analyzePage(
      { slug: p.slug, type: p.type, titleEn: p.titleEn, titleAr: p.titleAr, showInSitemap: p.showInSitemap, blocks: parsed.ok ? parsed.blocks : [], seo },
      { ...ctx, others }
    );
    return { id: p.id, titleEn: p.titleEn, slug: p.slug, status: p.status, score: result.score, issues: result.issues };
  });
}
