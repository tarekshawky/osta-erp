import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";
import { toPublicJob } from "@/lib/jobs/publicJob";
import { listedWhere } from "@/lib/jobs/publicQueries";
import { listCategories } from "@/lib/jobs/service";
import { jobPublicUrl, jobsListUrl } from "@/lib/jobs/urls";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Public, unauthenticated: the jobs that are open for applications, for the website (the "Open jobs" block and the
// /join-osta-team/jobs page). Both languages are returned; the website picks one in the browser.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 6));
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
      categoryKey: r.category.key, emirateKey: r.emirate, propertyKey: r.propertyType, area: r.area,
      titleEn: en.title, titleAr: ar.title, categoryEn: en.category, categoryAr: ar.category, emirateEn: en.emirate, emirateAr: ar.emirate,
      propertyEn: en.property, propertyAr: ar.property, workersEn: en.workersText, workersAr: ar.workersText, wageEn: en.wage?.text ?? null, wageAr: ar.wage?.text ?? null,
      durationEn: en.durationText, durationAr: ar.durationText, startEn: en.startDate, startAr: ar.startDate, deadlineEn: en.deadline, deadlineAr: ar.deadline,
    };
  });
  const categories = (await listCategories({ activeOnly: true })).map((c) => ({ key: c.key, nameEn: c.nameEn, nameAr: c.nameAr }));
  return apiSuccess({ listUrl: jobsListUrl(), items, categories });
}
