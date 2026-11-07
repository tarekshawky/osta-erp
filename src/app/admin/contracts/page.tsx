import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { ContractsList, type ContractRow } from "@/components/contracts/ContractsList";
import type { ContractSnapshot } from "@/lib/contracts/snapshot";
import { displayStatus, tabOf } from "@/lib/contracts/workflow";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  await requireEmployee("ADMIN");
  let rows: ContractRow[] | null = null;
  let renewalWindowDays = 60;
  try {
    const [list, settings] = await Promise.all([
      prisma.contract.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.contractSettings.findUnique({ where: { id: "default" } }),
    ]);
    renewalWindowDays = settings?.renewalWindowDays ?? 60;
    rows = list.map((c) => {
      const s = c.snapshot as unknown as ContractSnapshot;
      return {
        id: c.id, number: c.number, requestNumber: c.requestNumber, version: c.version, status: displayStatus(c), tab: tabOf(c), customer: s.customer.name, phone: s.customer.phone,
        packageName: s.package.nameEn, total: s.pricing.total, quote: s.pricing.quote, createdAt: c.createdAt.toISOString(), expiryDate: c.expiryDate?.toISOString() ?? null, paid: c.paymentStatus === "paid",
      };
    });
  } catch {
    rows = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Contracts & Agreements" />
      <div className="px-6 py-6">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Contracts &amp; Agreements</h2>
        <p className="mb-5 max-w-3xl text-sm text-slate-500">Every maintenance package a customer confirms becomes a Maintenance Service Agreement here. Review it, approve it and send the payment link, record the payment, and the final PDF is issued and the agreement activated.</p>
        {rows ? <ContractsList rows={rows} renewalWindowDays={renewalWindowDays} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Contracts need a database update that has not been applied yet.</p>}
      </div>
    </div>
  );
}
