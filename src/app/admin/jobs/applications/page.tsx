import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { inputClassName } from "@/components/FormField";
import { ApplicationsTable, type AppRow } from "@/components/jobs/ApplicationsTable";
import { EmptyState, Pager, jobTitle } from "@/components/jobs/ui";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABEL, EMIRATES, EMIRATE_LABEL, JOB_TYPES, JOB_TYPE_LABEL } from "@/lib/jobs/constants";
import { listApplications, type ApplicationFilters } from "@/lib/jobs/applications";
import { getJobSettings, listCategories } from "@/lib/jobs/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SP = { q?: string; jobId?: string; jobType?: string; categoryId?: string; emirate?: string; skill?: string; status?: string; from?: string; to?: string; unread?: string; page?: string };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filters: ApplicationFilters = { q: sp.q, jobId: sp.jobId, jobType: (JOB_TYPES as readonly string[]).includes(sp.jobType ?? "") ? (sp.jobType as "PERMANENT" | "DAILY") : undefined, categoryId: sp.categoryId, emirate: sp.emirate, skill: sp.skill, status: sp.status, from: sp.from, to: sp.to, unread: sp.unread === "1" };
  const [{ rows, total, pages }, settings, categories, jobs] = await Promise.all([
    listApplications(filters, page),
    getJobSettings(),
    listCategories(),
    prisma.job.findMany({ orderBy: { number: "desc" }, take: 300, select: { id: true, number: true, titleEn: true, titleAr: true, category: { select: { nameEn: true } } } }),
  ]);
  const skillLabels = Object.fromEntries(settings.skills.map((s) => [s.key, s.labelEn]));
  const data: AppRow[] = rows.map((a) => ({
    id: a.id, code: a.code ?? "—", isRead: a.isRead, status: a.status, createdAt: a.createdAt.toISOString(), photoIds: a.photos.map((p) => p.id),
    name: a.applicant.fullName, phone: a.applicant.phone, whatsapp: a.applicant.whatsapp, skills: a.applicant.skills, emirate: a.applicant.emirate, area: a.applicant.area,
    jobId: a.job.id, jobNumber: a.job.number, jobTitle: jobTitle(a.job), jobEmirate: a.job.emirate,
  }));
  const clean = Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "page")) as Record<string, string>;
  const href = (p: number) => `/admin/jobs/applications?${new URLSearchParams({ ...clean, page: String(p) })}`;
  return (
    <div className="pb-10">
      <AdminTopBar title="Jobs & Workforce · Applications" />
      <div className="flex flex-col gap-5 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Applications <span className="text-base font-normal text-slate-400">({total})</span></h2>
          <a href={`/api/admin/jobs/applications/export?${new URLSearchParams(clean)}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Export CSV</a>
        </div>
        <form method="get" className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
          <input name="q" defaultValue={sp.q} placeholder="Name, phone (any format) or code…" className={`${inputClassName} lg:col-span-2`} aria-label="Search" />
          <select name="jobId" defaultValue={sp.jobId ?? ""} className={inputClassName} aria-label="Job"><option value="">All jobs</option>{jobs.map((j) => <option key={j.id} value={j.id}>#{j.number} {jobTitle(j)}</option>)}</select>
          <select name="jobType" defaultValue={sp.jobType ?? ""} className={inputClassName} aria-label="Job type"><option value="">All job types</option>{JOB_TYPES.map((t) => <option key={t} value={t}>{JOB_TYPE_LABEL[t].en}</option>)}</select>
          <select name="categoryId" defaultValue={sp.categoryId ?? ""} className={inputClassName} aria-label="Category"><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}</select>
          <select name="emirate" defaultValue={sp.emirate ?? ""} className={inputClassName} aria-label="Applicant emirate"><option value="">All emirates</option>{EMIRATES.map((e) => <option key={e} value={e}>{EMIRATE_LABEL[e].en}</option>)}</select>
          <select name="skill" defaultValue={sp.skill ?? ""} className={inputClassName} aria-label="Skill"><option value="">All skills</option>{settings.skills.map((s) => <option key={s.key} value={s.key}>{s.labelEn}</option>)}</select>
          <select name="status" defaultValue={sp.status ?? ""} className={inputClassName} aria-label="Status"><option value="">All statuses</option>{APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABEL[s]}</option>)}</select>
          <label className="flex items-center gap-2 text-xs text-slate-500">From <input type="date" name="from" defaultValue={sp.from} className={inputClassName} /></label>
          <label className="flex items-center gap-2 text-xs text-slate-500">To <input type="date" name="to" defaultValue={sp.to} className={inputClassName} /></label>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="unread" value="1" defaultChecked={sp.unread === "1"} /> Unread only</label>
          <div className="flex gap-2"><button className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white">Filter</button><Link href="/admin/jobs/applications" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600">Reset</Link></div>
        </form>
        {data.length === 0 ? <EmptyState title="No applications match" hint="Share a job link to start receiving applications." /> : <ApplicationsTable rows={data} skillLabels={skillLabels} />}
        <Pager page={page} pages={pages} href={href} />
      </div>
    </div>
  );
}
