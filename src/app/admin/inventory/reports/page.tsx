import Link from "next/link";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

const REPORTS = [
  {
    title: "Employee Inventory Report",
    description: "Received, used, returned, damaged, and current balance per item, per employee.",
    href: "/admin/inventory/employees",
  },
  {
    title: "Employee Usage Report",
    description: "Opening / Received / Used / Returned / Damaged / Closing, for a specific employee and month.",
    href: "/admin/inventory/reports/employee-usage",
  },
  {
    title: "Spare Parts Sales",
    description: "Revenue, cost, and profit per Spare Part invoice line.",
    href: "/admin/reports/spare-parts-sales",
  },
  {
    title: "Labour Sales",
    description: "Revenue per Labour invoice line.",
    href: "/admin/reports/labour-sales",
  },
  {
    title: "Price Modifications",
    description: "Every Spare Part/Labour line with a changed final price.",
    href: "/admin/reports/price-modifications",
  },
];

export default function StockReportsPage() {
  return (
    <div className="pb-10">
      <AdminTopBar title="Stock Reports" />
      <div className="px-6 py-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">Stock Reports</h2>
          <p className="text-sm text-slate-500 mt-0.5">Every inventory report in one place.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORTS.map((r) => (
            <Link key={r.href} href={r.href} className="rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
              <div className="font-semibold text-slate-900">{r.title}</div>
              <div className="text-sm text-slate-500 mt-0.5">{r.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
