import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { EmptyState, JobStatusBadge, Pager, TypeBadge, jobTitle, day } from "@/components/jobs/ui";
import { JobActions } from "@/components/jobs/JobActions";
import { Suspense } from "react";
import { inputClassName } from "@/components/FormField";
import { EMIRATES, EMIRATE_LABEL, JOB_STATUSES, JOB_STATUS_LABEL, JOB_TYPES, JOB_TYPE_LABEL } from "@/lib/jobs/constants";
import { listJobs, type JobFilters } from "@/lib/jobs/queries";
import { listCategories } from "@/lib/jobs/service";
import { jobPublicUrl } from "@/lib/jobs/urls";

export const dynamic = "force-dynamic";

type SP = { q?: string; type?: string; categoryId?: string; status?: string; emirate?: string; from?: string; to?: string; page?: string };

export default async function JobsListPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filters: JobFilters = { q: sp.q, type: sp.type, categoryId: sp.categoryId, status: sp.status, emirate: sp.emirate, from: sp.from, to: sp.to };
  const [{ rows, total, pages }, categories] = await Promise.all([listJobs(filters, page), listCategories()]);
  const qs = (p: number) => `/admin/jobs/list?${new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page: String(p) } as Record<string, string>)}`;
  return (
    <div className="pb-10">
      <AdminTopBar title="Jobs & Workforce · All Jobs" />
      <div className="flex flex-col gap-5 px-6 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">All jobs <span className="text-base font-normal text-slate-400">({total})</span></h2>
          <Link href="/admin/jobs/new" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">+ Create job</Link>
        </div>

        <form className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4" method="get">
          <input name="q" defaultValue={sp.q} placeholder="Search title, area, # or link…" className={inputClassName} aria-label="Search" />
          <select name="type" defaultValue={sp.type ?? ""} className={inputClassName} aria-label="Type"><option value="">All types</option>{JOB_TYPES.map((t) => <option key={t} value={t}>{JOB_TYPE_LABEL[t].en}</option>)}</select>
          <select name="categoryId" defaultValue={sp.categoryId ?? ""} className={inputClassName} aria-label="Category"><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}</select>
          <select name="status" defaultValue={sp.status ?? ""} className={inputClassName} aria-label="Status"><option value="">All statuses</option>{JOB_STATUSES.map((s) => <option key={s} value={s}>{JOB_STATUS_LABEL[s]}</option>)}</select>
          <select name="emirate" defaultValue={sp.emirate ?? ""} className={inputClassName} aria-label="Emirate"><option value="">All emirates</option>{EMIRATES.map((e) => <option key={e} value={e}>{EMIRATE_LABEL[e].en}</option>)}</select>
          <label className="flex items-center gap-2 text-xs text-slate-500">From <input type="date" name="from" defaultValue={sp.from} className={inputClassName} /></label>
          <label className="flex items-center gap-2 text-xs text-slate-500">To <input type="date" name="to" defaultValue={sp.to} className={inputClassName} /></label>
          <div className="flex gap-2"><button className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white">Filter</button><Link href="/admin/jobs/list" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600">Reset</Link></div>
        </form>

        {rows.length === 0 ? (
          <EmptyState title="No jobs match" hint="Try different filters, or create your first job." action={<Link href="/admin/jobs/new" className="text-sm font-medium text-blue-600">+ Create job</Link>} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Job</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Workers</th><th className="px-4 py-3">Applications</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((j) => (
                  <tr key={j.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{j.number}</td>
                    <td className="px-4 py-3"><Link href={`/admin/jobs/${j.id}`} className="font-medium text-blue-700">{jobTitle(j)}</Link><div className="text-xs text-slate-400">{j.category.nameEn}{j.slug ? ` · /jobs/${j.slug}` : ""}</div></td>
                    <td className="px-4 py-3"><TypeBadge type={j.type} /></td>
                    <td className="px-4 py-3 text-slate-600">{EMIRATE_LABEL[j.emirate].en}{j.area ? ` – ${j.area}` : ""}</td>
                    <td className="px-4 py-3 text-slate-600">{j.workersRequired}</td>
                    <td className="px-4 py-3"><Link href={`/admin/jobs/applications?jobId=${j.id}`} className="text-blue-600">{j._count.applications}</Link></td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{j.applicationDeadline ? day(j.applicationDeadline) : "—"}</td>
                    <td className="px-4 py-3"><JobStatusBadge status={j.status} /></td>
                    <td className="px-4 py-3"><Suspense fallback={null}><JobActions compact job={{ id: j.id, status: j.status, slug: j.slug }} publicUrl={j.slug ? jobPublicUrl(j.slug) : null} /></Suspense></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} pages={pages} href={qs} />
      </div>
    </div>
  );
}
