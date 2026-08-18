import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { MONTH_NAMES } from "@/lib/reportData";
import {
  computeVehicleExpenseReportSummary,
  computeFineReportSummary,
  computeMileageReportSummary,
  computeFuelReportSummary,
} from "@/lib/vehicleData";

export default async function VehicleExpenseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const currentYear = new Date().getFullYear();

  const expenseDates = await prisma.expense.findMany({
    where: { vehicleId: { not: null } },
    select: { date: true },
  });
  const years = Array.from(new Set([currentYear, ...expenseDates.map((e) => e.date.getFullYear())])).sort((a, b) => b - a);

  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;
  const periodLabel = year ? (month ? `${MONTH_NAMES[month - 1]} ${year}` : String(year)) : "All Time";

  const [summary, fineSummary, mileageSummary, fuelSummary] = await Promise.all([
    computeVehicleExpenseReportSummary({ year, month }),
    computeFineReportSummary({ year, month }),
    computeMileageReportSummary(),
    computeFuelReportSummary({ year, month }),
  ]);

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Vehicle Expense Report"
        dateFilter={{ years, selectedYear: year ?? "all", selectedMonth: month ?? "all", basePath: "/admin/vehicles/expense-report" }}
      />
      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Vehicle Expense Report</h2>
            <p className="text-sm text-slate-500 mt-0.5">Vehicle-category expenses across the fleet — {periodLabel}</p>
          </div>
          <a
            href={`/admin/vehicles/expense-report/export?${new URLSearchParams({
              ...(year ? { year: String(year) } : {}),
              ...(month ? { month: String(month) } : {}),
            }).toString()}`}
            className="text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2.5 flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminStatCard label="Total Vehicle Expenses" value={formatAed(summary.total)} valueClassName="text-red-500" />
          {Object.entries(summary.bySubcategory).map(([type, amount]) => (
            <AdminStatCard key={type} label={type} value={formatAed(amount)} />
          ))}
          {Object.keys(summary.bySubcategory).length === 0 && (
            <p className="text-sm text-slate-400 col-span-full">No vehicle expenses in this period.</p>
          )}
        </div>

        {/* Fine Report */}
        <h3 className="mt-8 font-semibold text-slate-900">Fine Report — {periodLabel}</h3>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <AdminStatCard label="Total Fines" value={formatAed(fineSummary.totalFines)} valueClassName="text-red-500" />
          <AdminStatCard label="Company Contribution" value={formatAed(fineSummary.totalCompany)} />
          <AdminStatCard label="Employee Responsibility" value={formatAed(fineSummary.totalEmployee)} />
          <AdminStatCard label="Amount Deducted" value={formatAed(fineSummary.deducted)} valueClassName="text-green-600" />
          <AdminStatCard label="Remaining" value={formatAed(fineSummary.remaining)} valueClassName={fineSummary.remaining > 0 ? "text-amber-600" : "text-slate-900"} />
        </div>
        {(Object.keys(fineSummary.byVehicle).length > 0 || Object.keys(fineSummary.byEmployee).length > 0) && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">Fines by Vehicle</div>
              {Object.entries(fineSummary.byVehicle).map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between py-1.5 text-sm border-b border-slate-50 last:border-0">
                  <span className="text-slate-600">{name}</span>
                  <span className="font-medium text-slate-900">{formatAed(amount)}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">Fines by Employee</div>
              {Object.entries(fineSummary.byEmployee).map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between py-1.5 text-sm border-b border-slate-50 last:border-0">
                  <span className="text-slate-600">{name}</span>
                  <span className="font-medium text-slate-900">{formatAed(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mileage Report */}
        <h3 className="mt-8 font-semibold text-slate-900">Mileage Report</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium text-right">Current Odometer</th>
                <th className="px-4 py-3 font-medium text-right">Last Service Odometer</th>
                <th className="px-4 py-3 font-medium text-right">Next Service Odometer</th>
              </tr>
            </thead>
            <tbody>
              {mileageSummary.map((v) => (
                <tr key={v.vehicleId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-900 font-medium">{v.vehicleName}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{v.currentOdometer.toLocaleString()} KM</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {v.lastServiceOdometer != null ? `${v.lastServiceOdometer.toLocaleString()} KM` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {v.nextServiceOdometer != null ? `${v.nextServiceOdometer.toLocaleString()} KM` : "—"}
                  </td>
                </tr>
              ))}
              {mileageSummary.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No active vehicles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Fuel Report */}
        <h3 className="mt-8 font-semibold text-slate-900">Fuel Report — {periodLabel}</h3>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard label="Total Fuel Cost" value={formatAed(fuelSummary.totalCost)} valueClassName="text-red-500" />
          <AdminStatCard label="Total Liters" value={`${fuelSummary.totalLiters.toLocaleString()} L`} />
          <AdminStatCard label="Avg KM/L" value={fuelSummary.avgKmPerLiter != null ? fuelSummary.avgKmPerLiter.toFixed(2) : "—"} />
          <AdminStatCard label="Avg Cost/KM" value={fuelSummary.avgCostPerKm != null ? formatAed(fuelSummary.avgCostPerKm) : "—"} />
        </div>
      </div>
    </div>
  );
}
