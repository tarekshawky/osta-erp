import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { DuctPricingEditor } from "@/components/acquote/DuctPricingEditor";
import { loadConfig } from "@/lib/ductwork/service";
import { DUCT_SLUG } from "@/lib/cms/ductPage";

export const dynamic = "force-dynamic";

export default async function DuctworkPricingPage() {
  await requireEmployee("ADMIN");
  let state: { config: Awaited<ReturnType<typeof loadConfig>>; page: { id: string; status: string; hasBlock: boolean } | null } | null = null;
  try {
    const [config, row] = await Promise.all([loadConfig(), prisma.cmsPage.findFirst({ where: { slug: DUCT_SLUG, deletedAt: null }, select: { id: true, status: true, draftBlocks: true } })]);
    const hasBlock = Array.isArray(row?.draftBlocks) && (row.draftBlocks as { type?: string }[]).some((b) => b?.type === "ductQuoteCalculator");
    state = { config, page: row ? { id: row.id, status: row.status, hasBlock } : null };
  } catch {
    state = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Self-Service Quotations · Ductwork pricing" />
      <div className="px-6 py-6">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Ductwork pricing</h2>
        <p className="mb-5 max-w-3xl text-sm text-slate-500">Everything the HVAC ductwork quotation calculator uses: the duct systems and their rates, the work modes, accessories, services, technical options, discount, VAT and the texts printed on the quotation.</p>
        {state ? <DuctPricingEditor initial={state.config} page={state.page} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Self-service quotations need a database update that has not been applied yet.</p>}
      </div>
    </div>
  );
}
