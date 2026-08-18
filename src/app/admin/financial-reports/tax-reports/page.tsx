import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { computeIncomeStatement } from "@/lib/financialReportsIncomeStatement";
import { CORPORATE_TAX_RATE, CORPORATE_TAX_EXEMPT_THRESHOLD } from "@/lib/reportData";
import { suggestTaxPeriod, formatPeriodTitle } from "@/lib/financialReportsCore";
import { DateRangeFilter } from "@/components/financial-reports/DateRangeFilter";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function TaxReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { from: fromParam, to: toParam } = await searchParams;

  const setting = await prisma.setting.findUnique({
    where: { id: SETTING_ID },
    select: {
      taxRegistrationNumber: true,
      taxRegistrationEffectiveDate: true,
      taxCertificateIssueDate: true,
      firstTaxPeriodStart: true,
      firstTaxPeriodEnd: true,
      firstTaxReturnFilingDueDate: true,
    },
  });

  let from: Date;
  let to: Date;
  if (fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
  } else {
    const suggested = suggestTaxPeriod(setting ?? { taxRegistrationEffectiveDate: null, firstTaxPeriodEnd: null });
    from = suggested?.from ?? new Date(new Date().getFullYear(), 0, 1);
    to = suggested?.to ?? new Date();
  }

  const incomeStatement = await computeIncomeStatement({ from, to });

  return (
    <div className="pb-10">
      <AdminTopBar title="Tax Reports" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Tax Reports</h2>
        <p className="text-sm text-slate-500 mt-0.5">Corporate Tax computation — from the same Income Statement engine.</p>

        <div className="mt-6">
          <DateRangeFilter from={toDateInputValue(from)} to={toDateInputValue(to)} />
        </div>

        <div className="mb-4">
          <ReportActions
            targetId="tax-report-preview"
            fileName="tax-report"
            excelHref={`/admin/financial-reports/export?report=tax-reports&from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`}
          />
        </div>

        <ReportPreview id="tax-report-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">TAX REPORT</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatPeriodTitle(from, to)}</div>
            </div>

            <div className="font-semibold mb-2">Corporate Tax Registration</div>
            <table className="w-full text-sm mb-6">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Tax Registration Number</td>
                  <td className="py-1.5 text-right">{setting?.taxRegistrationNumber || "—"}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Tax Registration Effective Date</td>
                  <td className="py-1.5 text-right">{setting?.taxRegistrationEffectiveDate ? formatDate(setting.taxRegistrationEffectiveDate) : "—"}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Certificate Issue Date</td>
                  <td className="py-1.5 text-right">{setting?.taxCertificateIssueDate ? formatDate(setting.taxCertificateIssueDate) : "—"}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">First Corporate Tax Period</td>
                  <td className="py-1.5 text-right">
                    {setting?.firstTaxPeriodStart && setting?.firstTaxPeriodEnd
                      ? `${formatDate(setting.firstTaxPeriodStart)} — ${formatDate(setting.firstTaxPeriodEnd)}`
                      : "—"}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">First Tax Return Filing Due Date</td>
                  <td className="py-1.5 text-right">{setting?.firstTaxReturnFilingDueDate ? formatDate(setting.firstTaxReturnFilingDueDate) : "—"}</td>
                </tr>
              </tbody>
            </table>

            <div className="font-semibold mb-2">Corporate Tax Computation</div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Profit Before Tax</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(incomeStatement.profitBeforeTax)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Tax-Exempt Threshold</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(CORPORATE_TAX_EXEMPT_THRESHOLD)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5">Corporate Tax Rate</td>
                  <td className="py-1.5 text-right tabular-nums">{(CORPORATE_TAX_RATE * 100).toFixed(0)}%</td>
                </tr>
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5">Corporate Tax Expense</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(incomeStatement.corporateTaxExpense)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-1.5">Profit For The Period (After Tax)</td>
                  <td className="py-1.5 text-right tabular-nums">{formatAed(incomeStatement.profitForPeriod)}</td>
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
