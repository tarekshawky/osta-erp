import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { NewPageForm } from "@/components/cms/NewPageForm";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-amber-50 text-amber-700",
  ARCHIVED: "bg-slate-100 text-slate-400",
};

export default async function CmsPagesPage() {
  await requireEmployee("ADMIN");
  const pages = await prisma.cmsPage.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { publishedVersion: { select: { slug: true } } },
  });

  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Pages" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Pages</h2>
            <p className="mt-1 text-sm text-slate-500">Build pages from blocks. Nothing goes live until you publish.</p>
          </div>
          <Link href="/admin/website" className="text-sm font-medium text-blue-600">
            ← Website
          </Link>
        </div>

        <NewPageForm />

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No pages yet. Create your first one.
                  </td>
                </tr>
              )}
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.titleEn}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">/{p.publishedVersion?.slug ?? p.slug}</td>
                  <td className="px-4 py-3 text-slate-500">{p.type}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[p.status] ?? ""}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.updatedAt.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/website/pages/${p.id}`} className="text-sm font-medium text-blue-600">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
