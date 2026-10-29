import { NextRequest } from "next/server";
import { apiError, apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { EMIRATES, EMIRATE_LABEL } from "@/lib/jobs/constants";
import { toPublicJob } from "@/lib/jobs/publicJob";
import { jobBySlug } from "@/lib/jobs/publicQueries";
import { getJobSettings } from "@/lib/jobs/service";
import { jobPostingJsonLd } from "@/lib/jobs/seo";
import { turnstileEnabled } from "@/lib/jobs/turnstile";
import { jobPublicUrl, jobsListUrl } from "@/lib/jobs/urls";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Public, unauthenticated: one job (both languages) with what the website's application form needs. Drafts and unknown
// addresses are 404; closed, completed and cancelled jobs are returned with their state so the page can say so.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await jobBySlug(slug);
  if (!job || job.status === "DRAFT") return apiError("not_found", "Job not found.", 404);
  const [settings, privacy] = await Promise.all([getJobSettings(), prisma.integrationSettings.findUnique({ where: { id: "default" }, select: { privacyUrl: true } })]);
  const ar = toPublicJob(job, "ar");
  const en = toPublicJob(job, "en");
  return apiSuccess({
    slug, url: jobPublicUrl(slug), listUrl: jobsListUrl(), status: job.status, ar, en,
    emirateEn: EMIRATE_LABEL[job.emirate].en, emirateAr: EMIRATE_LABEL[job.emirate].ar,
    // JobPosting data only while the job is open, and only with what the admin really entered.
    jsonLd: en.state === "open" ? { ar: jobPostingJsonLd(job, "ar"), en: jobPostingJsonLd(job, "en") } : null,
    form: {
      skills: settings.skills.filter((s) => s.active).map((s) => ({ key: s.key, labelEn: s.labelEn, labelAr: s.labelAr })),
      emirates: EMIRATES.map((k) => ({ key: k, en: EMIRATE_LABEL[k].en, ar: EMIRATE_LABEL[k].ar })),
      minPhotos: settings.minPhotos, maxPhotos: settings.maxPhotos, maxFileMb: settings.maxFileMb,
      privacyUrl: privacy?.privacyUrl || null,
      turnstileSiteKey: turnstileEnabled() ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null : null,
    },
  });
}
