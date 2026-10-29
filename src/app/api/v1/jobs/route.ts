import { NextRequest } from "next/server";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { toPublicJob } from "@/lib/jobs/publicJob";
import { listedWhere } from "@/lib/jobs/publicQueries";
import { jobPublicUrl, jobsListUrl } from "@/lib/jobs/urls";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Open jobs for the public website's "Open jobs" block. Only what a visitor may see: no applicant data, no counts.
// Each item carries both languages and the absolute address of its application page (from PUBLIC_JOBS_BASE_URL).
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(24, Math.max(1, Number(sp.get("limit")) || 6));
  const rows = await prisma.job.findMany({
    where: listedWhere({ type: sp.get("type") ?? undefined, category: sp.get("category") ?? undefined, emirate: sp.get("emirate") ?? undefined }),
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: { category: { include: { fields: true } } },
  });
  const items = rows.map((r) => {
    const ar = toPublicJob(r, "ar");
    const en = toPublicJob(r, "en");
    return {
      slug: r.slug!, url: jobPublicUrl(r.slug!), type: r.type,
      titleEn: en.title, titleAr: ar.title, categoryEn: en.category, categoryAr: ar.category, emirateEn: en.emirate, emirateAr: ar.emirate, area: r.area,
      propertyEn: en.property, propertyAr: ar.property, workersEn: en.workersText, workersAr: ar.workersText,
      wageEn: en.wage?.text ?? null, wageAr: ar.wage?.text ?? null, durationEn: en.durationText, durationAr: ar.durationText,
      startEn: en.startDate, startAr: ar.startDate, deadlineEn: en.deadline, deadlineAr: ar.deadline,
    };
  });
  return apiSuccess({ listUrl: jobsListUrl(), items });
}
