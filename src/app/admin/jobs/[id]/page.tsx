import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ApplicationStatusBadge, EmptyState, JobStatusBadge, TypeBadge, jobTitle, stamp, day } from "@/components/jobs/ui";
import { JobActions } from "@/components/jobs/JobActions";
import { EMIRATE_LABEL, MATERIALS_LABEL, PROPERTY_LABEL, type EmirateKey, type MaterialsByKey, type PropertyTypeKey } from "@/lib/jobs/constants";
import { jobDetail } from "@/lib/jobs/queries";
import { shareTexts } from "@/lib/jobs/share";
import { requiredWorkersReached } from "@/lib/jobs/status";
import { prisma } from "@/lib/prisma";
import { jobPublicUrl } from "@/lib/jobs/urls";
import { CloseApplicationsBanner } from "@/components/jobs/CloseApplicationsBanner";

export const dynamic = "force-dynamic";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-[10rem_1fr] gap-3 py-1.5 text-sm"><dt className="text-slate-500">{label}</dt><dd className="min-w-0 break-words text-slate-900">{value || <span className="text-slate-300">—</span>}</dd></div>
);

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await jobDetail(id);
  if (!job) notFound();
  const withFields = await prisma.job.findUnique({ where: { id }, include: { category: { include: { fields: true } } } });
  const share = withFields ? shareTexts(withFields) : null;
  const accepted = job.applications.filter((a) => a.status === "ACCEPTED").length;
  const reached = requiredWorkersReached(accepted, job.workersRequired) && (job.status === "PUBLISHED" || job.status === "IN_PROGRESS");
  const fieldValues = (job.customFields && typeof job.customFields === "object" ? job.customFields : {}) as Record<string, unknown>;
  const labelOf = (f: (typeof job.category.fields)[number]) => {
    const v = fieldValues[f.key];
    if (v === undefined || v === "") return null;
    const opts = (Array.isArray(f.options) ? f.options : []) as { value: string; labelEn: string; labelAr: string }[];
    const o = opts.find((x) => x.value === v);
    return o ? `${o.labelEn} · ${o.labelAr}` : String(v);
  };
  const money = (n: unknown) => (n === null || n === undefined ? null : `AED ${Number(n).toLocaleString("en-US")}`);

  return (
    <div className="pb-10">
      <AdminTopBar title={`Jobs & Workforce · Job #${job.number}`} />
      <div className="flex flex-col gap-6 px-6 py-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{jobTitle(job)}</h2>
            <JobStatusBadge status={job.status} />
            <TypeBadge type={job.type} />
          </div>
          <Suspense fallback={null}>
            <JobActions job={{ id: job.id, status: job.status, slug: job.slug }} publicUrl={job.slug ? jobPublicUrl(job.slug) : null} texts={share ? { ar: share.ar, en: share.en } : undefined} />
          </Suspense>
        </div>

        {reached && <CloseApplicationsBanner jobId={job.id} accepted={accepted} required={job.workersRequired} />}
        {job.status === "COMPLETED" && <p className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">This job is completed. The public link stays active and shows a “job completed” message. Applications stay viewable below.</p>}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Job information</h3>
            <dl className="divide-y divide-slate-100">
              <Row label="Category" value={`${job.category.nameEn} · ${job.category.nameAr}`} />
              <Row label="Title (EN / AR)" value={[job.titleEn, job.titleAr].filter(Boolean).join(" / ")} />
              <Row label="Location" value={`${EMIRATE_LABEL[job.emirate as EmirateKey].en}${job.area ? ` – ${job.area}` : ""}`} />
              <Row label="Property type" value={job.propertyType ? PROPERTY_LABEL[job.propertyType as PropertyTypeKey].en : null} />
              <Row label="Workers required" value={`${job.workersRequired} (accepted: ${accepted})`} />
              <Row label="Start date" value={job.startDate ? day(job.startDate) : null} />
              <Row label="Application deadline" value={job.applicationDeadline ? stamp(job.applicationDeadline) : null} />
              {job.type === "DAILY" ? (
                <>
                  <Row label="Daily wage" value={job.dailyWage !== null ? money(job.dailyWage) : job.wageToBeAgreed ? "To be agreed" : null} />
                  <Row label="Working days" value={job.workingDays} />
                  <Row label="Materials by" value={job.materialsBy ? MATERIALS_LABEL[job.materialsBy as MaterialsByKey].en : null} />
                </>
              ) : (
                <>
                  <Row label="Monthly salary" value={job.monthlySalaryMin !== null || job.monthlySalaryMax !== null ? [money(job.monthlySalaryMin), money(job.monthlySalaryMax)].filter(Boolean).join(" – ") : job.wageToBeAgreed ? "To be agreed" : null} />
                  <Row label="Working days / week" value={job.workingDaysPerWeek} />
                </>
              )}
              <Row label="Daily hours" value={job.dailyHours} />
              {job.category.fields.filter((f) => f.appliesTo.includes(job.type)).map((f) => <Row key={f.id} label={f.labelEn} value={labelOf(f)} />)}
              <Row label="Public link" value={job.slug ? <a href={jobPublicUrl(job.slug)} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600">{jobPublicUrl(job.slug)}</a> : "Created when the job is published"} />
              <Row label="Published" value={job.publishedAt ? stamp(job.publishedAt) : null} />
              <Row label="Completed" value={job.completedAt ? stamp(job.completedAt) : null} />
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Status history</h3>
            <ol className="flex flex-col gap-3 border-l border-slate-200 pl-4">
              {job.statusHistory.map((h) => (
                <li key={h.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <p className="font-medium text-slate-800">{h.from ? `${h.from.replace(/_/g, " ").toLowerCase()} → ` : ""}{h.to.replace(/_/g, " ").toLowerCase()}</p>
                  <p className="text-xs text-slate-400">{stamp(h.createdAt)} · {h.byName ?? "—"}</p>
                  {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Applications ({job.applications.length})</h3>
            <Link href={`/admin/jobs/applications?jobId=${job.id}`} className="text-xs font-medium text-blue-600">Open in Applications →</Link>
          </div>
          {job.applications.length === 0 ? (
            <EmptyState title="No applications yet" hint={job.slug ? "Share the job link on WhatsApp to receive applications." : "Publish the job to receive applications."} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Photos</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {job.applications.map((a) => (
                    <tr key={a.id} className={`hover:bg-slate-50 ${a.isRead ? "" : "font-semibold"}`}>
                      <td className="px-4 py-3"><Link href={`/admin/jobs/applications/${a.id}`} className="text-blue-600">{a.code}</Link></td>
                      <td className="px-4 py-3">{a.applicant.fullName}</td>
                      <td className="px-4 py-3 text-slate-600" dir="ltr">{a.applicant.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{a.photos.length}</td>
                      <td className="px-4 py-3 text-slate-500">{stamp(a.createdAt)}</td>
                      <td className="px-4 py-3"><ApplicationStatusBadge status={a.status} /></td>
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
