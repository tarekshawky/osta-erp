import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { ExpensesManager } from "@/components/expense/ExpensesManager";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { buildDateRange } from "@/lib/dateRangeFilter";
import { EXPENSE_PAYMENT_METHODS, canonicalExpensePayment } from "@/lib/expenseData";
import { getVehicleCurrentOdometer } from "@/lib/vehicleData";
import type { Prisma } from "@/generated/prisma";

export default async function AdminExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    year?: string;
    month?: string;
    team?: string;
    vehicleId?: string;
    expenseType?: string;
    responsibleEmployeeId?: string;
    odometerMin?: string;
    odometerMax?: string;
  }>;
}) {
  const {
    page: pageParam,
    year: yearParam,
    month: monthParam,
    team = "all",
    vehicleId,
    expenseType,
    responsibleEmployeeId,
    odometerMin,
    odometerMax,
  } = await searchParams;
  const page = parsePage(pageParam);
  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;

  const [expenseDates, teams, activeCards, activeVehicles, employees] = await Promise.all([
    prisma.expense.findMany({ select: { date: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.creditCard.findMany({
      where: { status: "Active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, cardHolder: true, lastFour: true },
    }),
    prisma.vehicle.findMany({ where: { status: "Active" }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const vehicleOptions = await Promise.all(
    activeVehicles.map(async (v) => ({
      id: v.id,
      name: v.name,
      currentOdometer: await getVehicleCurrentOdometer(v.id, v.initialOdometer),
    }))
  );
  const years = Array.from(new Set(expenseDates.map((e) => e.date.getFullYear()))).sort((a, b) => b - a);

  const where: Prisma.ExpenseWhereInput = {};
  const dateRange = buildDateRange(year, month);
  if (dateRange) where.date = dateRange;
  if (team !== "all") where.team = { name: team };
  if (vehicleId) where.vehicleId = vehicleId;
  if (expenseType) where.subcategory = expenseType;
  if (responsibleEmployeeId) where.responsibleEmployeeId = responsibleEmployeeId;
  if (odometerMin || odometerMax) {
    where.odometer = {
      ...(odometerMin ? { gte: Number(odometerMin) } : {}),
      ...(odometerMax ? { lte: Number(odometerMax) } : {}),
    };
  }

  const [totalAgg, byCategory, byPayment] = await Promise.all([
    prisma.expense.aggregate({ _sum: { amount: true, refundedAmount: true }, _count: true, where }),
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true, refundedAmount: true },
      where,
      orderBy: { _sum: { amount: "desc" } },
      take: 2,
    }),
    prisma.expense.groupBy({
      by: ["payment"],
      _sum: { amount: true, refundedAmount: true },
      where,
    }),
  ]);
  const totalExpenses = (totalAgg._sum.amount ?? 0) - (totalAgg._sum.refundedAmount ?? 0);
  const paymentTotals: Record<string, number> = Object.fromEntries(EXPENSE_PAYMENT_METHODS.map((m) => [m, 0]));
  for (const row of byPayment) {
    const canonical = canonicalExpensePayment(row.payment);
    const net = (row._sum.amount ?? 0) - (row._sum.refundedAmount ?? 0);
    paymentTotals[canonical] = (paymentTotals[canonical] ?? 0) + net;
  }
  const totalPages = Math.max(1, Math.ceil(totalAgg._count / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    include: { createdBy: true, team: true, creditCard: { select: { lastFour: true } }, vehicleRef: { select: { name: true } } },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const rows = expenses.map((exp) => ({
    id: exp.id,
    date: exp.date.toISOString(),
    description: exp.description,
    notes: exp.notes,
    category: exp.category,
    vehicle: exp.vehicle,
    vehicleId: exp.vehicleId,
    vehicleName: exp.vehicleRef?.name ?? null,
    odometer: exp.odometer,
    subcategory: exp.subcategory,
    detailType: exp.detailType,
    liters: exp.liters,
    nextServiceInterval: exp.nextServiceInterval,
    payment: exp.payment,
    amount: exp.amount,
    status: exp.status,
    refundedAmount: exp.refundedAmount,
    attachmentUrl: exp.attachmentUrl,
    createdByName: exp.createdBy.name,
    teamName: exp.team?.name ?? null,
    vendor: exp.vendor,
    referenceNumber: exp.referenceNumber,
    creditCardId: exp.creditCardId,
    creditCardLastFour: exp.creditCard?.lastFour ?? null,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Expenses"
        dateFilter={{ years, selectedYear: year ?? "all", selectedMonth: month ?? "all", basePath: "/admin/expenses" }}
      />

      <div className="px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          <AdminStatCard label="Cash" value={formatAed(paymentTotals.Cash)} valueClassName="text-slate-900" />
          <AdminStatCard label="Bank Transfer" value={formatAed(paymentTotals["Bank Transfer"])} valueClassName="text-slate-900" />
          <AdminStatCard label="Credit Card" value={formatAed(paymentTotals["Credit Card"])} valueClassName="text-slate-900" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <AdminStatCard label="All Expenses" value={formatAed(totalExpenses)} valueClassName="text-red-500" />
          {byCategory.map((c) => (
            <AdminStatCard
              key={c.category ?? "none"}
              label={c.category ?? "Uncategorized"}
              value={formatAed((c._sum.amount ?? 0) - (c._sum.refundedAmount ?? 0))}
            />
          ))}
        </div>

        <ExpensesManager
          expenses={rows}
          totalCount={totalAgg._count}
          page={safePage}
          totalPages={totalPages}
          year={year ? String(year) : undefined}
          month={month ? String(month) : undefined}
          teams={teams.map((t) => t.name)}
          selectedTeam={team}
          activeCards={activeCards}
          vehicleOptions={vehicleOptions}
          employeeOptions={employees}
          vehicleFilterId={vehicleId}
          expenseTypeFilter={expenseType}
          responsibleEmployeeFilterId={responsibleEmployeeId}
          odometerMin={odometerMin}
          odometerMax={odometerMax}
        />
      </div>
    </div>
  );
}
