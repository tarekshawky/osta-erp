import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { BlogPostForm } from "@/components/blog/BlogPostForm";
import { loadLinkTargets } from "@/lib/cms/linkTargets";
import { prisma } from "@/lib/prisma";

export default async function NewBlogPostPage() {
  await requireEmployee("ADMIN");

  return (
    <div className="pb-10">
      <AdminTopBar title="Blog" />
      <div className="px-6 py-6">
        <h2 className="mb-5 text-2xl font-bold text-slate-900">New Blog Post</h2>
        <BlogPostForm mode="create" linkTargets={await loadLinkTargets()} categories={await prisma.blogCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, nameAr: true, active: true } })} />
      </div>
    </div>
  );
}
