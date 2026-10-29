import Link from "next/link";
import { ApplyForm } from "@/components/jobs/public/ApplyForm";
import type { PublicJob } from "@/lib/jobs/publicJob";
import { tx, type Lang } from "@/lib/jobs/publicText";
import { turnstileEnabled } from "@/lib/jobs/turnstile";

type FormCfg = { skills: { key: string; label: string }[]; minPhotos: number; maxPhotos: number; maxFileMb: number; privacyUrl: string | null };

// The public job page: details, then (depending on the job's state) the application form or a closed / completed /
// cancelled message. Never shows applicant data, counts or internal notes.
export function JobDetailView({ job, lang, form, preview }: { job: PublicJob; lang: Lang; form: FormCfg; preview?: boolean }) {
  const daily = job.type === "DAILY";
  const rows: [string, string | null][] = [
    [tx(lang, "location"), `${job.emirate}${job.area ? ` – ${job.area}` : ""}`],
    [tx(lang, "propertyType"), job.property],
    [tx(lang, "workersNeeded"), job.workersText],
    ...(daily ? ([[tx(lang, "duration"), job.durationText], [tx(lang, "dailyWage"), job.wage?.text ?? null], [tx(lang, "materials"), job.materials]] as [string, string | null][]) : ([[tx(lang, "monthlySalary"), job.wage?.text ?? null], [tx(lang, "workingDaysWeek"), job.daysPerWeek ? String(job.daysPerWeek) : null]] as [string, string | null][])),
    [tx(lang, "workingHours"), job.hours],
    ...job.fields.map((f): [string, string] => [f.label, f.value]),
    [tx(lang, "startDate"), job.startDate],
    [tx(lang, "deadline"), job.deadline],
  ];
  const stateBox = (title: string | null, body: string, tone: "violet" | "amber" | "red") => {
    const tones = { violet: "border-violet-200 bg-violet-50 text-violet-900", amber: "border-amber-200 bg-amber-50 text-amber-900", red: "border-red-200 bg-red-50 text-red-900" };
    return (
      <div className={`rounded-2xl border p-6 text-center ${tones[tone]}`} role="status">
        {title && <h2 className="text-2xl font-extrabold">{title}</h2>}
        <p className={`mx-auto max-w-2xl leading-relaxed ${title ? "mt-3" : ""}`}>{body}</p>
        <Link href="/jobs" className="mt-5 inline-block rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white">{tx(lang, "viewJobs")}</Link>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {preview && <p className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-900">{tx(lang, "previewBanner")}</p>}
      <Link href="/jobs" className="text-sm font-medium text-blue-700">{lang === "ar" ? "→" : "←"} {tx(lang, "back")}</Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${daily ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{tx(lang, daily ? "daily" : "permanent")}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{job.category}</span>
        </div>
        <h1 className="text-2xl font-extrabold leading-snug text-slate-900 sm:text-3xl">{job.title}</h1>
        {job.fallbackNote && <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">{tx(lang, job.fallbackNote === "ar-only" ? "onlyArabic" : "onlyEnglish")}</p>}
        <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-sm"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{v}</dd></div>
          ))}
        </dl>
        {job.descriptionHtml && (
          <div className="mt-6">
            <h2 className="mb-2 text-lg font-bold text-slate-900">{tx(lang, "description")}</h2>
            {/* The description was rebuilt through the HTML allow-list when it was saved. */}
            <div className="rich-job leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />
          </div>
        )}
        {job.requirements && (
          <div className="mt-6"><h2 className="mb-2 text-lg font-bold text-slate-900">{tx(lang, "requirements")}</h2><p className="whitespace-pre-line leading-relaxed text-slate-700">{job.requirements}</p></div>
        )}
      </section>

      {job.state === "open" || preview ? (
        <ApplyForm slug={job.slug ?? ""} lang={lang} skills={form.skills} minPhotos={form.minPhotos} maxPhotos={form.maxPhotos} maxFileMb={form.maxFileMb} privacyUrl={form.privacyUrl} preview={preview} turnstileSiteKey={turnstileEnabled() ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null : null} />
      ) : job.state === "completed" ? (
        stateBox(tx(lang, "completedTitle"), tx(lang, "completedBody"), "violet")
      ) : job.state === "cancelled" ? (
        stateBox(tx(lang, "cancelledTitle"), tx(lang, "cancelledBody"), "red")
      ) : (
        stateBox(null, tx(lang, "closedBody"), "amber")
      )}
    </div>
  );
}
