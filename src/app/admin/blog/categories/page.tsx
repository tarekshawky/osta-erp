import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { BlogCategoryManager, type CategoryRow } from "@/components/blog/BlogCategoryManager";
import { MIN_ARTICLES_FOR_INDEX } from "@/lib/blog/categoryRules";

export default async function BlogCategoriesPage() {
  await requireEmployee("ADMIN");
  const cats = await prisma.blogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  // Article counts: published articles with this as the main or a secondary category.
  const counts = await Promise.all(
    cats.map(async (c) => {
      const where = { OR: [{ categoryId: c.id }, { secondaryCategories: { some: { id: c.id } } }] };
      const [published, total] = await Promise.all([prisma.blogPost.count({ where: { ...where, published: true } }), prisma.blogPost.count({ where })]);
      return [c.id, { published, total }] as const;
    })
  );
  const byId = new Map(counts);
  const rows: CategoryRow[] = cats.map((c) => ({
    id: c.id, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr,
    seoTitleEn: c.seoTitleEn ?? "", seoTitleAr: c.seoTitleAr ?? "", seoDescriptionEn: c.seoDescriptionEn ?? "", seoDescriptionAr: c.seoDescriptionAr ?? "",
    coverImageUrl: c.coverImageUrl ?? "", active: c.active, published: byId.get(c.id)?.published ?? 0, total: byId.get(c.id)?.total ?? 0,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Blog · Categories" />
      <div className="px-6 py-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Blog categories</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Create, rename, reorder and switch off the sections of your blog. A category appears on the website once it has at least one published article, and is offered to search engines from {MIN_ARTICLES_FOR_INDEX} articles.
            </p>
          </div>
          <Link href="/admin/blog" className="text-sm font-medium text-blue-600">← Blog posts</Link>
        </div>
        <BlogCategoryManager rows={rows} minIndex={MIN_ARTICLES_FOR_INDEX} />
      </div>
    </div>
  );
}
