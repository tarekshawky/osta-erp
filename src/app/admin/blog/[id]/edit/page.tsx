import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { BlogPostForm } from "@/components/blog/BlogPostForm";
import { loadLinkTargets } from "@/lib/cms/linkTargets";
import { parseBlocks } from "@/lib/cms/blocks";
import { deleteBlogPost, type BlogPostFormInput } from "@/app/admin/blog/actions";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;

  const post = await prisma.blogPost.findUnique({ where: { id }, include: { secondaryCategories: { select: { id: true } } } });
  if (!post) notFound();

  const initial: BlogPostFormInput = {
    slug: post.slug,
    titleEn: post.titleEn,
    titleAr: post.titleAr,
    excerptEn: post.excerptEn,
    excerptAr: post.excerptAr,
    contentEn: post.contentEn,
    contentAr: post.contentAr,
    coverImageUrl: post.coverImageUrl ?? "",
    seoTitleEn: post.seoTitleEn ?? "",
    seoTitleAr: post.seoTitleAr ?? "",
    seoDescriptionEn: post.seoDescriptionEn ?? "",
    seoDescriptionAr: post.seoDescriptionAr ?? "",
    seoKeywordsEn: post.seoKeywordsEn ?? "",
    seoKeywordsAr: post.seoKeywordsAr ?? "",
    authorName: post.authorName ?? "",
    blocks: (() => { const p = parseBlocks(post.blocks); return p.ok ? p.blocks : []; })(),
    categoryId: post.categoryId ?? "",
    secondaryCategoryIds: post.secondaryCategories.map((c) => c.id),
    featured: post.featured,
    published: post.published,
  };
  // Active categories, plus the ones this article already uses even if they are switched off.
  const used = [post.categoryId, ...post.secondaryCategories.map((c) => c.id)].filter((x): x is string => !!x);
  const categories = await prisma.blogCategory.findMany({ where: { OR: [{ active: true }, { id: { in: used } }] }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, nameAr: true, active: true } });

  return (
    <div className="pb-10">
      <AdminTopBar title="Blog" />
      <div className="px-6 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Edit Blog Post</h2>
          <form action={deleteBlogPost.bind(null, id)}>
            <button type="submit" className="text-sm font-medium text-red-600">
              Delete
            </button>
          </form>
        </div>
        <BlogPostForm mode="edit" editId={id} initial={initial} linkTargets={await loadLinkTargets()} categories={categories} />
      </div>
    </div>
  );
}
