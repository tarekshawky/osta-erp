import { parseBlocks, type Block } from "./blocks";
import { buildJsonLd, jsonLdProblems, type JsonLdArea, type JsonLdSite } from "@/lib/seo/jsonld";

export type PublicPage = {
  id: string;
  slug: string;
  type: string;
  titleEn: string;
  titleAr: string;
  blocks: Block[];
  seo: Record<string, unknown>;
  jsonLd: Record<string, unknown>[];
  showLastUpdated: boolean;
  updatedAt: string;
  // For a "Sub-pages list" block: the pages directly under this one in the page tree (published only on the live site).
  subPages?: { slug: string; titleEn: string; titleAr: string }[];
  // Custom code for this page (public pages only, never in previews). Absent when the page has none.
  code?: { headCode: string; headCodeConsent: string; bodyCode: string; bodyCodeConsent: string };
};

// Shapes a stored snapshot for the public site: re-validates the blocks and drops hidden ones,
// so a hand-edited or stale row can never reach visitors as malformed or hidden content.
export function toPublicPage(
  page: { id: string; type: string; updatedAt: Date; showLastUpdated?: boolean; headCode?: string; headCodeConsent?: string; bodyCode?: string; bodyCodeConsent?: string },
  snapshot: { slug: string; titleEn: string; titleAr: string; blocks: unknown; seo: unknown },
  includeHidden = false,
  site?: JsonLdSite & { publishedAt?: Date; area?: JsonLdArea | null }
): PublicPage | null {
  const parsed = parseBlocks(snapshot.blocks);
  if (!parsed.ok) return null;
  const seo = (snapshot.seo && typeof snapshot.seo === "object" ? snapshot.seo : {}) as Record<string, unknown>;
  // Only ever serve structured data that validates; a half-filled schema would be worse than none.
  let jsonLd: Record<string, unknown>[] = [];
  if (site) {
    const built = buildJsonLd(
      {
        slug: snapshot.slug, type: page.type, titleEn: snapshot.titleEn, blocks: parsed.blocks, area: site.area,
        seo: { descriptionEn: seo.descriptionEn as string | undefined, ogImage: seo.ogImage as string | undefined },
        publishedAt: site.publishedAt?.toISOString(), updatedAt: page.updatedAt.toISOString(),
      },
      site
    );
    jsonLd = jsonLdProblems(built).length === 0 ? built : built.filter((x) => x["@type"] === "WebPage" || x["@type"] === "BreadcrumbList");
  }
  return {
    id: page.id,
    slug: snapshot.slug,
    type: page.type,
    titleEn: snapshot.titleEn,
    titleAr: snapshot.titleAr,
    blocks: includeHidden ? parsed.blocks : parsed.blocks.filter((b) => !b.hidden),
    seo,
    jsonLd,
    showLastUpdated: !!page.showLastUpdated,
    updatedAt: page.updatedAt.toISOString(),
    ...(!includeHidden && (page.headCode || page.bodyCode)
      ? { code: { headCode: page.headCode ?? "", headCodeConsent: page.headCodeConsent ?? "analytics", bodyCode: page.bodyCode ?? "", bodyCodeConsent: page.bodyCodeConsent ?? "analytics" } }
      : {}),
  };
}

// The pages directly under `pageId` in the page tree, in tree order, for a "Sub-pages list" block. `live` = published pages only
// (what visitors see); previews pass false to show drafts too.
export async function loadSubPages(db: { cmsPage: { findMany: (args: never) => Promise<unknown> } }, pageId: string, live: boolean) {
  const rows = (await db.cmsPage.findMany({
    where: { parentId: pageId, deletedAt: null, ...(live ? { status: "PUBLISHED", publishedVersion: { isNot: null } } : {}) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { slug: true, titleEn: true, titleAr: true, publishedVersion: { select: { slug: true, titleEn: true, titleAr: true } } },
  } as never)) as { slug: string; titleEn: string; titleAr: string; publishedVersion: { slug: string; titleEn: string; titleAr: string } | null }[];
  return rows.map((r) => (live && r.publishedVersion ? r.publishedVersion : { slug: r.slug, titleEn: r.titleEn, titleAr: r.titleAr })).map((r) => ({ slug: r.slug, titleEn: r.titleEn, titleAr: r.titleAr }));
}

export const hasSubPagesBlock = (blocks: { type: string; hidden?: boolean }[]) => blocks.some((b) => b.type === "subPages" && !b.hidden);
