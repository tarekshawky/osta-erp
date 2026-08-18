import { requireEmployee } from "@/lib/auth";
import { formatAed, formatDate } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { getAccountsReceivableDetail } from "@/lib/financialReportsBalanceSheet";
import { formatAsAtTitle } from "@/lib/financialReportsCore";
import { AsOfDateControl } from "@/components/financial-reports/AsOfDateControl";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function AccountsReceivablePage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { asOf } = await searchParams;
  const asOfDate = asOf ? new Date(asOf) : new Date();

  const { rows, total } = await getAccountsReceivableDetail(asOfDate);

  return (
    <div className="pb-10">
      <AdminTopBar title="Accounts Receivable" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Accounts Receivable</h2>
        <p className="text-sm text-slate-500 mt-0.5">Unpaid customer invoices — computed live.</p>

        <div className="mt-6">
          <AsOfDateControl asOf={toDateInputValue(asOfDate)} />
        </div>

        <div className="mb-4">
          <ReportActions
            targetId="ar-preview"
            fileName="accounts-receivable"
            excelHref={`/admin/financial-reports/export?report=accounts-receivable&asOf=${toDateInputValue(asOfDate)}`}
          />
        </div>

        <ReportPreview id="ar-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">ACCOUNTS RECEIVABLE</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatAsAtTitle(asOfDate)}</div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 text-left">
                  <th className="py-1.5 font-medium">Invoice #</th>
                  <th className="py-1.5 font-medium">Date</th>
                  <th className="py-1.5 font-medium">Customer</th>
                  <th className="py-1.5 font-medium text-right">Amount (AED)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-1.5">{r.number}</td>
                    <td className="py-1.5">{formatDate(r.date)}</td>
                    <td className="py-1.5">{r.customerName}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatAed(r.amount)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No unpaid invoices as at this date.
                    </td>
                  </tr>
                )}
                <tr className="font-semibold border-t border-slate-300">
                  <td className="py-1.5" colSpan={3}>
                    TOTAL ACCOUNTS RECEIVABLE
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
