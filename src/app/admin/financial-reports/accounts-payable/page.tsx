import { requireEmployee } from "@/lib/auth";
import { formatAed } from "@/lib/format";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { computeAccountsPayable } from "@/lib/financialReportsBalanceSheet";
import { formatAsAtTitle } from "@/lib/financialReportsCore";
import { AsOfDateControl } from "@/components/financial-reports/AsOfDateControl";
import { ReportPreview } from "@/components/financial-reports/ReportPreview";
import { ReportActions } from "@/components/financial-reports/ReportActions";
import { SignatoryBlock } from "@/components/financial-reports/SignatoryBlock";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const COMPANY_NAME = "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C";

export default async function AccountsPayablePage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  await requireEmployee("ADMIN");
  const { asOf } = await searchParams;
  const asOfDate = asOf ? new Date(asOf) : new Date();
  const total = computeAccountsPayable();

  return (
    <div className="pb-10">
      <AdminTopBar title="Accounts Payable" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Accounts Payable</h2>
        <p className="text-sm text-slate-500 mt-0.5">Amounts owed to suppliers/vendors — computed live.</p>

        <div className="mt-6">
          <AsOfDateControl asOf={toDateInputValue(asOfDate)} />
        </div>

        <div className="mb-4">
          <ReportActions targetId="ap-preview" fileName="accounts-payable" />
        </div>

        <ReportPreview id="ap-preview">
          <div className="text-slate-900">
            <div className="text-center mb-6">
              <div className="font-bold text-lg">{COMPANY_NAME}</div>
              <div className="font-semibold mt-1">ACCOUNTS PAYABLE</div>
              <div className="text-sm text-slate-600 mt-0.5">{formatAsAtTitle(asOfDate)}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="text-3xl font-bold text-slate-900">{formatAed(total)}</div>
              <p className="mt-3 text-sm text-slate-500">
                No outstanding vendor bills — this business&apos;s expenses are always recorded as already paid, so
                Accounts Payable is structurally AED 0 rather than a placeholder.
              </p>
            </div>

            <SignatoryBlock />
            <div data-pdf-spacer />
          </div>
        </ReportPreview>
      </div>
    </div>
  );
}
