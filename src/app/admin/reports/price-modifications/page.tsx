import { requireEmployee } from "@/lib/auth";
import { formatAed, formatDateSlash } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { DateRangeFilter } from "@/components/financial-reports/DateRangeFilter";
import { getPriceModificationReport } from "@/lib/sparePartsReports";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function PriceModificationReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { from: fromParam, to: toParam } = await searchParams;
  const range = fromParam && toParam ? { from: new Date(fromParam), to: new Date(toParam) } : undefined;

  const report = await getPriceModificationReport(range);

  return (
    <div className="pb-10">
      <AdminTopBar title="Price Modification Report" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Price Modification Report</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Spare Part and Labour invoice lines whose final price was changed from the catalog price — for after-the-fact review
        </p>

        <div className="mt-6">
          <DateRangeFilter from={range ? toDateInputValue(range.from) : ""} to={range ? toDateInputValue(range.to) : ""} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <AdminStatCard label="Modified Lines" value={report.summary.count.toLocaleString()} />
          <AdminStatCard
            label="Net Difference"
            value={formatAed(report.summary.totalDifference)}
            valueClassName={report.summary.totalDifference >= 0 ? "text-green-600" : "text-red-500"}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium text-right">Original Price</th>
                <th className="px-4 py-3 font-medium text-right">Final Price</th>
                <th className="px-4 py-3 font-medium text-right">Difference</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.invoiceItemId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-900 font-medium whitespace-nowrap">{r.itemName}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.itemType === "SparePart" ? "Spare Part" : "Labour"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.employeeName}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatAed(r.originalPrice)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatAed(r.finalPrice)}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium whitespace-nowrap ${r.difference < 0 ? "text-red-500" : "text-green-600"}`}
                  >
                    {formatAed(r.difference)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateSlash(r.date)}</td>
                </tr>
              ))}
              {report.rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No price modifications in this period.
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
