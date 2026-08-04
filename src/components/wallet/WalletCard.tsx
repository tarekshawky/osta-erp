import Link from "next/link";
import { formatAed, initials } from "@/lib/format";
import { CustodyModal } from "./CustodyModal";
import { WithdrawRevenueModal } from "./WithdrawRevenueModal";

export function WalletCard({
  role,
  code,
  name,
  employeeId,
  custody,
  revenue,
  expenses,
  revenueWithdrawn,
}: {
  role: "Admin" | "Employee";
  code: string;
  name: string;
  employeeId: string;
  custody: number;
  revenue: number;
  expenses: number;
  revenueWithdrawn: number;
}) {
  const rawAvailableRevenue = revenue - expenses - revenueWithdrawn;
  // Guard against floating-point dust (e.g. -0.000000000007) from summing many decimal
  // amounts, which would otherwise render as a stray "-0.00".
  const availableRevenue = Math.abs(rawAvailableRevenue) < 0.005 ? 0 : rawAvailableRevenue;
  // Employees: balance is revenue they've earned but not yet withdrawn (custody is a
  // separate reimbursable float). Admin: custody largely *is* company cash (built up
  // from employees' withdrawals + manual top-ups), so it belongs in their balance.
  const rawBalance = role === "Admin" ? custody + availableRevenue : availableRevenue;
  const balance = Math.abs(rawBalance) < 0.005 ? 0 : rawBalance;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white p-5 relative">
        <div className="flex items-center justify-between text-xs text-blue-200">
          <span className="flex items-center gap-1.5">
            <span className="h-6 w-6 rounded-full bg-white/15 flex items-center justify-center text-[10px] font-semibold">
              {initials(name)}
            </span>
            {role} Wallet
          </span>
          <span>{code}</span>
        </div>
        <div className="mt-2 font-semibold">{name}</div>
        <div className="text-xs text-blue-200 mt-3">Current Balance</div>
        <div className={`text-2xl font-bold mt-0.5 ${balance < 0 ? "text-red-300" : ""}`}>{formatAed(balance)}</div>
        <div className="flex gap-6 mt-3 text-xs">
          <div>
            <div className="text-blue-300">Custody</div>
            <div className="font-medium">{formatAed(custody)}</div>
          </div>
          <div>
            <div className="text-blue-300">Revenue</div>
            <div className="font-medium">{formatAed(revenue)}</div>
          </div>
          <div>
            <div className="text-blue-300">Expenses</div>
            <div className="font-medium">{formatAed(expenses)}</div>
          </div>
        </div>
      </div>

      <div className={`grid bg-white text-xs ${role === "Employee" ? "grid-cols-5" : "grid-cols-4"}`}>
        <CustodyModal
          employeeId={employeeId}
          employeeName={name}
          mode="add"
          trigger={
            <div className="flex flex-col items-center gap-1 py-3 text-blue-600 hover:bg-slate-50 w-full">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 5L5 19M5 12v7h7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Add Custody
            </div>
          }
        />
        <CustodyModal
          employeeId={employeeId}
          employeeName={name}
          mode="withdraw"
          trigger={
            <div className="flex flex-col items-center gap-1 py-3 text-orange-600 hover:bg-slate-50 w-full">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 19L19 5M12 5h7v7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Withdraw Custody
            </div>
          }
        />
        {role === "Employee" && (
          <WithdrawRevenueModal
            employeeId={employeeId}
            employeeName={name}
            available={availableRevenue}
            trigger={
              <div className="flex flex-col items-center gap-1 py-3 text-purple-600 hover:bg-slate-50 w-full">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v14M6 11l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 21h16" strokeLinecap="round" />
                </svg>
                Withdraw Revenue
              </div>
            }
          />
        )}
        <Link
          href="/admin/expenses"
          className="flex flex-col items-center gap-1 py-3 text-red-500 hover:bg-slate-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 8l6 6 4-4 6 8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Add Expense
        </Link>
        <Link
          href="/admin/invoices/new"
          className="flex flex-col items-center gap-1 py-3 text-green-600 hover:bg-slate-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M8 9h8M8 13h5" strokeLinecap="round" />
          </svg>
          Invoice
        </Link>
      </div>
    </div>
  );
}
