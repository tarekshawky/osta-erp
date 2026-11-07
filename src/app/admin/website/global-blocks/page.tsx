import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { GlobalBlocksManager } from "@/components/cms/GlobalBlocksManager";
import { listGlobalBlocks, type GlobalBlockRow } from "../global-blocks-actions";

export default async function GlobalBlocksPage() {
  await requireEmployee("ADMIN");
  let rows: GlobalBlockRow[] = [];
  let ready = true;
  try {
    rows = await listGlobalBlocks();
  } catch {
    ready = false;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Global Blocks" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Global blocks</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Reusable blocks such as your booking button, WhatsApp banner or “Why choose Osta”. Add one to any page as <strong>linked</strong> and a single edit here updates every page that uses it.</p>
        {ready ? <GlobalBlocksManager rows={rows} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Global Blocks need a database update that has not been applied yet.</p>}
      </div>
    </div>
  );
}
