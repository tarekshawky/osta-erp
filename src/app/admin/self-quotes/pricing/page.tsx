import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { PricingEditor } from "@/components/acquote/PricingEditor";
import { loadConfig } from "@/lib/acquote/service";
import { DUCTED_SLUG } from "@/lib/cms/ductedPage";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  await requireEmployee("ADMIN");
  let state: { config: Awaited<ReturnType<typeof loadConfig>>; page: { id: string; status: string } | null } | null = null;
  try {
    const [config, page] = await Promise.all([loadConfig(), prisma.cmsPage.findFirst({ where: { slug: DUCTED_SLUG, deletedAt: null }, select: { id: true, status: true } })]);
    state = { config, page };
  } catch {
    state = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Self-Service Quotations · Pricing & Packages" />
      <div className="px-6 py-6">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Pricing &amp; Packages</h2>
        <p className="mb-5 max-w-3xl text-sm text-slate-500">One price list for the whole calculator. A change shows on the website and in every NEW quotation straight away. Quotations that were already created keep the prices they were issued with.</p>
        {state ? <PricingEditor initial={state.config} page={state.page} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Self-service quotations need a database update that has not been applied yet.</p>}
      </div>
    </div>
  );
}
