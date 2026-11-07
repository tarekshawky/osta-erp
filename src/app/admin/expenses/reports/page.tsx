import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { PrintButton } from "@/components/admin/PrintButton";
import { ExpenseReportFilters } from "@/components/expense/ExpenseReportFilters";
import { REPORTS, loadExpenseReport, parseReport, parseReportFilters } from "@/lib/expenseReports";
import { EXPENSE_CATEGORIES } from "@/lib/expenseData";
import { EMPLOYEE_KINDS, RENTAL_KINDS } from "@/lib/expenseClasses";

export default async function ExpenseReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const key = parseReport(Array.isArray(sp.report) ? sp.report[0] : sp.report);
  const f = parseReportFilters(sp);
  const [report, teams, employees] = await Promise.all([
    loadExpenseReport(key, f),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.employee.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const kinds = key === "employee" ? EMPLOYEE_KINDS.filter((k) => !k.viaPayroll).map((k) => k.kind) : [...EXPENSE_CATEGORIES, ...Object.values(RENTAL_KINDS).map((r) => r.kind)];
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v] as [string, string]] : [])));
  qs.set("report", key);
  const fmt = (v: string | number | null, money?: boolean) => (v === null || v === "" ? "—" : typeof v === "number" ? (money ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v)) : v);

  return (
    <div className="pb-10 print-area">
      <AdminTopBar title="Expense Reports" hideMonth />
      <div className="space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{REPORTS[key].title}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{REPORTS[key].ar} · {f.period.label}</p>
          </div>
          <div className="no-print flex gap-2">
            <Link href="/admin/expenses" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← Expenses</Link>
            <a href={`/admin/expenses/reports/export?${qs}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Export to Excel</a>
            <PrintButton />
          </div>
        </div>

        <ExpenseReportFilters report={key} teams={teams} employees={employees} kinds={kinds} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminStatCard label={report.totalLabel} value={formatAed(report.total)} valueClassName="text-red-500" />
          <AdminStatCard label="Records" value={String(report.rows.length)} valueClassName="text-blue-700" />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {report.columns.map((c) => <th key={c.label} className={`whitespace-nowrap px-3 py-3 font-medium ${c.num ? "text-right" : ""}`}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {r.cells.map((c, j) => {
                    const col = report.columns[j];
                    const text = fmt(c, col.money);
                    return (
                      <td key={j} className={`px-3 py-2.5 ${col.num ? "whitespace-nowrap text-right tabular-nums" : ""} ${j === 0 && r.href ? "font-medium text-blue-600" : "text-slate-700"}`}>
                        {j === 0 && r.href ? <Link href={r.href}>{text}</Link> : text}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {report.rows.length === 0 && <tr><td colSpan={report.columns.length} className="px-4 py-10 text-center text-slate-400">No records in this period.</td></tr>}
            </tbody>
          </table>
        </div>
        {report.notes && <p className="text-xs text-slate-500">{report.notes}</p>}
      </div>
    </div>
  );
}
