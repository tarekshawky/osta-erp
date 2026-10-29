import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobDetailView } from "@/components/jobs/public/JobDetailView";
import { PublicShell, requestLang } from "@/components/jobs/public/PublicShell";
import { EMIRATE_LABEL } from "@/lib/jobs/constants";
import { toPublicJob } from "@/lib/jobs/publicJob";
import { jobBySlug } from "@/lib/jobs/publicQueries";
import { tx } from "@/lib/jobs/publicText";
import { getJobSettings } from "@/lib/jobs/service";
import { jobPostingJsonLd } from "@/lib/jobs/seo";
import { jobPublicUrl } from "@/lib/jobs/urls";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SP = { lang?: string };

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const job = await jobBySlug(slug);
  // Drafts and unknown addresses are not found, so they get no metadata at all.
  if (!job || job.status === "DRAFT") return { robots: { index: false, follow: false } };
  const lang = await requestLang(sp.lang);
  const p = toPublicJob(job, lang);
  const url = jobPublicUrl(slug);
  const title = `${p.title} – ${EMIRATE_LABEL[job.emirate][lang]} | ${tx(lang, "siteName")}`;
  const plain = p.descriptionHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const description = [p.category, `${EMIRATE_LABEL[job.emirate][lang]}${p.area ? ` – ${p.area}` : ""}`, p.wage && p.wage.kind !== "agreed" ? p.wage.text : null, plain ? plain.slice(0, 140) : null].filter(Boolean).join(" · ");
  const open = p.state === "open";
  return {
    title,
    description,
    // The same address for both languages: the canonical never carries ?lang.
    alternates: { canonical: url, languages: { ar: `${url}?lang=ar`, en: `${url}?lang=en` } },
    robots: job.status === "CANCELLED" ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title, description, url, type: "website", siteName: tx(lang, "siteName"), locale: lang === "ar" ? "ar_AE" : "en_US" },
    twitter: { card: "summary_large_image", title, description },
    other: open ? {} : { "x-job-state": p.state },
  };
}

export default async function JobPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const job = await jobBySlug(slug);
  if (!job || job.status === "DRAFT") notFound(); // admins preview drafts at /jobs/preview/[id]
  const lang = await requestLang(sp.lang);
  const settings = await getJobSettings();
  const pub = toPublicJob(job, lang);
  const [{ privacyUrl }] = await Promise.all([prisma.integrationSettings.findUnique({ where: { id: "default" }, select: { privacyUrl: true } }).then((r) => ({ privacyUrl: r?.privacyUrl || null }))]);
  // JobPosting data only while the job is open, and only with what the admin really entered.
  const ld = pub.state === "open" ? jobPostingJsonLd(job, lang) : null;
  return (
    <PublicShell lang={lang}>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />}
      <JobDetailView job={pub} lang={lang} form={{ skills: settings.skills.filter((s) => s.active).map((s) => ({ key: s.key, label: lang === "ar" ? s.labelAr : s.labelEn })), minPhotos: settings.minPhotos, maxPhotos: settings.maxPhotos, maxFileMb: settings.maxFileMb, privacyUrl }} />
    </PublicShell>
  );
}
