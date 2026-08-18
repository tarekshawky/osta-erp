import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

type ReportLink = { href: string; label: string; description: string };

const GROUPS: { title: string; items: ReportLink[] }[] = [
  {
    title: "Statements",
    items: [
      { href: "/admin/financial-reports/balance-sheet", label: "Statement of Financial Position", description: "Balance Sheet — Assets, Liabilities, Equity" },
      { href: "/admin/financial-reports/income-statement", label: "Statement of Comprehensive Income", description: "Income Statement — Revenue, Expenses, Profit" },
      { href: "/admin/financial-reports/cash-flow", label: "Cash Flow Statement", description: "Operating, Investing, Financing activities" },
    ],
  },
  {
    title: "Ledgers",
    items: [
      { href: "/admin/financial-reports/general-ledger", label: "General Ledger", description: "Per-account transaction detail with running balance" },
      { href: "/admin/financial-reports/trial-balance", label: "Trial Balance", description: "Debit/credit totals by account — always ties out" },
    ],
  },
  {
    title: "Position Reports",
    items: [
      { href: "/admin/financial-reports/accounts-receivable", label: "Accounts Receivable", description: "Unpaid customer invoices" },
      { href: "/admin/financial-reports/accounts-payable", label: "Accounts Payable", description: "Amounts owed to suppliers" },
      { href: "/admin/financial-reports/expense-report", label: "Expense Report", description: "Every expense category, auto-classified" },
      { href: "/admin/financial-reports/revenue-report", label: "Revenue Report", description: "Revenue by source and payment method" },
      { href: "/admin/financial-reports/asset-report", label: "Asset Report", description: "Property, Plant & Equipment with depreciation" },
      { href: "/admin/financial-reports/liability-report", label: "Liability Report", description: "Bank Borrowings and Other Payables" },
      { href: "/admin/financial-reports/equity-report", label: "Equity Report", description: "Share Capital, Reserves, Retained Earnings" },
      { href: "/admin/financial-reports/tax-reports", label: "Tax Reports", description: "Corporate Tax registration and computation" },
    ],
  },
  {
    title: "Registers",
    items: [
      { href: "/admin/financial-reports/assets", label: "Manage Assets", description: "Add, edit, and remove Property, Plant & Equipment" },
      { href: "/admin/financial-reports/liabilities", label: "Manage Liabilities", description: "Add, edit, and remove Bank Borrowings and Other Payables" },
    ],
  },
];

export default async function FinancialReportsHubPage() {
  await requireEmployee("ADMIN");

  return (
    <div className="pb-10">
      <AdminTopBar title="Financial Reports" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Financial Reports</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Every figure is computed live from Invoices, Expenses, Assets, Liabilities, and Payroll — never a static number.
        </p>

        {GROUPS.map((group) => (
          <div key={group.title} className="mt-6">
            <h3 className="font-semibold text-slate-900">{group.title}</h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50 hover:border-slate-300"
                >
                  <div className="font-semibold text-slate-900">{item.label}</div>
                  <div className="text-sm text-slate-500 mt-1">{item.description}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
