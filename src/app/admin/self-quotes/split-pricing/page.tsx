import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { SplitPricingEditor } from "@/components/acquote/SplitPricingEditor";
import { loadConfig } from "@/lib/splitquote/service";
import { SPLIT_SLUG } from "@/lib/cms/splitPage";

export const dynamic = "force-dynamic";

export default async function SplitPricingPage() {
  await requireEmployee("ADMIN");
  let state: { config: Awaited<ReturnType<typeof loadConfig>>; page: { id: string; status: string; hasCalculator: boolean; hasFaq: boolean } | null } | null = null;
  try {
    const [config, row] = await Promise.all([loadConfig(), prisma.cmsPage.findFirst({ where: { slug: SPLIT_SLUG, deletedAt: null }, select: { id: true, status: true, draftBlocks: true } })]);
    const types = Array.isArray(row?.draftBlocks) ? (row.draftBlocks as { type?: string }[]).map((b) => b?.type) : [];
    state = { config, page: row ? { id: row.id, status: row.status, hasCalculator: types.includes("splitQuoteCalculator"), hasFaq: types.includes("faq") } : null };
  } catch {
    state = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Self-Service Quotations · Split AC pricing" />
      <div className="px-6 py-6">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Split AC pricing</h2>
        <p className="mb-5 max-w-3xl text-sm text-slate-500">Everything the Split AC installation page and its quotation calculator use: the packages and their prices by AC capacity, what is included and excluded, the optional extras, VAT, discount, validity and the texts printed on the quotation. Nothing is written in the website&apos;s code.</p>
        {state ? <SplitPricingEditor initial={state.config} page={state.page} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Self-service quotations need a database update that has not been applied yet.</p>}
      </div>
    </div>
  );
}
