import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { LiabilitiesManager } from "@/components/financial-reports/LiabilitiesManager";

export default async function LiabilitiesPage() {
  await requireEmployee("ADMIN");
  const liabilities = await prisma.liability.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="pb-10">
      <AdminTopBar title="Liability Register" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Liability Register</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Bank Borrowings and Other Payables — feeds the Balance Sheet&apos;s Liabilities section automatically.
        </p>
        <div className="mt-6">
          <LiabilitiesManager liabilities={liabilities} />
        </div>
      </div>
    </div>
  );
}
