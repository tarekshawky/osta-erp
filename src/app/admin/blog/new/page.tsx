import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { BlogPostForm } from "@/components/blog/BlogPostForm";

export default async function NewBlogPostPage() {
  await requireEmployee("ADMIN");

  return (
    <div className="pb-10">
      <AdminTopBar title="Blog" />
      <div className="px-6 py-6">
        <h2 className="mb-5 text-2xl font-bold text-slate-900">New Blog Post</h2>
        <BlogPostForm mode="create" />
      </div>
    </div>
  );
}
