import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { peekPermission } from "@/lib/adminGuard";
import { applicationListInclude, applicationWhere, type ApplicationFilters } from "@/lib/jobs/applications";
import { toCsv } from "@/lib/forms/forms";
import { APPLICATION_STATUS_LABEL, EMIRATE_LABEL, type ApplicationStatusKey, type EmirateKey } from "@/lib/jobs/constants";

export const dynamic = "force-dynamic";

// CSV of the applications matching the current filters (admins with the Jobs permission only).
export async function GET(request: NextRequest) {
  const auth = await peekPermission("jobs.manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === "unauthorized" ? 401 : 403 });
  const sp = request.nextUrl.searchParams;
  const filters: ApplicationFilters = {
    q: sp.get("q") ?? undefined, jobId: sp.get("jobId") ?? undefined, jobType: (sp.get("jobType") as "PERMANENT" | "DAILY" | null) ?? undefined, categoryId: sp.get("categoryId") ?? undefined,
    emirate: sp.get("emirate") ?? undefined, skill: sp.get("skill") ?? undefined, status: sp.get("status") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined,
  };
  const rows = await prisma.jobApplication.findMany({ where: applicationWhere(filters), include: applicationListInclude, orderBy: { createdAt: "desc" }, take: 5000 });
  const csv = toCsv([
    ["Code", "Applicant", "Phone", "WhatsApp", "Job #", "Job", "Job emirate", "Skills", "Applicant emirate", "Area", "Photos", "Status", "Applied at"],
    ...rows.map((a) => [
      a.code ?? "", a.applicant.fullName, a.applicant.phone, a.applicant.whatsapp ?? "", String(a.job.number), a.job.titleEn || a.job.titleAr || a.job.category.nameEn, EMIRATE_LABEL[a.job.emirate as EmirateKey].en,
      a.applicant.skills.join("; "), a.applicant.emirate ? EMIRATE_LABEL[a.applicant.emirate as EmirateKey].en : "", a.applicant.area ?? "", String(a.photos.length),
      APPLICATION_STATUS_LABEL[a.status as ApplicationStatusKey], a.createdAt.toISOString().slice(0, 16).replace("T", " "),
    ]),
  ]);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="job-applications-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
