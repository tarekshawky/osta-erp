import { requireEmployee } from "@/lib/auth";
import { getLogoSrc, getCertificateLogoSrc } from "@/lib/settings";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { LogoSettingsForm } from "./LogoSettingsForm";

export default async function AdminSettingsPage() {
  await requireEmployee("ADMIN");
  const [logoSrc, certificateLogoSrc] = await Promise.all([getLogoSrc(), getCertificateLogoSrc()]);

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
      </div>
    </div>
  );
}
