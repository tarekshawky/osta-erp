import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAed, initials } from "@/lib/format";
import { logout } from "@/app/actions/logout";
import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { QuickActionTile } from "@/components/QuickActionTile";
import { getEmployeeFinancials } from "@/lib/walletData";

export default async function EmployeeHomePage() {
  const session = await requireEmployee("EMPLOYEE");
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: session.id },
    include: { team: true },
  });

  const { revenue, expenses, cash } = await getEmployeeFinancials(employee.id, employee.walletResetAt);
  const currentCash = employee.custody + cash - expenses;
  const openOrdersCount = await prisma.order.count({
    where: { assignedToId: employee.id, status: { not: "Done" } },
  });
  const number = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="pb-6">
      <TopBar />

      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {employee.photoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={employee.photoData} alt={employee.name} className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <div className="h-11 w-11 rounded-full bg-blue-950 text-white flex items-center justify-center font-semibold">
              {initials(employee.name)}
            </div>
          )}
          <div>
            <div className="font-bold text-slate-900">{employee.name}</div>
            <div className="text-sm text-slate-500">
              {employee.jobTitle} · {employee.team?.name ?? "—"} Team
            </div>
          </div>
        </div>
        <form action={logout}>
          <button className="text-sm text-slate-500 hover:text-slate-800">Logout</button>
        </form>
      </div>

      <div className="px-5">
        <div className="rounded-2xl bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white p-5 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5" />
          <div className="flex items-center justify-between text-xs text-blue-200 uppercase tracking-wide relative">
            <span>Employee Wallet</span>
            <span>{employee.code}</span>
          </div>
          <div className="text-sm text-blue-200 mt-4 relative">Current Cash</div>
          <div className="text-3xl font-bold mt-1 relative">{formatAed(currentCash)}</div>
          <div className="flex gap-6 mt-4 relative">
            <div>
              <div className="text-blue-300 text-xs">Revenue</div>
              <div className="font-semibold text-sm">{number(revenue)}</div>
            </div>
            <div>
              <div className="text-blue-300 text-xs">Expenses</div>
              <div className="font-semibold text-sm">{number(expenses)}</div>
            </div>
            <div>
              <div className="text-blue-300 text-xs">Orders</div>
              <div className="font-semibold text-sm">{openOrdersCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4 grid grid-cols-4 gap-2">
        <StatCard
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          value={number(employee.custody)}
          label="Custody"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="7" width="18" height="12" rx="2" />
              <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          }
        />
        <StatCard
          iconBg="bg-green-50"
          iconColor="text-green-600"
          value={number(revenue)}
          label="Revenue"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 16l6-6 4 4 6-8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 6h5v5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          iconBg="bg-red-50"
          iconColor="text-red-500"
          value={number(expenses)}
          label="Expenses"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 8l6 6 4-4 6 8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 18h5v-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          value={String(openOrdersCount)}
          label="Orders"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>

      <div className="px-5 mt-6">
        <h2 className="font-bold text-slate-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <QuickActionTile
            href="/employee/invoices/new"
            label="Create Invoice"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" strokeLinejoin="round" />
                <path d="M12 11v6M9 14h6" strokeLinecap="round" />
              </svg>
            }
          />
          <QuickActionTile
            href="/employee/quotation"
            label="Create Quotation"
            iconBg="bg-sky-50"
            iconColor="text-sky-600"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 3h8l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" strokeLinejoin="round" />
                <path d="M9 12h6M9 16h6" strokeLinecap="round" />
              </svg>
            }
          />
          <QuickActionTile
            href="/employee/quotations"
            label="Quotations"
            iconBg="bg-sky-50"
            iconColor="text-sky-600"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M8 9h8M8 13h5" strokeLinecap="round" />
              </svg>
            }
          />
          <QuickActionTile
            href="/employee/report"
            label="Reports"
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <QuickActionTile
            href="/employee/orders"
            label="Orders"
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <QuickActionTile
            href="/employee/expenses/new"
            label="Add Expense"
            iconBg="bg-red-50"
            iconColor="text-red-500"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 8l6 6 4-4 6 8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 18h5v-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <QuickActionTile
            href="/employee/invoices"
            label="Invoices"
            iconBg="bg-green-50"
            iconColor="text-green-600"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M8 9h8M8 13h5" strokeLinecap="round" />
              </svg>
            }
          />
          <QuickActionTile
            href="/employee/warranty-certificate"
            label="Warranty Certificate"
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <QuickActionTile
            href="/employee/inventory"
            label="My Inventory"
            iconBg="bg-teal-50"
            iconColor="text-teal-600"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinejoin="round" />
                <path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" />
                <path d="M12 13v8" strokeLinecap="round" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}
