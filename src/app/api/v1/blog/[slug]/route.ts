import { prisma } from "@/lib/prisma";
import { cleanRichValue } from "@/lib/cms/richText";
import { apiSuccess, apiError, corsPreflight } from "@/lib/apiResponse";
import { publicCoverUrl } from "@/lib/blogCover";
import { publicBlocks } from "@/lib/cms/publicBlocks";
import { categoryBrief, publicCategory, shapeSummary, summarySelect } from "@/lib/blog/publicBlog";

export function OPTIONS() {
  return corsPreflight();
}

const blogDetailSelect = {
  slug: true,
  titleEn: true,
  titleAr: true,
  excerptEn: true,
  excerptAr: true,
  contentEn: true,
  contentAr: true,
  coverImageUrl: true,
  seoTitleEn: true,
  seoTitleAr: true,
  seoDescriptionEn: true,
  seoDescriptionAr: true,
  seoKeywordsEn: true,
  seoKeywordsAr: true,
  authorName: true,
  publishedAt: true,
  blocks: true,
  featured: true,
  category: categoryBrief,
  secondaryCategories: { where: { active: true }, orderBy: { sortOrder: "asc" as const }, ...categoryBrief },
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({ where: { slug, published: true }, select: blogDetailSelect });
  if (!post) return apiError("not_found", "Blog post not found.", 404);
  const origin = new URL(request.url).origin;

  // Related articles: the same main category first, then shared secondary categories, then the newest others.
  const catIds = await prisma.blogPost.findFirst({ where: { slug }, select: { categoryId: true, secondaryCategories: { select: { id: true } } } });
  const ids = [catIds?.categoryId, ...(catIds?.secondaryCategories.map((c) => c.id) ?? [])].filter((x): x is string => !!x);
  const base = { published: true, NOT: { slug } };
  const related: Awaited<ReturnType<typeof fetchRelated>> = [];
  const take = (rows: typeof related) => { for (const r of rows) if (related.length < 3 && !related.some((x) => x.slug === r.slug)) related.push(r); };
  if (ids.length) take(await fetchRelated({ ...base, OR: [{ categoryId: { in: ids } }, { secondaryCategories: { some: { id: { in: ids } } } }] }));
  if (related.length < 3) take(await fetchRelated(base));

  return apiSuccess({
    ...post,
    contentEn: cleanRichValue(post.contentEn),
    contentAr: cleanRichValue(post.contentAr),
    blocks: publicBlocks(post.blocks),
    category: publicCategory(post.category),
    secondaryCategories: post.secondaryCategories.map((c) => publicCategory(c)).filter((c) => c !== null),
    coverImageUrl: publicCoverUrl(origin, post.slug, post.coverImageUrl),
    related: related.map((r) => shapeSummary(r, origin)),
  });
}

function fetchRelated(where: object) {
  return prisma.blogPost.findMany({ where, select: summarySelect, orderBy: { publishedAt: "desc" }, take: 3 });
}
