import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { visibleNav } from "@/lib/adminNav";
import { getSystem, SYSTEM_META, TONES, toneOfSystem } from "@/lib/adminSystems";
import { getSystemOverview } from "@/lib/systemOverview";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { PageInsight } from "@/components/admin/PageInsight";
import { ModuleIcon } from "@/components/admin/ModuleIcon";

export default async function SystemOverviewPage({ params }: { params: Promise<{ system: string }> }) {
  const { system: id } = await params;
  const group = getSystem(id);
  if (!group) notFound();

  const admin = await requireEmployee("ADMIN");
  // Only systems with a page this admin may open; otherwise back to the dashboard.
  const visible = visibleNav(admin.adminSections, admin.role === "SUPER_ADMIN").groups.find((g) => g.id === id);
  if (!visible) redirect("/admin");

  const overview = await getSystemOverview(id).catch(() => null);
  const tone = TONES[toneOfSystem(id)];

  return (
    <div className="pb-10">
      <AdminTopBar title={group.label} hideMonth />
      <div className="flex items-center gap-3 px-6 pt-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: tone.tile, color: tone.text }}>
          <ModuleIcon name={group.icon} size={24} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{group.label}</h2>
          <p className="text-sm text-slate-500">{SYSTEM_META[id]?.text}</p>
        </div>
      </div>

      {overview && (
        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {overview.stats.map((s) => (
              <AdminStatCard key={s.label} {...s} />
            ))}
          </div>
        </div>
      )}

      {overview?.insights.map((kind) => (
        <PageInsight key={kind} kind={kind} />
      ))}

      {overview?.recent && overview.recent.rows.length > 0 && (
        <section className="mx-6 mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{overview.recent.title}</h3>
            <Link href={overview.recent.href} className="text-xs font-medium text-blue-600 hover:underline">View all</Link>
          </div>
          <ul className="mt-2 divide-y divide-slate-100">
            {overview.recent.rows.map((r, i) => {
              const inner = (
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{r.primary}</div>
                    {r.secondary && <div className="truncate text-xs text-slate-500">{r.secondary}</div>}
                  </div>
                  {r.right && <div className="shrink-0 text-xs text-slate-500">{r.right}</div>}
                </div>
              );
              return <li key={i}>{r.href ? <Link href={r.href} className="block hover:bg-slate-50">{inner}</Link> : inner}</li>;
            })}
          </ul>
        </section>
      )}

      <section className="px-6 pt-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.items.map((i) => (
            <Link key={i.href} href={i.href} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-shadow hover:shadow-md">
              {i.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
