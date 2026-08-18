import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { formatAsAtTitle } from "@/lib/financialReportsCore";
import { AsOfDateControl } from "@/components/financial-reports/AsOfDateControl";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function LiabilityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { asOf } = await searchParams;
  const asOfDate = asOf ? new Date(asOf) : new Date();

  const liabilities = await prisma.liability.findMany({ where: { createdAt: { lte: asOfDate } }, orderBy: { createdAt: "asc" } });
  const total = liabilities.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="pb-10">
      <AdminTopBar title="Liability Report" />
      <div className="px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Liability Report</h2>
            <p className="text-sm text-slate-500 mt-0.5">Bank Borrowings and Other Payables registered in the system.</p>
          </div>
          <Link href="/admin/financial-reports/liabilities" className="no-print text-sm font-medium text-blue-600 hover:text-blue-700">
            Manage Liabilities →
          </Link>
        </div>

        <div className="mt-6">
          <AsOfDateControl asOf={toDateInputValue(asOfDate)} />
        </div>

        <div className="mb-4">
          <ReportActions
            targetId="liability-report-preview"
            fileName="liability-report"
            excelHref={`/admin/financial-reports/export?report=liability-report&asOf=${toDateInputValue(asOfDate)}`}
          />
        </div>

        <ReportPreview id="liability-report-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">LIABILITY REPORT</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatAsAtTitle(asOfDate)}</div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 text-left">
                  <th className="py-1.5 font-medium">Liability</th>
                  <th className="py-1.5 font-medium">Type</th>
                  <th className="py-1.5 font-medium">Category</th>
                  <th className="py-1.5 font-medium text-right">Amount (AED)</th>
                </tr>
              </thead>
              <tbody>
                {liabilities.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="py-1.5">{l.name}</td>
                    <td className="py-1.5">{l.type}</td>
                    <td className="py-1.5">{l.category}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatAed(l.amount)}</td>
                  </tr>
                ))}
                {liabilities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No liabilities registered as at this date.
                    </td>
                  </tr>
                )}
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5" colSpan={3}>
                    TOTAL LIABILITIES
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(total)}</td>
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
