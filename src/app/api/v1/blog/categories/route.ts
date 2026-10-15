import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { activeCategoriesWithCounts } from "@/lib/blog/publicBlog";
import { MIN_ARTICLES_FOR_INDEX } from "@/lib/blog/categoryRules";

export function OPTIONS() {
  return corsPreflight();
}

// Active categories that have at least one published article, in the order set in the admin.
export async function GET() {
  const list = await activeCategoriesWithCounts();
  return apiSuccess(
    list.map(({ c, count }) => ({
      slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr,
      seoTitleEn: c.seoTitleEn, seoTitleAr: c.seoTitleAr, seoDescriptionEn: c.seoDescriptionEn, seoDescriptionAr: c.seoDescriptionAr,
      coverImageUrl: c.coverImageUrl, count, indexable: count >= MIN_ARTICLES_FOR_INDEX,
    }))
  );
}
