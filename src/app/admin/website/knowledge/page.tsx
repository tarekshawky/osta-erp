import { requireEmployee } from "@/lib/auth";
import { guardPermission } from "@/lib/adminGuard";
import { KnowledgeCenter } from "@/components/knowledge/KnowledgeCenter";
import { loadKnowledgeCenter, type KnowledgeCenterData } from "@/lib/knowledge/data";

export default async function KnowledgePage() {
  await requireEmployee("ADMIN");
  const guard = await guardPermission("pages.publish");
  let data: KnowledgeCenterData | null = null;
  try {
    data = await loadKnowledgeCenter();
  } catch (error) {
    // The two Knowledge Center tables are created by `prisma db push`; until then say so instead of showing an error page.
    if (!(error && typeof error === "object" && "code" in error && error.code === "P2021")) throw error;
  }
  return (
    <div className="px-4 pb-10 pt-6 sm:px-6">
      <h1 className="text-3xl font-bold text-[#10163a]">AI Knowledge Center</h1>
      <p className="mt-1 text-sm text-[#6b7399]">Everything about Osta that assistants and customers can rely on</p>
      {data ? (
        <KnowledgeCenter data={data} canPublish={guard.ok} />
      ) : (
        <p className="mt-6 rounded-3xl bg-white p-6 text-sm text-[#10163a] shadow-lg shadow-indigo-900/5">The database tables for this screen are not there yet. Run <code className="rounded bg-slate-100 px-1.5 py-0.5">npx prisma db push</code>, then reload.</p>
      )}
    </div>
  );
}
