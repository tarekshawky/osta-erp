import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { PhotoGallery } from "@/components/jobs/PhotoGallery";
import { WorkerActions } from "@/components/jobs/WorkerActions";
import { ApplicationStatusBadge, jobTitle, stamp } from "@/components/jobs/ui";
import { EMIRATE_LABEL, type EmirateKey } from "@/lib/jobs/constants";
import { greetingText, whatsappLink } from "@/lib/jobs/greeting";
import { getJobSettings } from "@/lib/jobs/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WorkerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await prisma.jobApplicant.findUnique({
    where: { id },
    include: { applications: { orderBy: { createdAt: "desc" }, include: { job: { select: { id: true, number: true, titleEn: true, titleAr: true, category: { select: { nameEn: true, key: true } } } }, photos: { select: { id: true }, orderBy: { sortOrder: "asc" } } } } },
  });
  if (!w) notFound();
  const settings = await getJobSettings();
  const skill = (k: string) => settings.skills.find((s) => s.key === k)?.labelEn ?? k;
  const photoIds = w.applications.flatMap((a) => a.photos.map((p) => p.id));
  const anonymized = !!w.anonymizedAt;
  return (
    <div className="pb-10">
      <AdminTopBar title="Jobs & Workforce · Worker" />
      <div className="flex flex-col gap-6 px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/jobs/workers" className="text-sm text-blue-600">← Workers</Link>
          <h2 className="text-2xl font-bold text-slate-900">{w.fullName}</h2>
          {w.employeeId && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Employee</span>}
          {anonymized && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Data deleted</span>}
        </div>
        {!anonymized && (
          <>
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${w.phone}`} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">📞 Call</a>
              <a href={whatsappLink(w.whatsapp ?? w.phone, greetingText(w.preferredLang, w.fullName, w.applications[0] ? jobTitle(w.applications[0].job) : "Osta Services"))} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">💬 WhatsApp</a>
            </div>
            <WorkerActions applicantId={w.id} name={w.fullName} employeeId={w.employeeId} defaultTitle={w.skills[0] ? skill(w.skills[0]) : "Technician"} />
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Phone</dt><dd dir="ltr" className="inline-block">{w.phone}</dd></div>
                <div><dt className="text-slate-500">WhatsApp</dt><dd dir="ltr" className="inline-block">{w.whatsapp ?? "—"}</dd></div>
                <div><dt className="text-slate-500">Preferred language</dt><dd>{w.preferredLang === "ar" ? "Arabic" : w.preferredLang === "en" ? "English" : w.preferredLang}</dd></div>
                <div><dt className="text-slate-500">Location</dt><dd>{[w.emirate ? EMIRATE_LABEL[w.emirate as EmirateKey].en : null, w.area].filter(Boolean).join(" – ") || "—"}</dd></div>
                <div><dt className="text-slate-500">Skills</dt><dd>{[...w.skills.map(skill), w.otherSkills].filter(Boolean).join(", ") || "—"}</dd></div>
                <div><dt className="text-slate-500">Experience</dt><dd>{w.experienceYears !== null ? `${w.experienceYears} years` : "—"}</dd></div>
              </dl>
            </section>
          </>
        )}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Applications ({w.applications.length})</h3>
          <ul className="flex flex-col divide-y divide-slate-100 text-sm">
            {w.applications.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <Link href={`/admin/jobs/applications/${a.id}`} className="text-blue-600">{a.code} · #{a.job.number} {jobTitle(a.job)}</Link>
                <span className="flex items-center gap-3 text-xs text-slate-400">{stamp(a.createdAt)} <ApplicationStatusBadge status={a.status} /></span>
              </li>
            ))}
          </ul>
        </section>
        {!anonymized && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">All work photos ({photoIds.length})</h3>
            <PhotoGallery photoIds={photoIds} />
          </section>
        )}
      </div>
    </div>
  );
}
