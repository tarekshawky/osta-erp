import { parseBlocks, type Block } from "./blocks";

export type PublicPage = {
  id: string;
  slug: string;
  type: string;
  titleEn: string;
  titleAr: string;
  blocks: Block[];
  seo: Record<string, unknown>;
  updatedAt: string;
};

// Shapes a stored snapshot for the public site: re-validates the blocks and drops hidden ones,
// so a hand-edited or stale row can never reach visitors as malformed or hidden content.
export function toPublicPage(
  page: { id: string; type: string; updatedAt: Date },
  snapshot: { slug: string; titleEn: string; titleAr: string; blocks: unknown; seo: unknown },
  includeHidden = false
): PublicPage | null {
  const parsed = parseBlocks(snapshot.blocks);
  if (!parsed.ok) return null;
  return {
    id: page.id,
    slug: snapshot.slug,
    type: page.type,
    titleEn: snapshot.titleEn,
    titleAr: snapshot.titleAr,
    blocks: includeHidden ? parsed.blocks : parsed.blocks.filter((b) => !b.hidden),
    seo: (snapshot.seo && typeof snapshot.seo === "object" ? snapshot.seo : {}) as Record<string, unknown>,
    updatedAt: page.updatedAt.toISOString(),
  };
}
