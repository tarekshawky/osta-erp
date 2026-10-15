import { prisma } from "@/lib/prisma";
import { publicCoverUrl } from "@/lib/blogCover";

// What the public site receives for blog articles and categories. Only published articles and active categories are
// ever visible, and a category is only listed when it holds at least one published article.

// `active` is only used to hide a switched-off category from article data; it is never sent to the public site.
export const categoryBrief = { select: { slug: true, nameEn: true, nameAr: true, active: true } } as const;

export const summarySelect = {
  slug: true,
  titleEn: true,
  titleAr: true,
  excerptEn: true,
  excerptAr: true,
  coverImageUrl: true,
  authorName: true,
  publishedAt: true,
  featured: true,
  category: categoryBrief,
} as const;

type Brief = { slug: string; nameEn: string; nameAr: string; active: boolean };
type Summary = { slug: string; coverImageUrl: string | null; publishedAt: Date | null; featured: boolean; category: Brief | null };

// A category label that is switched off in the admin is not shown (its page does not exist); the article itself stays.
export function publicCategory(c: Brief | null): { slug: string; nameEn: string; nameAr: string } | null {
  return c && c.active ? { slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr } : null;
}

export function shapeSummary<T extends Summary>(p: T, origin: string): Omit<T, "coverImageUrl" | "category"> & { coverImageUrl: string | null; category: ReturnType<typeof publicCategory> } {
  return { ...p, coverImageUrl: publicCoverUrl(origin, p.slug, p.coverImageUrl), category: publicCategory(p.category) };
}

// Published articles belonging to a category, as main or secondary category.
export const inCategory = (categoryId: string) => ({ OR: [{ categoryId }, { secondaryCategories: { some: { id: categoryId } } }] });

export async function activeCategoriesWithCounts() {
  const cats = await prisma.blogCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  const counted = await Promise.all(
    cats.map(async (c) => ({ c, count: await prisma.blogPost.count({ where: { published: true, ...inCategory(c.id) } }) }))
  );
  return counted.filter((x) => x.count > 0);
}
