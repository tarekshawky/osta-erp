import { NextRequest, NextResponse } from "next/server";
import { peekPermission } from "@/lib/adminGuard";
import { toCsv } from "@/lib/forms/forms";
import { periodFrom, reportsData } from "@/lib/jobs/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await peekPermission("jobs.manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.error === "unauthorized" ? 401 : 403 });
  const { from, to } = periodFrom({ from: request.nextUrl.searchParams.get("from") ?? undefined, to: request.nextUrl.searchParams.get("to") ?? undefined });
  const d = await reportsData(from, to);
  const csv = toCsv([
    ["Job #", "Title", "Category", "Status", "Applications"],
    ...d.perJob.map((j) => [String(j.number), j.titleEn || j.titleAr || "", j.category.nameEn, j.status, String(j._count.applications)]),
    [],
    ["Month published", "Permanent", "Daily"],
    ...d.publishedByMonth.map((m) => [m.month, String(m.permanent), String(m.daily)]),
    [],
    ["Accepted", String(d.accepted), "Rejected", String(d.rejected)],
  ]);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="jobs-report-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
