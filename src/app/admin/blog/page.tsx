import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { formatDateSlash } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ToastOnMount } from "@/components/ToastOnMount";

export default async function AdminBlogPage() {
  await requireEmployee("ADMIN");

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      titleEn: true,
      titleAr: true,
      published: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="pb-10">
      <AdminTopBar title="Blog" />
      <ToastOnMount message="Blog post deleted." />

      <div className="px-6 py-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Blog Posts</h2>
          <Link
            href="/admin/blog/new"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            + New Post
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No blog posts yet.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{post.titleEn}</td>
                    <td className="px-4 py-3 text-slate-500">/{post.slug}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          post.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateSlash(post.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/blog/${post.id}/edit`} className="text-sm font-medium text-blue-600">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
