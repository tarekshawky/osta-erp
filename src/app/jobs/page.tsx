import type { Metadata } from "next";
import Link from "next/link";
import { JobCard } from "@/components/jobs/public/JobCard";
import { PublicShell, requestLang } from "@/components/jobs/public/PublicShell";
import { EMIRATES, EMIRATE_LABEL, JOB_TYPES, PROPERTY_LABEL, PROPERTY_TYPES } from "@/lib/jobs/constants";
import { toPublicJob } from "@/lib/jobs/publicJob";
import { listPublicJobs, PUBLIC_PAGE_SIZE } from "@/lib/jobs/publicQueries";
import { tx } from "@/lib/jobs/publicText";
import { listCategories } from "@/lib/jobs/service";
import { jobsListUrl } from "@/lib/jobs/urls";

export const dynamic = "force-dynamic";

type SP = { q?: string; type?: string; category?: string; emirate?: string; area?: string; property?: string; page?: string; lang?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const lang = await requestLang(sp.lang);
  const url = jobsListUrl();
  const title = `${tx(lang, "jobsTitle")} | ${tx(lang, "siteName")}`;
  return {
    title,
    description: tx(lang, "jobsSubtitle"),
    alternates: { canonical: url, languages: { ar: `${url}?lang=ar`, en: `${url}?lang=en` } },
    openGraph: { title, description: tx(lang, "jobsSubtitle"), url, type: "website", siteName: tx(lang, "siteName") },
    twitter: { card: "summary_large_image", title, description: tx(lang, "jobsSubtitle") },
  };
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const lang = await requestLang(sp.lang);
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total, pages }, categories] = await Promise.all([listPublicJobs(sp, page), listCategories({ activeOnly: true })]);
  const jobs = rows.map((r) => toPublicJob(r, lang));
  const keep = Object.fromEntries(Object.entries({ q: sp.q, type: sp.type, category: sp.category, emirate: sp.emirate, area: sp.area, property: sp.property, lang: sp.lang }).filter(([, v]) => v)) as Record<string, string>;
  const href = (p: number) => `/jobs?${new URLSearchParams({ ...keep, page: String(p) })}`;
  const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
  void PUBLIC_PAGE_SIZE;
  return (
    <PublicShell lang={lang}>
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">{tx(lang, "jobsTitle")}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{tx(lang, "jobsSubtitle")}</p>
      </div>

      <form method="get" className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        {sp.lang && <input type="hidden" name="lang" value={sp.lang} />}
        <input name="q" defaultValue={sp.q} placeholder={tx(lang, "search")} className={`${input} lg:col-span-3`} aria-label={tx(lang, "search")} />
        <select name="type" defaultValue={sp.type ?? ""} className={input} aria-label={tx(lang, "allTypes")}><option value="">{tx(lang, "allTypes")}</option>{JOB_TYPES.map((t) => <option key={t} value={t}>{tx(lang, t === "DAILY" ? "daily" : "permanent")}</option>)}</select>
        <select name="category" defaultValue={sp.category ?? ""} className={input} aria-label={tx(lang, "allCategories")}><option value="">{tx(lang, "allCategories")}</option>{categories.map((c) => <option key={c.id} value={c.key}>{lang === "ar" ? c.nameAr : c.nameEn}</option>)}</select>
        <select name="emirate" defaultValue={sp.emirate ?? ""} className={input} aria-label={tx(lang, "allEmirates")}><option value="">{tx(lang, "allEmirates")}</option>{EMIRATES.map((e) => <option key={e} value={e}>{EMIRATE_LABEL[e][lang]}</option>)}</select>
        <input name="area" defaultValue={sp.area} placeholder={tx(lang, "area")} className={input} aria-label={tx(lang, "area")} />
        <select name="property" defaultValue={sp.property ?? ""} className={input} aria-label={tx(lang, "allProperty")}><option value="">{tx(lang, "allProperty")}</option>{PROPERTY_TYPES.map((p) => <option key={p} value={p}>{PROPERTY_LABEL[p][lang]}</option>)}</select>
        <div className="flex gap-2"><button className="rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white">{tx(lang, "filter")}</button><Link href="/jobs" className="rounded-xl border border-slate-200 px-5 py-3 text-base text-slate-600">{tx(lang, "reset")}</Link></div>
      </form>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-lg font-bold text-slate-700">{tx(lang, "noJobs")}</p>
          <p className="mt-1 text-slate-500">{tx(lang, "noJobsHint")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{jobs.map((j) => <JobCard key={j.id} job={j} lang={lang} />)}</div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={href(page - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2">{tx(lang, "previous")}</Link> : <span className="px-4 py-2 text-slate-300">{tx(lang, "previous")}</span>}
          <span className="text-slate-500">{tx(lang, "page")} {page} {tx(lang, "of")} {pages} · {total}</span>
          {page < pages ? <Link href={href(page + 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2">{tx(lang, "next")}</Link> : <span className="px-4 py-2 text-slate-300">{tx(lang, "next")}</span>}
        </nav>
      )}
    </div>
    </PublicShell>
  );
}
