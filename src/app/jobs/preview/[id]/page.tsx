import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobDetailView } from "@/components/jobs/public/JobDetailView";
import { PublicShell, requestLang } from "@/components/jobs/public/PublicShell";
import { peekPermission } from "@/lib/adminGuard";
import { toPublicJob } from "@/lib/jobs/publicJob";
import { jobById } from "@/lib/jobs/publicQueries";
import { getJobSettings } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

// Admin-only preview of a job (draft or not) exactly as visitors will see it. Anyone else gets a plain "not found".
export default async function JobPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const auth = await peekPermission("jobs.manage");
  if ("error" in auth) notFound();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const job = await jobById(id);
  if (!job) notFound();
  const lang = await requestLang(sp.lang);
  const settings = await getJobSettings();
  const pub = toPublicJob(job, lang);
  return (
    <PublicShell lang={lang}>
    <JobDetailView
      preview
      job={{ ...pub, slug: pub.slug ?? "preview" }}
      lang={lang}
      form={{ skills: settings.skills.filter((s) => s.active).map((s) => ({ key: s.key, label: lang === "ar" ? s.labelAr : s.labelEn })), minPhotos: settings.minPhotos, maxPhotos: settings.maxPhotos, maxFileMb: settings.maxFileMb, privacyUrl: null }}
    />
    </PublicShell>
  );
}
