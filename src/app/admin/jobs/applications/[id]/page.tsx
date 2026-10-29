import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ApplicationPanel } from "@/components/jobs/ApplicationPanel";
import { PhotoGallery } from "@/components/jobs/PhotoGallery";
import { ApplicationStatusBadge, jobTitle, stamp } from "@/components/jobs/ui";
import { EMIRATE_LABEL, type EmirateKey } from "@/lib/jobs/constants";
import { greetingText, whatsappLink } from "@/lib/jobs/greeting";
import { getJobSettings } from "@/lib/jobs/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-[9rem_1fr] gap-3 py-1.5 text-sm"><dt className="text-slate-500">{label}</dt><dd className="min-w-0 break-words text-slate-900">{value || <span className="text-slate-300">—</span>}</dd></div>
);

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      applicant: { include: { applications: { orderBy: { createdAt: "desc" }, include: { job: { select: { id: true, number: true, titleEn: true, titleAr: true, category: { select: { nameEn: true } } } } } } } },
      job: { include: { category: { select: { nameEn: true } } } },
      photos: { orderBy: { sortOrder: "asc" }, select: { id: true } },
      internalNotes: { orderBy: { createdAt: "desc" } },
      contactLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!app) notFound();
  // Opening an application marks it read.
  if (!app.isRead) await prisma.jobApplication.update({ where: { id }, data: { isRead: true } });

  const [settings, openJobs] = await Promise.all([
    getJobSettings(),
    prisma.job.findMany({ where: { status: "PUBLISHED", id: { not: app.jobId }, applications: { none: { applicantId: app.applicantId } } }, orderBy: { number: "desc" }, take: 100, select: { id: true, number: true, titleEn: true, titleAr: true, emirate: true, category: { select: { nameEn: true } } } }),
  ]);
  const skillLabel = (k: string) => settings.skills.find((s) => s.key === k)?.labelEn ?? k;
  const snap = (app.snapshot && typeof app.snapshot === "object" ? app.snapshot : {}) as Record<string, unknown>;
  const a = app.applicant;
  const title = jobTitle(app.job);
  const lang = typeof snap.preferredLang === "string" ? snap.preferredLang : a.preferredLang;
  const wa = a.whatsapp ?? a.phone;
  const stampTxt = (d: Date) => stamp(d);

  return (
    <div className="pb-10">
      <AdminTopBar title={`Jobs & Workforce · ${app.code ?? "Application"}`} />
      <div className="flex flex-col gap-6 px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/jobs/applications" className="text-sm text-blue-600">← Applications</Link>
          <h2 className="text-2xl font-bold text-slate-900">{a.fullName}</h2>
          <ApplicationStatusBadge status={app.status} />
          <span className="text-sm text-slate-400">{app.code}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${a.phone}`} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">📞 Call</a>
          <a href={whatsappLink(wa, greetingText(lang, a.fullName, title))} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">💬 WhatsApp</a>
          <Link href={`/admin/jobs/workers/${a.id}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Worker profile</Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Applicant (as submitted for this job)</h3>
              <dl className="divide-y divide-slate-100">
                <Row label="Full name" value={String(snap.fullName ?? a.fullName)} />
                <Row label="Phone" value={<span dir="ltr">{String(snap.phone ?? a.phone)}</span>} />
                <Row label="WhatsApp" value={<span dir="ltr">{String(snap.whatsapp ?? a.whatsapp ?? "")}</span>} />
                <Row label="Preferred language" value={lang === "ar" ? "Arabic" : lang === "en" ? "English" : lang} />
                <Row label="Emirate / area" value={[snap.emirate ? EMIRATE_LABEL[snap.emirate as EmirateKey]?.en : null, snap.area].filter(Boolean).join(" – ")} />
                <Row label="Skills" value={(Array.isArray(snap.skills) ? (snap.skills as string[]) : a.skills).map(skillLabel).join(", ")} />
                <Row label="Other skills" value={String(snap.otherSkills ?? "")} />
                <Row label="Experience" value={snap.experienceYears !== null && snap.experienceYears !== undefined ? `${snap.experienceYears} years` : null} />
                <Row label="Applicant's notes" value={app.notes ? <span className="whitespace-pre-line">{app.notes}</span> : null} />
                <Row label="Applied" value={stampTxt(app.createdAt)} />
                <Row label="Consent" value={`Agreed on ${stampTxt(app.consentAt)}`} />
                <Row label="For job" value={<Link href={`/admin/jobs/${app.job.id}`} className="text-blue-600">#{app.job.number} {title} · {EMIRATE_LABEL[app.job.emirate as EmirateKey].en}</Link>} />
              </dl>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Work photos ({app.photos.length})</h3>
              <PhotoGallery photoIds={app.photos.map((p) => p.id)} />
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Other applications by {a.fullName}</h3>
              <ul className="flex flex-col divide-y divide-slate-100 text-sm">
                {a.applications.filter((x) => x.id !== app.id).length === 0 && <li className="py-2 text-slate-400">None.</li>}
                {a.applications.filter((x) => x.id !== app.id).map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 py-2"><Link href={`/admin/jobs/applications/${x.id}`} className="text-blue-600">{x.code} · #{x.job.number} {jobTitle(x.job)}</Link><ApplicationStatusBadge status={x.status} /></li>
                ))}
              </ul>
            </section>
          </div>
          <ApplicationPanel
            id={app.id}
            status={app.status}
            notes={app.internalNotes.map((n) => ({ id: n.id, body: n.body, byName: n.byName, at: stampTxt(n.createdAt) }))}
            logs={app.contactLogs.map((l) => ({ id: l.id, channel: l.channel, outcome: l.outcome, note: l.note, byName: l.byName, at: stampTxt(l.createdAt) }))}
            openJobs={openJobs.map((j) => ({ id: j.id, label: `#${j.number} ${jobTitle(j)} · ${EMIRATE_LABEL[j.emirate as EmirateKey].en}` }))}
          />
        </div>
      </div>
    </div>
  );
}
