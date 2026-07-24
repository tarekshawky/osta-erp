import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { PayrollManager } from "@/components/admin/PayrollManager";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { buildDateRange } from "@/lib/dateRangeFilter";
import type { Prisma } from "@/generated/prisma";

export default async function AdminPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; year?: string; month?: string; employee?: string }>;
}) {
  const { page: pageParam, year: yearParam, month: monthParam, employee = "all" } = await searchParams;
  const page = parsePage(pageParam);
  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;

  const [entryDates, employees] = await Promise.all([
    prisma.payrollEntry.findMany({ select: { date: true } }),
    prisma.employee.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const years = Array.from(new Set(entryDates.map((e) => e.date.getFullYear()))).sort((a, b) => b - a);

  const where: Prisma.PayrollEntryWhereInput = {};
  const dateRange = buildDateRange(year, month);
  if (dateRange) where.date = dateRange;
  if (employee !== "all") where.employeeId = employee;

  const [totalCount, byType] = await Promise.all([
    prisma.payrollEntry.count({ where }),
    prisma.payrollEntry.groupBy({ by: ["type"], _sum: { amount: true }, where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const salaryTotal = byType.find((t) => t.type === "Salary")?._sum.amount ?? 0;
  const advanceTotal = byType.find((t) => t.type === "Advance")?._sum.amount ?? 0;
  const deductionTotal = byType.find((t) => t.type === "Deduction")?._sum.amount ?? 0;
  const netPayroll = salaryTotal + advanceTotal - deductionTotal;

  const entries = await prisma.payrollEntry.findMany({
    where,
    orderBy: { date: "desc" },
    include: { employee: true, createdBy: true },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const rows = entries.map((entry) => ({
    id: entry.id,
    date: entry.date.toISOString(),
    employeeId: entry.employeeId,
    employeeName: entry.employee.name,
    type: entry.type,
    amount: entry.amount,
    note: entry.note,
    createdByName: entry.createdBy.name,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Payroll"
        dateFilter={{ years, selectedYear: year ?? "all", selectedMonth: month ?? "all", basePath: "/admin/payroll" }}
      />

      <div className="px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <AdminStatCard label="Salary Paid" value={formatAed(salaryTotal)} valueClassName="text-green-600" />
          <AdminStatCard label="Salary in Advance" value={formatAed(advanceTotal)} valueClassName="text-amber-600" />
          <AdminStatCard label="Cut Salary" value={formatAed(deductionTotal)} valueClassName="text-red-500" />
          <AdminStatCard label="Net Payroll" value={formatAed(netPayroll)} valueClassName="text-blue-700" />
        </div>

        <PayrollManager
          entries={rows}
          totalCount={totalCount}
          page={safePage}
          totalPages={totalPages}
          year={year ? String(year) : undefined}
          month={month ? String(month) : undefined}
          employees={employees}
          selectedEmployee={employee}
        />
      </div>
    </div>
  );
}
