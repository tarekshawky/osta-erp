import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { MONTH_NAMES } from "@/lib/reportData";
import { computeVehicleExpenseReportSummary } from "@/lib/vehicleData";

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

  const summary = await computeVehicleExpenseReportSummary({ year, month });

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Vehicle Expense Report"
        dateFilter={{ years, selectedYear: year ?? "all", selectedMonth: month ?? "all", basePath: "/admin/vehicles/expense-report" }}
      />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Vehicle Expense Report</h2>
        <p className="text-sm text-slate-500 mt-0.5">Vehicle-category expenses across the fleet — {periodLabel}</p>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminStatCard label="Total Vehicle Expenses" value={formatAed(summary.total)} valueClassName="text-red-500" />
          {Object.entries(summary.bySubcategory).map(([type, amount]) => (
            <AdminStatCard key={type} label={type} value={formatAed(amount)} />
          ))}
          {Object.keys(summary.bySubcategory).length === 0 && (
            <p className="text-sm text-slate-400 col-span-full">No vehicle expenses in this period.</p>
          )}
        </div>
      </div>
    </div>
  );
}
