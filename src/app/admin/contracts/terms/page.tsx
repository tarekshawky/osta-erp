import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { TermsEditor } from "@/components/contracts/TermsEditor";
import { loadGroups } from "@/lib/maintenance/data";
import { listTerms } from "@/lib/contracts/terms";

export const dynamic = "force-dynamic";

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  await requireEmployee("ADMIN");
  const { group = "" } = await searchParams;
  let state: { groups: { key: string; name: string }[]; versions: Awaited<ReturnType<typeof listTerms>>; groupKey: string } | null = null;
  try {
    const groups = await loadGroups();
    const groupKey = groups.some((g) => g.key === group) ? group : "";
    state = { groups: [{ key: "", name: "Default (every package page without its own set)" }, ...groups.map((g) => ({ key: g.key, name: g.nameEn }))], versions: await listTerms(groupKey), groupKey };
  } catch {
    state = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Contracts · Terms & Conditions" />
      <div className="px-6 py-6">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Terms &amp; Conditions</h2>
        <p className="mb-5 max-w-3xl text-sm text-slate-500">The legal terms every agreement is built from, in English and Arabic. A published version is never edited: to change the terms, create a new version and publish it. Each agreement keeps the exact text its customer accepted, so a new version only applies to new agreements. A package page can have its own set; otherwise the default is used.</p>
        {state ? <TermsEditor {...state} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Contracts need a database update that has not been applied yet.</p>}
      </div>
    </div>
  );
}
