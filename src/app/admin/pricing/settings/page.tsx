import { prisma } from "@/lib/prisma";
import { filsToAed } from "@/lib/pricing/money";
import { TaxForm, VisitFeeForm } from "@/components/pricing/SettingsForms";

export default async function PricingSettingsPage() {
  const [tax, policies] = await Promise.all([
    prisma.taxSetting.findUnique({ where: { id: "default" } }),
    prisma.visitFeePolicy.findMany({ orderBy: { version: "desc" } }),
  ]);
  const latest = policies[0];

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-900">Tax (VAT)</h2>
        <TaxForm rate={String(tax?.vatRatePercent ?? 5)} includeVat={tax?.pricesIncludeVat ?? true} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-900">Visit fee policy</h2>
        {latest ? (
          <VisitFeeForm
            version={latest.version}
            initial={{
              amountAed: filsToAed(latest.amountFils),
              textAr: latest.textAr,
              textEn: latest.textEn,
              consentLabelAr: latest.consentLabelAr,
              consentLabelEn: latest.consentLabelEn,
              reasons: latest.reasons,
              requiresAdminReview: latest.requiresAdminReview,
            }}
          />
        ) : (
          <p className="text-sm text-slate-500">Run the pricing seed to create the first policy.</p>
        )}
        {policies.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Version history</h3>
            {policies.map((p) => (
              <div key={p.id} className="flex justify-between py-1 text-sm text-slate-700">
                <span>v{p.version} · {filsToAed(p.amountFils)} AED</span>
                <span className="text-slate-400">{p.createdAt.toISOString().slice(0, 10)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
