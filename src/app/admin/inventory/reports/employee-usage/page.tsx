import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { buildDateRange } from "@/lib/dateRangeFilter";
import { MONTH_NAMES } from "@/lib/reportData";
import { getEmployeeInventoryReport } from "@/lib/inventoryData";

export default async function EmployeeUsageReportPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string; year?: string; month?: string }>;
}) {
  const { employeeId: employeeIdParam, year: yearParam, month: monthParam } = await searchParams;
  const employees = await prisma.employee.findMany({ where: { status: "active" }, orderBy: { name: "asc" } });

  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  const employeeId = employeeIdParam && employees.some((e) => e.id === employeeIdParam) ? employeeIdParam : employees[0]?.id;

  const dateRange = buildDateRange(year, month);
  const range = dateRange ? { from: dateRange.gte, to: new Date(dateRange.lt.getTime() - 1) } : undefined;

  const report = employeeId && range ? await getEmployeeInventoryReport(employeeId, range) : null;
  const employeeName = employees.find((e) => e.id === employeeId)?.name ?? "";

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="pb-10">
      <AdminTopBar title="Employee Usage Report" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Employee Usage Report</h2>
          <p className="text-sm text-slate-500 mt-0.5">Opening / Received / Used / Returned / Damaged / Closing, for a specific month.</p>
        </div>

        <form className="flex flex-wrap items-end gap-3 mb-5" method="get">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Employee</span>
            <select name="employeeId" defaultValue={employeeId} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Month</span>
            <select name="month" defaultValue={month} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600">Year</span>
            <select name="year" defaultValue={year} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-blue-700 text-white text-sm font-medium px-4 py-2.5">
            View
          </button>
        </form>

        {report && (
          <>
            <h3 className="font-semibold text-slate-900 mb-3">
              {employeeName} — {MONTH_NAMES[month - 1]} {year}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium text-right">Opening</th>
                    <th className="px-4 py-3 font-medium text-right">Received</th>
                    <th className="px-4 py-3 font-medium text-right">Used</th>
                    <th className="px-4 py-3 font-medium text-right">Returned</th>
                    <th className="px-4 py-3 font-medium text-right">Damaged</th>
                    <th className="px-4 py-3 font-medium text-right">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.itemId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-900 font-medium whitespace-nowrap">{r.displayName}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.opening?.toLocaleString() ?? "—"} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.received.toLocaleString()} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.used.toLocaleString()} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.returned.toLocaleString()} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.damaged.toLocaleString()} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium">
                        {r.closing?.toLocaleString() ?? "—"} {r.unit}
                      </td>
                    </tr>
                  ))}
                  {report.rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        No activity for this employee in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
