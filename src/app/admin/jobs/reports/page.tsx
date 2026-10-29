import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { inputClassName } from "@/components/FormField";
import { JobStatusBadge, jobTitle, day } from "@/components/jobs/ui";
import { periodFrom, reportsData } from "@/lib/jobs/queries";

export const dynamic = "force-dynamic";

export default async function JobsReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { from, to } = periodFrom(sp);
  const d = await reportsData(from, to);
  const isoDay = (x: Date) => x.toISOString().slice(0, 10);
  const th = "px-4 py-3";
  return (
    <div className="pb-10">
      <AdminTopBar title="Jobs & Workforce · Reports" />
      <div className="flex flex-col gap-6 px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">From<input type="date" name="from" defaultValue={isoDay(from)} className={inputClassName} /></label>
            <label className="text-xs text-slate-500">To<input type="date" name="to" defaultValue={isoDay(to)} className={inputClassName} /></label>
            <button className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white">Apply</button>
            <a href={`/api/admin/jobs/reports/export?from=${isoDay(from)}&to=${isoDay(to)}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">Export CSV</a>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Permanent jobs", d.byType.PERMANENT ?? 0], ["Daily jobs", d.byType.DAILY ?? 0], ["Accepted applications", d.accepted], ["Rejected applications", d.rejected]].map(([l, v]) => (
            <div key={String(l)} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">{l}</p><p className="mt-1 text-2xl font-bold text-slate-900">{v}</p></div>
          ))}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Jobs published by month</h3>
          {d.publishedByMonth.length === 0 ? <p className="text-sm text-slate-400">No job was published in this period.</p> : (
            <table className="w-full max-w-md text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Month</th><th>Permanent</th><th>Daily</th></tr></thead><tbody>{d.publishedByMonth.map((m) => <tr key={m.month} className="border-t border-slate-100"><td className="py-2">{m.month}</td><td>{m.permanent}</td><td>{m.daily}</td></tr>)}</tbody></table>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white">
          <h3 className="p-4 text-sm font-semibold text-slate-900">Applicants per job</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className={th}>Job</th><th className={th}>Category</th><th className={th}>Status</th><th className={th}>Applications</th></tr></thead><tbody className="divide-y divide-slate-100">
            {d.perJob.map((j) => <tr key={j.id}><td className={th}><Link href={`/admin/jobs/${j.id}`} className="text-blue-700">#{j.number} {jobTitle(j)}</Link></td><td className={th}>{j.category.nameEn}</td><td className={th}><JobStatusBadge status={j.status} /></td><td className={th}>{j._count.applications}</td></tr>)}
            {d.perJob.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No jobs in this period.</td></tr>}
          </tbody></table></div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Completed jobs</h3>
            <ul className="flex flex-col divide-y divide-slate-100 text-sm">{d.completed.map((j) => <li key={j.id} className="flex justify-between gap-3 py-2"><Link href={`/admin/jobs/${j.id}`} className="text-blue-700">#{j.number} {jobTitle(j)}</Link><span className="text-xs text-slate-400">{j.completedAt ? day(j.completedAt) : ""}</span></li>)}{d.completed.length === 0 && <li className="py-2 text-slate-400">None in this period.</li>}</ul>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Deadline passed without enough accepted workers</h3>
            <ul className="flex flex-col divide-y divide-slate-100 text-sm">{d.underStaffed.map((j) => <li key={j.id} className="flex justify-between gap-3 py-2"><Link href={`/admin/jobs/${j.id}`} className="text-blue-700">#{j.number} {jobTitle(j)}</Link><span className="text-xs text-amber-600">{j.accepted} / {j.workersRequired} accepted</span></li>)}{d.underStaffed.length === 0 && <li className="py-2 text-slate-400">None. Every job with a passed deadline has enough workers.</li>}</ul>
          </section>
        </div>
      </div>
    </div>
  );
}
