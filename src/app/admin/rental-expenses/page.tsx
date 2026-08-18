import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import {
  ensureAllActiveAgreementsGenerated,
  getRentalAlerts,
  computeRentalExpenseSummary,
  getRentalTransactions,
} from "@/lib/rentalData";
import { RentalAlertsBanner } from "@/components/rental/RentalAlertsBanner";
import { RentalExpensesFilterBar } from "@/components/rental/RentalExpensesFilterBar";
import { RentalTransactionsTable } from "@/components/rental/RentalTransactionsTable";

export default async function RentalExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    customerId?: string;
    status?: string;
    paymentMethod?: string;
    rentalType?: string;
  }>;
}) {
  const sp = await searchParams;
  const currentYear = new Date().getFullYear();

  // Company-wide top-up: this is the one place the rolling window gets refreshed
  // for every agreement, regardless of whether anyone visited a specific
  // customer's profile. No cron exists, so a page-load call is the only trigger.
  await ensureAllActiveAgreementsGenerated();

  const year = sp.year ? Number(sp.year) : null;
  const month = sp.month ? Number(sp.month) : null;
  const filters = {
    customerId: sp.customerId ?? "",
    status: sp.status ?? "",
    paymentMethod: sp.paymentMethod ?? "",
    rentalType: sp.rentalType ?? "",
  };

  const [alerts, summary, transactions, transactionYears, customersWithAgreements] = await Promise.all([
    getRentalAlerts(),
    computeRentalExpenseSummary(),
    getRentalTransactions({ year, month, ...filters }),
    prisma.rentalTransaction.findMany({ select: { dueDate: true } }),
    prisma.customer.findMany({
      where: { rentalAgreements: { some: {} } },
      select: { id: true, name: true, companyName: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const years = Array.from(new Set([currentYear, ...transactionYears.map((t) => t.dueDate.getFullYear())])).sort((a, b) => b - a);
  const customerOptions = customersWithAgreements.map((c) => ({
    id: c.id,
    name: c.type === "COMPANY" ? c.companyName || c.name : c.name,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Rental Expenses"
        dateFilter={{ years, selectedYear: year ?? "all", selectedMonth: month ?? "all", basePath: "/admin/rental-expenses" }}
      />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Rental Expenses</h2>
        <p className="text-sm text-slate-500 mt-0.5">Rental agreements and monthly rent transactions across all landlords.</p>

        <div className="mt-5">
          <RentalAlertsBanner alerts={alerts} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard label="Active Agreements" value={String(summary.activeAgreementsCount)} />
          <AdminStatCard label="This Month" value={formatAed(summary.totalThisMonth)} valueClassName="text-red-500" />
          <AdminStatCard label="Outstanding" value={formatAed(summary.totalOutstanding)} valueClassName="text-orange-500" />
          <AdminStatCard label="Paid This Year" value={formatAed(summary.totalPaidYtd)} valueClassName="text-green-600" />
        </div>

        <div className="mt-6">
          <RentalExpensesFilterBar
            basePath="/admin/rental-expenses"
            customers={customerOptions}
            filters={filters}
            year={year}
            month={month}
          />
          <RentalTransactionsTable transactions={transactions} showCompany />
        </div>
      </div>
    </div>
  );
}
