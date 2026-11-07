import { parseBlocks, type Block } from "./blocks";
import { buildJsonLd, jsonLdProblems, type JsonLdArea, type JsonLdSite } from "@/lib/seo/jsonld";
import type { PublicBranch } from "@/lib/locations/locations";

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
  // Emirate pages: the real branches of that emirate (shown automatically), the page this one sits under, and the pages under it.
  locations?: PublicBranch[];
  parent?: { slug: string; titleEn: string; titleAr: string } | null;
  // Custom code for this page (public pages only, never in previews). Absent when the page has none.
  code?: { headCode: string; headCodeConsent: string; bodyCode: string; bodyCodeConsent: string };
};

// A block can be shown only inside a date window ("Show from" / "Show until the end of", UAE time). Outside it the block is left
// out of what visitors get (so crawlers never see it either); the admin's own preview shows everything.
export function withinShowWindow(props: unknown, now: number): boolean {
  const style = (props as { style?: { showFrom?: unknown; showUntil?: unknown } } | null)?.style;
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof style?.showFrom === "string" && date.test(style.showFrom) && now < Date.parse(`${style.showFrom}T00:00:00+04:00`)) return false;
  if (typeof style?.showUntil === "string" && date.test(style.showUntil) && now > Date.parse(`${style.showUntil}T23:59:59.999+04:00`)) return false;
  return true;
}

// Shapes a stored snapshot for the public site: re-validates the blocks and drops hidden ones,
// so a hand-edited or stale row can never reach visitors as malformed or hidden content.
export function toPublicPage(
  page: { id: string; type: string; updatedAt: Date; showLastUpdated?: boolean; headCode?: string; headCodeConsent?: string; bodyCode?: string; bodyCodeConsent?: string },
  snapshot: { slug: string; titleEn: string; titleAr: string; blocks: unknown; seo: unknown },
  includeHidden = false,
  site?: JsonLdSite & { publishedAt?: Date; area?: JsonLdArea | null; parent?: { slug: string; titleEn: string } | null },
  now: number = Date.now()
): PublicPage | null {
  const parsed = parseBlocks(snapshot.blocks);
  if (!parsed.ok) return null;
  const seo = (snapshot.seo && typeof snapshot.seo === "object" ? snapshot.seo : {}) as Record<string, unknown>;
  // What visitors get: structured data (FAQ and so on) must describe only blocks that are actually shown.
  const visible = includeHidden ? parsed.blocks : parsed.blocks.filter((b) => !b.hidden && withinShowWindow(b.props, now));
  // Only ever serve structured data that validates; a half-filled schema would be worse than none.
  let jsonLd: Record<string, unknown>[] = [];
  if (site) {
    const built = buildJsonLd(
      {
        slug: snapshot.slug, type: page.type, titleEn: snapshot.titleEn, blocks: visible, area: site.area, parent: site.parent,
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
    blocks: visible,
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
