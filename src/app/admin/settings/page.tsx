import { requireEmployee } from "@/lib/auth";
import { getLogoSrc, getCertificateLogoSrc, SETTING_ID } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { getCashPosition } from "@/app/actions/cashPosition";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { LogoSettingsForm } from "./LogoSettingsForm";
import { TaxInformationForm } from "./TaxInformationForm";
import { EquitySignatoryForm } from "./EquitySignatoryForm";
import { CashPositionForm } from "./CashPositionForm";

export default async function AdminSettingsPage() {
  await requireEmployee("ADMIN");
  const [logoSrc, certificateLogoSrc, setting, cashPosition, employees] = await Promise.all([
    getLogoSrc(),
    getCertificateLogoSrc(),
    prisma.setting.findUnique({ where: { id: SETTING_ID } }),
    getCashPosition(),
    prisma.employee.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="pb-10">
      <AdminTopBar title="Settings" />
      <div className="px-6 py-6 max-w-lg">
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage company branding</p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Company Logo</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Shown on the dashboard sidebar, invoices, and quotations.
          </p>
          <LogoSettingsForm currentSrc={logoSrc} kind="main" />
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Warranty Certificate Logo</h3>
          <p className="text-sm text-slate-500 mt-0.5">Shown on warranty certificates only.</p>
          <LogoSettingsForm currentSrc={certificateLogoSrc} kind="certificate" />
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Tax Information</h3>
          <p className="text-sm text-slate-500 mt-0.5">From the company&apos;s corporate tax registration certificate.</p>
          <TaxInformationForm
            taxRegistrationNumber={setting?.taxRegistrationNumber ?? null}
            taxRegistrationEffectiveDate={setting?.taxRegistrationEffectiveDate ?? null}
            taxCertificateIssueDate={setting?.taxCertificateIssueDate ?? null}
            firstTaxPeriodStart={setting?.firstTaxPeriodStart ?? null}
            firstTaxPeriodEnd={setting?.firstTaxPeriodEnd ?? null}
            firstTaxReturnFilingDueDate={setting?.firstTaxReturnFilingDueDate ?? null}
          />
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Equity & Signatory</h3>
          <p className="text-sm text-slate-500 mt-0.5">Feeds the Balance Sheet&apos;s Equity section and every report&apos;s signature block.</p>
          <EquitySignatoryForm
            shareCapital={setting?.shareCapital ?? null}
            statutoryReserves={setting?.statutoryReserves ?? null}
            signatoryName={setting?.signatoryName ?? null}
            signatoryDesignation={setting?.signatoryDesignation ?? null}
            shareholderEmployeeId={setting?.shareholderEmployeeId ?? null}
            employees={employees}
          />
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Cash Position</h3>
          <p className="text-sm text-slate-500 mt-0.5">Opening cash balance for the Balance Sheet&apos;s Cash &amp; Cash Equivalents line.</p>
          <CashPositionForm openingBalance={cashPosition?.openingBalance ?? 0} openingDate={cashPosition?.openingDate ?? null} />
        </div>
      </div>
    </div>
  );
}
