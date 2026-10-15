import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { inCategory } from "@/lib/blog/publicBlog";
import { MIN_ARTICLES_FOR_INDEX } from "@/lib/blog/categoryRules";

export function OPTIONS() {
  return corsPreflight();
}

// One active category. A category with no published article answers 404 so empty pages never exist for visitors or crawlers.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await prisma.blogCategory.findFirst({ where: { slug, active: true } });
  if (!c) return apiError("not_found", "Category not found.", 404);
  const count = await prisma.blogPost.count({ where: { published: true, ...inCategory(c.id) } });
  if (count === 0) return apiError("not_found", "Category not found.", 404);
  return apiSuccess({
    slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr,
    seoTitleEn: c.seoTitleEn, seoTitleAr: c.seoTitleAr, seoDescriptionEn: c.seoDescriptionEn, seoDescriptionAr: c.seoDescriptionAr,
    coverImageUrl: c.coverImageUrl, count, indexable: count >= MIN_ARTICLES_FOR_INDEX,
  });
}
