import { prisma } from "@/lib/prisma";
import { guardPermission } from "@/lib/adminGuard";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

function summarize(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const text = JSON.stringify(value);
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  const guard = await guardPermission("audit.view");
  const { entity } = await searchParams;

  if (!guard.ok) {
    return (
      <div className="pb-10">
        <AdminTopBar title="Audit Log" />
        <p className="px-6 py-6 text-sm text-slate-500">{guard.error}</p>
      </div>
    );
  }

  const [entries, entities] = await Promise.all([
    prisma.auditLog.findMany({ where: entity ? { entity } : undefined, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
  ]);

  return (
    <div className="pb-10">
      <AdminTopBar title="Audit Log" />
      <div className="px-6 py-6">
        <h2 className="mb-2 text-2xl font-bold text-slate-900">Audit Log</h2>
        <p className="mb-4 text-sm text-slate-500">Who changed what, and when. Showing the latest 200 entries.</p>

        <div className="mb-4 flex flex-wrap gap-2">
          <a href="/admin/audit-log" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${!entity ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
            All
          </a>
          {entities.map((e) => (
            <a
              key={e.entity}
              href={`/admin/audit-log?entity=${encodeURIComponent(e.entity)}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${entity === e.entity ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {e.entity}
            </a>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Before</th>
                <th className="px-4 py-3">After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Nothing recorded yet.
                  </td>
                </tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{stamp(e.createdAt)}</td>
                  <td className="px-4 py-2.5 text-slate-800">{e.actorName ?? "—"}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{e.action}</td>
                  <td className="max-w-xs break-words px-4 py-2.5 font-mono text-[11px] text-slate-500">{summarize(e.before)}</td>
                  <td className="max-w-xs break-words px-4 py-2.5 font-mono text-[11px] text-slate-500">{summarize(e.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
