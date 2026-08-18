import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ADMIN_EXPENSE_LINES, suggestTaxPeriod, formatPeriodTitle } from "@/lib/financialReportsCore";
import { DateRangeFilter } from "@/components/financial-reports/DateRangeFilter";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function ExpenseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { from: fromParam, to: toParam } = await searchParams;

  let from: Date;
  let to: Date;
  if (fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
  } else {
    const setting = await prisma.setting.findUnique({
      where: { id: SETTING_ID },
      select: { taxRegistrationEffectiveDate: true, firstTaxPeriodEnd: true },
    });
    const suggested = suggestTaxPeriod(setting ?? { taxRegistrationEffectiveDate: null, firstTaxPeriodEnd: null });
    from = suggested?.from ?? new Date(new Date().getFullYear(), 0, 1);
    to = suggested?.to ?? new Date();
  }

  const range = { from, to };
  const amounts = await Promise.all(ADMIN_EXPENSE_LINES.map((line) => line.compute(range)));
  const lines = ADMIN_EXPENSE_LINES.map((line, i) => ({ label: line.label, amount: amounts[i] }));
  const total = amounts.reduce((sum, a) => sum + a, 0);

  return (
    <div className="pb-10">
      <AdminTopBar title="Expense Report" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Expense Report</h2>
        <p className="text-sm text-slate-500 mt-0.5">Every Expense category, auto-classified — same figures as the Income Statement&apos;s expense section.</p>

        <div className="mt-6">
          <DateRangeFilter from={toDateInputValue(from)} to={toDateInputValue(to)} />
        </div>

        <div className="mb-4">
          <ReportActions
            targetId="expense-report-preview"
            fileName="expense-report"
            excelHref={`/admin/financial-reports/export?report=expense-report&from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`}
          />
        </div>

        <ReportPreview id="expense-report-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">EXPENSE REPORT</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatPeriodTitle(from, to)}</div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 text-left">
                  <th className="py-1.5 font-medium">Category</th>
                  <th className="py-1.5 font-medium text-right">Amount (AED)</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.label} className="border-b border-slate-100">
                    <td className="py-1.5">{line.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatAed(line.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5">TOTAL EXPENSES</td>
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
