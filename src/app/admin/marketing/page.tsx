import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { computeMarketingDashboard } from "@/lib/marketingData";

function formatRoi(roi: number | null) {
  return roi === null ? "—" : `${roi >= 0 ? "" : "-"}${Math.abs(roi).toFixed(1)}%`;
}

export default async function AdminMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;

  const [invoiceDates, data] = await Promise.all([
    prisma.invoice.findMany({ select: { date: true } }),
    computeMarketingDashboard(year, month),
  ]);
  const years = Array.from(new Set(invoiceDates.map((i) => i.date.getFullYear()))).sort((a, b) => b - a);

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Marketing"
        dateFilter={{ years, selectedYear: year ?? "all", selectedMonth: month ?? "all", basePath: "/admin/marketing" }}
      />

      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-5">Marketing Dashboard</h2>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <AdminStatCard label="Total Marketing Spend" value={formatAed(data.totalMarketingSpend)} valueClassName="text-red-500" />
          <AdminStatCard label="Total Customers" value={String(data.totalCustomers)} />
          <AdminStatCard label="Total Invoices" value={String(data.totalInvoices)} />
          <AdminStatCard label="Total Revenue" value={formatAed(data.totalRevenue)} valueClassName="text-green-600" />
          <AdminStatCard label="Net Revenue" value={formatAed(data.netRevenue)} valueClassName="text-blue-700" />
          <AdminStatCard label="ROI" value={formatRoi(data.roi)} valueClassName="text-purple-600" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Campaign Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium text-right">Total Spend</th>
                  <th className="px-4 py-3 font-medium text-right">Total Invoices</th>
                  <th className="px-4 py-3 font-medium text-right">Total Revenue</th>
                  <th className="px-4 py-3 font-medium text-right">Net Revenue</th>
                  <th className="px-4 py-3 font-medium text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.slug} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/marketing/${c.slug}${year || month ? `?${year ? `year=${year}` : ""}${year && month ? "&" : ""}${month ? `month=${month}` : ""}` : ""}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {c.campaign}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatAed(c.spend)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{c.invoiceCount}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatAed(c.revenue)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatAed(c.netRevenue)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{formatRoi(c.roi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
