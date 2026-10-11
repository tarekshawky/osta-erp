import { prisma } from "@/lib/prisma";
import { parseBlocks } from "./blocks";
import { publishProblems } from "./pageRules";
import { analyzePage } from "@/lib/seo/analyze";
import { buildJsonLd, jsonLdProblems } from "@/lib/seo/jsonld";
import { loadJsonLdArea, loadJsonLdSite, loadSeoContext } from "@/lib/seo/context";

type PageRow = {
  id: string; slug: string; type: string; titleEn: string; titleAr: string; areaId: string | null; showInSitemap: boolean;
  draftBlocks: unknown; draftSeo: unknown;
};

// Everything that must be true before a page goes live: basic rules, valid structured data, and (for area pages)
// content that is genuinely different from other area pages. Empty list = OK to publish.
export async function computePublishProblems(page: PageRow): Promise<string[]> {
  const problems = publishProblems({ slug: page.slug, titleEn: page.titleEn, titleAr: page.titleAr, blocks: page.draftBlocks });

  const parsed = parseBlocks(page.draftBlocks);
  if (!parsed.ok) return problems;
  for (const b of parsed.blocks.filter((x) => x.type === "form" && !x.hidden)) {
    const slug = String(b.props.formSlug ?? "");
    if (!slug) problems.push("A Form block has no form selected.");
    else if (!(await prisma.cmsForm.findFirst({ where: { slug, active: true }, select: { id: true } }))) problems.push(`The form “${slug}” doesn't exist or is inactive, so visitors couldn't submit it.`);
  }
  const seo = (page.draftSeo ?? {}) as Record<string, string>;
  const [site, area] = await Promise.all([loadJsonLdSite(), loadJsonLdArea(page.areaId)]);

  if (page.type === "area" && !area) problems.push("Link this area page to a service area (Website → Service Areas) before publishing.");
  problems.push(
    ...jsonLdProblems(
      buildJsonLd({ slug: page.slug, type: page.type, titleEn: page.titleEn, blocks: parsed.blocks, area, seo: { descriptionEn: seo.descriptionEn, ogImage: seo.ogImage } }, site)
    )
  );

  if (page.type === "area" && area && page.areaId) {
    const names = await prisma.serviceArea.findUnique({ where: { id: page.areaId }, select: { nameEn: true, nameAr: true } });
    const result = analyzePage(
      {
        slug: page.slug, type: page.type, titleEn: page.titleEn, titleAr: page.titleAr, showInSitemap: page.showInSitemap, blocks: parsed.blocks,
        seo: { titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", canonical: "", noindex: false, ogImage: "", ...seo },
        areaNames: names ? { en: names.nameEn, ar: names.nameAr } : undefined,
      },
      await loadSeoContext(page.id)
    );
    const dup = result.issues.find((i) => i.id === "area-duplicate");
    if (dup) problems.push(dup.message);
  }
  return problems;
}
