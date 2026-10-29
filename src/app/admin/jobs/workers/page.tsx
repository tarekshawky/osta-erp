import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { inputClassName } from "@/components/FormField";
import { EmptyState, Pager, day } from "@/components/jobs/ui";
import { EMIRATES, EMIRATE_LABEL, type EmirateKey } from "@/lib/jobs/constants";
import { listWorkers } from "@/lib/jobs/applications";
import { getJobSettings } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export default async function WorkersPage({ searchParams }: { searchParams: Promise<{ q?: string; skill?: string; emirate?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total, pages }, settings] = await Promise.all([listWorkers(sp, page), getJobSettings()]);
  const label = (k: string) => settings.skills.find((s) => s.key === k)?.labelEn ?? k;
  const clean = Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "page")) as Record<string, string>;
  return (
    <div className="pb-10">
      <AdminTopBar title="Jobs & Workforce · Workers" />
      <div className="flex flex-col gap-5 px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Workers database <span className="text-base font-normal text-slate-400">({total})</span></h2>
        <p className="-mt-3 text-sm text-slate-500">One row per person (found by phone number), with all their applications.</p>
        <form method="get" className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
          <input name="q" defaultValue={sp.q} placeholder="Name or phone (any format)…" className={inputClassName} aria-label="Search" />
          <select name="skill" defaultValue={sp.skill ?? ""} className={inputClassName} aria-label="Skill"><option value="">All skills</option>{settings.skills.map((s) => <option key={s.key} value={s.key}>{s.labelEn}</option>)}</select>
          <select name="emirate" defaultValue={sp.emirate ?? ""} className={inputClassName} aria-label="Emirate"><option value="">All emirates</option>{EMIRATES.map((e) => <option key={e} value={e}>{EMIRATE_LABEL[e].en}</option>)}</select>
          <div className="flex gap-2"><button className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white">Filter</button><Link href="/admin/jobs/workers" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600">Reset</Link></div>
        </form>
        {rows.length === 0 ? (
          <EmptyState title="No workers yet" hint="People who apply to a job appear here automatically." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Skills</th><th className="px-4 py-3">Emirate</th><th className="px-4 py-3">Applications</th><th className="px-4 py-3">Accepted</th><th className="px-4 py-3">Last applied</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((w) => {
                  const last = w.applications.reduce<Date | null>((m, a) => (!m || a.createdAt > m ? a.createdAt : m), null);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3"><Link href={`/admin/jobs/workers/${w.id}`} className="font-medium text-blue-700">{w.fullName}</Link>{w.employeeId && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Employee</span>}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap" dir="ltr">{w.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{w.skills.map(label).join(", ") || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{w.emirate ? EMIRATE_LABEL[w.emirate as EmirateKey].en : "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{w.applications.length}</td>
                      <td className="px-4 py-3 text-slate-600">{w.applications.filter((a) => a.status === "ACCEPTED").length}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{last ? day(last) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} pages={pages} href={(p) => `/admin/jobs/workers?${new URLSearchParams({ ...clean, page: String(p) })}`} />
      </div>
    </div>
  );
}
