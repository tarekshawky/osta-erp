import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ContractSettingsForm } from "@/components/contracts/ContractSettingsForm";

export const dynamic = "force-dynamic";

export default async function ContractSettingsPage() {
  await requireEmployee("ADMIN");
  const s = await prisma.contractSettings.findUnique({ where: { id: "default" } }).catch(() => undefined);
  return (
    <div className="pb-10">
      <AdminTopBar title="Contracts · Payment settings" />
      <div className="px-6 py-6">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Payment settings</h2>
        <p className="mb-5 max-w-3xl text-sm text-slate-500">No online payment gateway is connected yet. Until one is, an approved agreement&rsquo;s page tells the customer how to pay with the instructions below, and you record the payment here in the ERP, which activates the agreement.</p>
        {s === undefined ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Contracts need a database update that has not been applied yet.</p> : <ContractSettingsForm initial={{ paymentInstructionsEn: s?.paymentInstructionsEn ?? "", paymentInstructionsAr: s?.paymentInstructionsAr ?? "", renewalWindowDays: s?.renewalWindowDays ?? 60 }} />}
      </div>
    </div>
  );
}
