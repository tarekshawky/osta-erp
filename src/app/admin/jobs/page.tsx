import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { EmptyState, StatCard, jobTitle, stamp } from "@/components/jobs/ui";
import { NotificationsList } from "@/components/jobs/NotificationsList";
import { overviewData } from "@/lib/jobs/queries";
import { seedJobDefaults } from "@/lib/jobs/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function JobsOverviewPage() {
  // First visit: make sure the default categories and the painting field exist.
  if ((await prisma.jobCategory.count()) === 0) await seedJobDefaults();
  const d = await overviewData();
  const max = Math.max(1, ...d.perJob.map((p) => p.count));
  return (
    <div className="pb-10">
      <AdminTopBar title="Jobs & Workforce · إدارة الوظائف والعمالة" />
      <div className="flex flex-col gap-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
            <p className="mt-1 text-sm text-slate-500">Hiring for daily and permanent jobs: publish a job, share it on WhatsApp, review the applications.</p>
          </div>
          <Link href="/admin/jobs/new" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">+ Create job</Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total jobs" value={d.total} href="/admin/jobs/list" />
          <StatCard label="Published (open)" value={d.published} href="/admin/jobs/list?status=PUBLISHED" tone="emerald" />
          <StatCard label="Permanent" value={d.permanent} href="/admin/jobs/list?type=PERMANENT" />
          <StatCard label="Daily" value={d.daily} href="/admin/jobs/list?type=DAILY" />
          <StatCard label="New applications (unread)" value={d.unread} href="/admin/jobs/applications?unread=1" tone="blue" />
          <StatCard label="Under review" value={d.review} href="/admin/jobs/applications?status=UNDER_REVIEW" tone="amber" />
          <StatCard label="Accepted" value={d.accepted} href="/admin/jobs/applications?status=ACCEPTED" tone="emerald" />
          <StatCard label="Completed jobs" value={d.completed} href="/admin/jobs/list?status=COMPLETED" tone="violet" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Applications per job · last 30 days</h3>
            {d.perJob.length === 0 ? (
              <p className="text-sm text-slate-400">No applications in the last 30 days.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {d.perJob.map((p) => (
                  <li key={p.jobId}>
                    <Link href={`/admin/jobs/${p.jobId}`} className="flex items-center gap-3 text-xs text-slate-600 hover:text-blue-700">
                      <span className="w-40 shrink-0 truncate">{p.label}</span>
                      <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${(p.count / max) * 100}%` }} /></span>
                      <span className="w-6 text-right font-semibold text-slate-900">{p.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Deadline in the next 48 hours</h3>
            {d.deadlines.length === 0 ? (
              <p className="text-sm text-slate-400">No job closes in the next 48 hours.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100 text-sm">
                {d.deadlines.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/admin/jobs/${j.id}`} className="font-medium text-slate-800 hover:text-blue-700">#{j.number} {jobTitle(j)}</Link>
                    <span className="shrink-0 text-xs text-amber-600">{stamp(j.applicationDeadline!)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <NotificationsList items={d.notifications.map((n) => ({ ...n, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }))} />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Recent applications</h3>
            <Link href="/admin/jobs/applications" className="text-xs font-medium text-blue-600">View all →</Link>
          </div>
          {d.recent.length === 0 ? (
            <EmptyState title="No applications yet" hint="Publish a job and share its link to start receiving applications." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                  <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Job</th><th className="px-4 py-3">Photos</th><th className="px-4 py-3">Applied</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.recent.map((a) => (
                    <tr key={a.id} className={`hover:bg-slate-50 ${a.isRead ? "" : "font-semibold"}`}>
                      <td className="px-4 py-3"><Link href={`/admin/jobs/applications/${a.id}`} className="text-blue-600">{a.code}</Link></td>
                      <td className="px-4 py-3">{a.applicant.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">#{a.job.number} {jobTitle(a.job)}</td>
                      <td className="px-4 py-3 text-slate-600">{a.photos.length}</td>
                      <td className="px-4 py-3 text-slate-500">{stamp(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
