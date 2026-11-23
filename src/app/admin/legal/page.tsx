import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { arabicProgress, sectionFieldKeys, readSections, KIND_LABEL, type DocKind } from "@/lib/legal/content";
import { LoadStarterButton } from "./LegalClient";

const STATUS_STYLE: Record<string, string> = { DRAFT: "bg-slate-100 text-slate-700", PUBLISHED: "bg-emerald-100 text-emerald-700", ARCHIVED: "bg-amber-100 text-amber-800" };

export default async function LegalCenterPage() {
  await requireEmployee("ADMIN");
  const [categories, documents, fields] = await Promise.all([
    prisma.legalCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.legalDocument.findMany({ orderBy: [{ number: "asc" }] }),
    prisma.legalField.findMany(),
  ]);
  const fieldByKey = new Map(fields.map((f) => [f.key, f]));
  const open = fields.filter((f) => !f.confirmed || !f.valueEn.trim() || !f.valueAr.trim());
  const count = (s: string) => documents.filter((d) => d.status === s).length;

  const rows = documents.map((d) => {
    const sections = readSections(d.draftSections);
    const needs = sectionFieldKeys({ draftIntroEn: d.draftIntroEn, draftIntroAr: d.draftIntroAr, sections }).filter((k) => { const f = fieldByKey.get(k); return !f || !f.confirmed || !f.valueEn.trim() || !f.valueAr.trim(); });
    return { d, clauses: sections.filter((s) => s.level !== 1).length, arabic: arabicProgress({ draftIntroEn: d.draftIntroEn, draftIntroAr: d.draftIntroAr, titleAr: d.titleAr, sections }), needs };
  });

  return (
    <div className="pb-10">
      <AdminTopBar title="Legal Center" />
      <div className="space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Legal Center</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">Policies and legal documents in English and Arabic. Every document starts as a draft and nothing is shown to customers until it is reviewed and published.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link href="/admin/legal/new" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">+ New document</Link><Link href="/admin/legal/fields" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800">Decisions to confirm ({open.length})</Link></div>
        </div>

        {documents.length < 30 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="mb-3 text-sm text-slate-700">{documents.length === 0 ? "No documents yet." : `${documents.length} of the 30 starter documents are loaded.`} Load the 30 starter documents with their drafts in English and Arabic. Anything already here is left untouched.</p>
            <LoadStarterButton label="Load the 30 starter documents" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[["Documents", documents.length], ["Drafts", count("DRAFT")], ["Published", count("PUBLISHED")], ["Archived", count("ARCHIVED")], ["Decisions to confirm", open.length]].map(([l, n]) => (
            <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">{l}</p><p className="mt-1 text-2xl font-bold text-slate-900">{n}</p></div>
          ))}
        </div>

        {categories.map((c) => {
          const list = rows.filter((r) => r.d.categoryId === c.id);
          return (
            <section key={c.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <h3 className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">
                <span>Category {c.key} · {c.nameEn}</span><span dir="rtl" className="font-semibold text-slate-600">{c.nameAr}</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs font-medium uppercase text-slate-500"><tr><th className="px-4 py-2">No.</th><th className="px-4 py-2">Document</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Clauses</th><th className="px-4 py-2">Arabic</th><th className="px-4 py-2">Open decisions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map(({ d, clauses, arabic, needs }) => (
                      <tr key={d.id}>
                        <td className="px-4 py-3 text-slate-500">{d.number}</td>
                        <td className="px-4 py-3"><Link href={`/admin/legal/${d.id}`} className="font-medium text-blue-600">{d.titleEn}</Link><div dir="rtl" className="text-xs text-slate-500">{d.titleAr}</div><div className="text-xs text-slate-400">/policies/{d.slug}</div></td>
                        <td className="px-4 py-3 text-xs text-slate-600">{KIND_LABEL[d.kind as DocKind]?.split(" (")[0] ?? d.kind}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[d.status] ?? ""}`}>{d.status[0] + d.status.slice(1).toLowerCase()}</span></td>
                        <td className="px-4 py-3 text-slate-600">{clauses}</td>
                        <td className="px-4 py-3 text-slate-600">{arabic}%</td>
                        <td className="px-4 py-3">{needs.length ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{needs.length}</span> : <span className="text-xs text-emerald-700">None</span>}</td>
                      </tr>
                    ))}
                    {list.length === 0 && <tr><td colSpan={7} className="px-4 py-4 text-sm text-slate-500">No documents in this category yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
