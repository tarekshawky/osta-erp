import { requireEmployee } from "@/lib/auth";
import { formatAed, formatDateSlash } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { DateRangeFilter } from "@/components/financial-reports/DateRangeFilter";
import { getSparePartsSalesReport } from "@/lib/sparePartsReports";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function SparePartsSalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { from: fromParam, to: toParam } = await searchParams;
  const range = fromParam && toParam ? { from: new Date(fromParam), to: new Date(toParam) } : undefined;

  const report = await getSparePartsSalesReport(range);

  return (
    <div className="pb-10">
      <AdminTopBar title="Spare Parts Sales Report" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Spare Parts Sales Report</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Every SparePart-type invoice line — item, quantity, pricing, cost, revenue and profit
        </p>

        <div className="mt-6">
          <DateRangeFilter from={range ? toDateInputValue(range.from) : ""} to={range ? toDateInputValue(range.to) : ""} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <AdminStatCard label="Total Quantity Sold" value={report.summary.totalQuantity.toLocaleString()} />
          <AdminStatCard label="Total Revenue" value={formatAed(report.summary.totalRevenue)} valueClassName="text-green-600" />
          <AdminStatCard
            label="Total Profit"
            value={formatAed(report.summary.totalProfit)}
            valueClassName={report.summary.totalProfit >= 0 ? "text-green-600" : "text-red-500"}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-right">Original Price</th>
                <th className="px-4 py-3 font-medium text-right">Final Price</th>
                <th className="px-4 py-3 font-medium text-right">Purchase Cost</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Profit</th>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.invoiceItemId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-900 font-medium whitespace-nowrap">{r.itemName}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.category ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatAed(r.originalPrice)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatAed(r.finalPrice)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                    {r.purchaseCost != null ? formatAed(r.purchaseCost) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium whitespace-nowrap">{formatAed(r.revenue)}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium whitespace-nowrap ${r.profit >= 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    {formatAed(r.profit)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.employeeName}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.branchName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateSlash(r.date)}</td>
                </tr>
              ))}
              {report.rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                    No Spare Part sales in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
