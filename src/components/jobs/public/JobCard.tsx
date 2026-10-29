import Link from "next/link";
import type { PublicJob } from "@/lib/jobs/publicJob";
import { tx, type Lang } from "@/lib/jobs/publicText";

export function JobCard({ job, lang }: { job: PublicJob; lang: Lang }) {
  const daily = job.type === "DAILY";
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${daily ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{tx(lang, daily ? "daily" : "permanent")}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{job.category}</span>
      </div>
      <h2 className="text-lg font-bold leading-snug text-slate-900"><Link href={`/jobs/${job.slug}`} className="hover:text-blue-700">{job.title}</Link></h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-slate-600">
        <div><dt className="sr-only">{tx(lang, "location")}</dt><dd>📍 {job.emirate}{job.area ? ` – ${job.area}` : ""}</dd></div>
        {job.property && <div><dt className="sr-only">{tx(lang, "propertyType")}</dt><dd>🏠 {job.property}</dd></div>}
        <div><dt className="sr-only">{tx(lang, "workersNeeded")}</dt><dd>👷 {tx(lang, "workersNeeded")}: {job.workersText}</dd></div>
        {daily && job.durationText && <div><dt className="sr-only">{tx(lang, "duration")}</dt><dd>📅 {tx(lang, "duration")}: {job.durationText}</dd></div>}
        {job.wage && <div className="col-span-2"><dt className="sr-only">{tx(lang, daily ? "dailyWage" : "monthlySalary")}</dt><dd>💰 {job.wage.text}</dd></div>}
        {job.startDate && <div><dt className="sr-only">{tx(lang, "startDate")}</dt><dd>🗓️ {job.startDate}</dd></div>}
        {job.deadline && <div><dt className="sr-only">{tx(lang, "deadline")}</dt><dd>⏰ {job.deadline}</dd></div>}
      </dl>
      <Link href={`/jobs/${job.slug}`} className="mt-1 inline-flex w-fit items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{tx(lang, "applyNow")}</Link>
    </article>
  );
}
