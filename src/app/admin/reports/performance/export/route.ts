import { NextRequest, NextResponse } from "next/server";
import { requireEmployee } from "@/lib/auth";
import { canAccessAdminSection } from "@/lib/adminSections";
import { buildMultiSheetWorkbook } from "@/lib/excel";
import { COST_BUCKETS, computePerformance, filterRows } from "@/lib/performanceData";
import { loadPerfInput, parsePerfQuery } from "@/lib/performanceLoader";
import { formatDate } from "@/lib/format";

// Excel export of the performance report with the same period and filters as the page. With an emirate or a team selected it
// is that emirate's / team's own report. Needs the same access as the Reports pages.
export async function GET(request: NextRequest) {
  const admin = await requireEmployee("ADMIN");
  if (admin.role !== "SUPER_ADMIN" && !canAccessAdminSection(admin.adminSections, "/admin/reports")) {
    return new NextResponse("You don't have access to Reports.", { status: 403 });
  }

  const sp: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((v, k) => (sp[k] = v));
  const q = parsePerfQuery(sp);
  const input = await loadPerfInput(q.period);
  const r = computePerformance(input, q.filters);
  const rows = filterRows(input, q.filters);
  const teamName = new Map(input.teams.map((t) => [t.id, t.name]));
  const tn = (id: string | null) => (id ? (teamName.get(id) ?? "") : "No team");
  const day = (d: Date) => formatDate(d);

  const metricHeaders = ["Orders", "Completed", "Pending", "Cancelled", "Invoices", "Revenue (invoiced)", "Collected", "Outstanding", "Expenses", "Net Profit", "Avg Invoice", "Expense %"];
  const metricCells = (m: typeof r.totals) => [m.orders, m.completed, m.pending, m.cancelled, m.invoices, m.revenue, m.collected, m.outstanding, m.expenses, m.profit, m.avgInvoice, m.expensePct];

  const filterText = [
    q.filters.emirate && `Emirate: ${q.filters.emirate}`,
    q.filters.teamId && `Team: ${tn(q.filters.teamId)}`,
    q.filters.employeeId && "Employee filter on",
    q.filters.orderStatus && `Order status: ${q.filters.orderStatus}`,
    q.filters.paymentStatus && `Payment status: ${q.filters.paymentStatus}`,
  ].filter(Boolean).join("; ") || "None";

  const buffer = await buildMultiSheetWorkbook([
    {
      name: "Summary",
      headers: ["Item", "Value"],
      rows: [
        ["Period", q.period.label], ["Filters", filterText], ["Generated", new Date().toISOString().slice(0, 16).replace("T", " ")],
        ...metricHeaders.map((h, i) => [h, metricCells(r.totals)[i]] as (string | number)[]),
        ["Shared / head-office expenses (not in any emirate)", r.sharedExpenses + r.unallocatedExpenses],
        ["Best emirate (net profit)", r.best.emirate ?? "—"], ["Best team (net profit)", r.best.team ?? "—"],
      ],
    },
    { name: "Emirates", headers: ["Emirate", ...metricHeaders], rows: r.emirates.map((e) => [e.emirate, ...metricCells(e)]) },
    { name: "Teams", headers: ["Team", "Assigned Emirate", ...metricHeaders], rows: r.teams.map((t) => [t.name, t.assignedEmirate ?? "Shared / head office", ...metricCells(t)]) },
    { name: "Expenses by type", headers: ["Type", "Amount"], rows: COST_BUCKETS.map((b) => [b, r.buckets.find((x) => x.label === b)?.value ?? 0]) },
    { name: "Monthly", headers: ["Month", "Revenue", "Expenses", "Orders"], rows: r.monthly.map((m) => [m.label, m.revenue, m.expenses, m.orders]) },
    {
      name: "Invoices",
      headers: ["Invoice", "Date", "Customer", "Emirate", "Team", "Payment Method", "Status", "Amount", "Refunded", "Collected"],
      rows: rows.invoices.map((i) => [i.number, day(i.date), i.customerName, i.emirate ?? "", tn(i.teamId), i.payment, i.status, i.amount, i.refundedAmount, i.status === "Unpaid" ? i.paidAmount : i.amount - i.refundedAmount]),
    },
    { name: "Orders", headers: ["Order", "Date", "Customer", "Emirate", "Team", "Status"], rows: rows.orders.map((o) => [o.number, day(o.date), o.customerName, o.emirate ?? "", tn(o.teamId), o.status]) },
    {
      name: "Costs",
      headers: ["Date", "Team", "Type", "Category", "Description", "Vendor", "Amount", "Attachment"],
      rows: rows.costs.map((c) => [day(c.date), tn(c.teamId), c.bucket, c.category, c.description, c.vendor ?? "", c.amount, c.attachmentUrl ?? ""]),
    },
  ]);

  const name = q.filters.emirate ? `emirate-${q.filters.emirate}` : q.filters.teamId ? `team-${tn(q.filters.teamId)}` : "performance";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name.replace(/[^\w-]+/g, "-")}-${q.period.from.toISOString().slice(0, 10)}_${q.period.to.toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
