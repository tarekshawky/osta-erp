import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { computeAssetDepreciation } from "@/lib/financialReportsBalanceSheet";
import { formatAsAtTitle } from "@/lib/financialReportsCore";
import { AsOfDateControl } from "@/components/financial-reports/AsOfDateControl";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function AssetReportPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { asOf } = await searchParams;
  const asOfDate = asOf ? new Date(asOf) : new Date();

  const assets = await prisma.asset.findMany({ where: { purchaseDate: { lte: asOfDate } }, orderBy: { purchaseDate: "asc" } });
  const rows = assets.map((a) => ({ ...a, ...computeAssetDepreciation(a, asOfDate) }));
  const totalCost = rows.reduce((sum, r) => sum + r.purchaseCost, 0);
  const totalDepreciation = rows.reduce((sum, r) => sum + r.accumulatedDepreciation, 0);
  const totalNetBookValue = rows.reduce((sum, r) => sum + r.netBookValue, 0);

  return (
    <div className="pb-10">
      <AdminTopBar title="Asset Report" />
      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Asset Report</h2>
            <p className="text-sm text-slate-500 mt-0.5">Property, Plant &amp; Equipment with straight-line depreciation.</p>
          </div>
          <Link href="/admin/financial-reports/assets" className="no-print text-sm font-medium text-blue-600 hover:text-blue-700">
            Manage Assets →
          </Link>
        </div>

        <div className="mt-6">
          <AsOfDateControl asOf={toDateInputValue(asOfDate)} />
        </div>

        <div className="mb-4">
          <ReportActions
            targetId="asset-report-preview"
            fileName="asset-report"
            excelHref={`/admin/financial-reports/export?report=asset-report&asOf=${toDateInputValue(asOfDate)}`}
          />
        </div>

        <ReportPreview id="asset-report-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">ASSET REPORT</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatAsAtTitle(asOfDate)}</div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 text-left">
                  <th className="py-1.5 font-medium">Asset</th>
                  <th className="py-1.5 font-medium">Purchased</th>
                  <th className="py-1.5 font-medium text-right">Cost</th>
                  <th className="py-1.5 font-medium text-right">Accum. Depreciation</th>
                  <th className="py-1.5 font-medium text-right">Net Book Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-1.5">
                      {r.name}
                      <div className="text-xs text-slate-400">{r.category}</div>
                    </td>
                    <td className="py-1.5">{formatDate(r.purchaseDate)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatAed(r.purchaseCost)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatAed(r.accumulatedDepreciation)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatAed(r.netBookValue)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No assets registered as at this date.
                    </td>
                  </tr>
                )}
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(totalCost)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(totalDepreciation)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(totalNetBookValue)}</td>
                </tr>
              </tbody>
            </table>

            <SignatoryBlock />
            <div data-pdf-spacer />
          </div>
        </ReportPreview>
      </div>
    </div>
  );
}
