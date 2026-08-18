import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AssetsManager } from "@/components/financial-reports/AssetsManager";
import type { AssetRow } from "@/components/financial-reports/AssetListCard";
import { computeAssetDepreciation } from "@/lib/financialReportsBalanceSheet";

export default async function AssetsPage() {
  await requireEmployee("ADMIN");
  const assets = await prisma.asset.findMany({ orderBy: { purchaseDate: "desc" } });
  const now = new Date();

  const rows: AssetRow[] = assets.map((a) => {
    const { accumulatedDepreciation, netBookValue } = computeAssetDepreciation(a, now);
    return {
      id: a.id,
      name: a.name,
      category: a.category,
      purchaseCost: a.purchaseCost,
      purchaseDate: a.purchaseDate.toISOString(),
      usefulLifeYears: a.usefulLifeYears,
      accumulatedDepreciation,
      netBookValue,
    };
  });

  return (
    <div className="pb-10">
      <AdminTopBar title="Asset Register" />
      <div className="px-6 py-6">
        <h2 className="text-2xl font-bold text-slate-900">Asset Register</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Property, Plant &amp; Equipment — feeds the Balance Sheet&apos;s Non-Current Assets line automatically.
        </p>
        <div className="mt-6">
          <AssetsManager assets={rows} />
        </div>
      </div>
    </div>
  );
}
