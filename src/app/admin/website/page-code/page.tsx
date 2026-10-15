import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardPermission } from "@/lib/adminGuard";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { CodeForm } from "@/components/cms/CodeForm";
import { savePageCode } from "@/app/admin/website/code-actions";

export default async function PageCodePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const guard = await guardPermission("integrations.manage");
  if (!guard.ok) return <div className="pb-10"><AdminTopBar title="Website · Page-Level Code" /><p className="px-6 py-6 text-sm text-slate-500">{guard.error}</p></div>;
  const { page: pageId } = await searchParams;
  const pages = await prisma.cmsPage.findMany({ where: { deletedAt: null }, orderBy: [{ isHomepage: "desc" }, { slug: "asc" }], select: { id: true, slug: true, titleEn: true, status: true, isHomepage: true, headCode: true, bodyCode: true } });
  const selected = pages.find((p) => p.id === pageId) ?? null;
  const full = selected ? await prisma.cmsPage.findUnique({ where: { id: selected.id }, select: { headCode: true, headCodeConsent: true, bodyCode: true, bodyCodeConsent: true } }) : null;

  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Page-Level Code" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Page-level header &amp; footer code</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Code for one page only, such as a conversion script for a landing page. It runs while that page is published, on top of the global code. Pages built in Website → Pages are listed; to add code to a built-in page (About, Contact…), make it editable there first.</p>

        <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr><th className="px-4 py-3">Page</th><th className="px-4 py-3">Address</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Code</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pages.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No pages yet.</td></tr>}
              {pages.map((p) => (
                <tr key={p.id} className={p.id === selected?.id ? "bg-blue-50" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.titleEn}</td>
                  <td className="px-4 py-3 text-slate-500" dir="ltr">{p.isHomepage ? "/ (homepage)" : `/${p.slug}`}</td>
                  <td className="px-4 py-3 text-slate-500">{p.status === "PUBLISHED" ? "Published" : "Draft"}</td>
                  <td className="px-4 py-3">{p.headCode || p.bodyCode ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{[p.headCode && "header", p.bodyCode && "footer"].filter(Boolean).join(" + ")}</span> : <span className="text-xs text-slate-400">none</span>}</td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/website/page-code?page=${p.id}`} className="text-sm font-medium text-blue-600">{p.id === selected?.id ? "Editing" : "Edit code"}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && full && (
          <div key={selected.id}>
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Code for “{selected.titleEn}”</h3>
            <CodeForm
              initial={{ headCode: full.headCode, headCodeConsent: full.headCodeConsent, bodyCode: full.bodyCode, bodyCodeConsent: full.bodyCodeConsent }}
              onSave={savePageCode.bind(null, selected.id)}
              saveLabel="Save page code"
            />
          </div>
        )}
      </div>
    </div>
  );
}
