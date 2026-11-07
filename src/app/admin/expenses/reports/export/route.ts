import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { canAccessAdminSection } from "@/lib/adminSections";
import { buildWorkbookBuffer } from "@/lib/excel";
import { REPORTS, loadExpenseReport, parseReport, parseReportFilters } from "@/lib/expenseReports";

// Excel export of one expense report with the same period and filters as the page.
export async function GET(request: NextRequest) {
  const admin = await requireEmployee("ADMIN");
  if (admin.role !== "SUPER_ADMIN" && !canAccessAdminSection(admin.adminSections, "/admin/expenses")) {
    return new NextResponse("You don't have access to Expenses.", { status: 403 });
  }
  const sp: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((v, k) => (sp[k] = v));
  const key = parseReport(sp.report);
  const f = parseReportFilters(sp);
  const report = await loadExpenseReport(key, f);
  const buffer = await buildWorkbookBuffer(REPORTS[key].title.slice(0, 31), report.columns.map((c) => c.label), [...report.rows.map((r) => r.cells), [], [report.totalLabel, ...Array(Math.max(0, report.columns.length - 2)).fill(null), report.total]]);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="expenses-${key}-${f.period.from.toISOString().slice(0, 10)}_${f.period.to.toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
