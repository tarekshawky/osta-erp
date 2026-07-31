import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { unslugifyLeadSource, computeCampaignDetail } from "@/lib/marketingData";

function formatRoi(roi: number | null) {
  return roi === null ? "—" : `${roi >= 0 ? "" : "-"}${Math.abs(roi).toFixed(1)}%`;
}

export default async function AdminMarketingCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaign: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { campaign: campaignSlug } = await params;
  const { year: yearParam, month: monthParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;
  const month = monthParam ? Number(monthParam) : null;

  const campaign = unslugifyLeadSource(campaignSlug);
  if (!campaign) notFound();

  const [invoiceDates, data] = await Promise.all([
    prisma.invoice.findMany({ select: { date: true } }),
    computeCampaignDetail(campaign, year, month),
  ]);
  const years = Array.from(new Set(invoiceDates.map((i) => i.date.getFullYear()))).sort((a, b) => b - a);

  return (
    <div className="pb-10">
      <AdminTopBar
        title="Marketing"
        dateFilter={{
          years,
          selectedYear: year ?? "all",
          selectedMonth: month ?? "all",
          basePath: `/admin/marketing/${campaignSlug}`,
        }}
      />

      <div className="px-6 py-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/marketing" className="text-sm text-slate-400 hover:text-slate-600">
            Marketing
          </Link>
          <span className="text-sm text-slate-300">/</span>
          <span className="text-sm text-slate-600">{campaign}</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-5">{campaign} Campaign</h2>

        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Marketing Expenses</h3>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Payment Method</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 text-slate-700">{e.description}</td>
                      <td className="px-4 py-3 text-slate-700">{e.payment}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatAed(e.amount)}</td>
                    </tr>
                  ))}
                  {data.expenses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No marketing expenses recorded for this campaign.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end pr-1 mb-6">
            <span className="text-sm text-slate-500 mr-2">Total Marketing Spend</span>
            <span className="text-sm font-bold text-slate-900">{formatAed(data.totalMarketingSpend)}</span>
          </div>

          <h3 className="font-semibold text-slate-900 mb-3">Generated Invoices</h3>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Invoice No</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium text-right">Grand Total</th>
                    <th className="px-4 py-3 font-medium">Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-blue-600 hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3 text-slate-700">{inv.customerName}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatAed(inv.grandTotal)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                  {data.invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No invoices generated from this campaign yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-6 pr-1 mb-6 text-sm">
            <div>
              <span className="text-slate-500 mr-2">Total Invoices</span>
              <span className="font-bold text-slate-900">{data.totalInvoices}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-2">Total Revenue</span>
              <span className="font-bold text-slate-900">{formatAed(data.totalRevenue)}</span>
            </div>
          </div>

          <h3 className="font-semibold text-slate-900 mb-3">Performance Summary</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <AdminStatCard label="Marketing Spend" value={formatAed(data.totalMarketingSpend)} valueClassName="text-red-500" />
            <AdminStatCard label="Revenue Generated" value={formatAed(data.totalRevenue)} valueClassName="text-green-600" />
            <AdminStatCard label="Net Revenue" value={formatAed(data.netRevenue)} valueClassName="text-blue-700" />
            <AdminStatCard label="Number of Customers" value={String(data.numberOfCustomers)} />
            <AdminStatCard label="Number of Invoices" value={String(data.totalInvoices)} />
            <AdminStatCard label="Average Invoice Value" value={formatAed(data.averageInvoiceValue)} />
            <AdminStatCard label="ROI" value={formatRoi(data.roi)} valueClassName="text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
