import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { MaintenanceManager } from "@/components/cms/MaintenanceManager";
import { asLines, loadGroups, loadSettings, toPkg } from "@/lib/maintenance/data";

export default async function MaintenancePackagesPage() {
  await requireEmployee("ADMIN");
  type Pk = ReturnType<typeof toPkg> & { groupId: string | null };
  let data: { packages: Pk[]; active: Record<string, boolean>; services: { id: string; nameEn: string; nameAr: string; showInComparison: boolean; groupId: string | null }[]; settings: Awaited<ReturnType<typeof loadSettings>>; groups: Awaited<ReturnType<typeof loadGroups>>; requests: Request[] } | null = null;
  type Request = { id: string; packageName: string; packagePrice: number | null; kind: string; groupKey: string; company: string; message: string; name: string; phone: string; email: string; emirate: string; location: string; propertyType: string; bedrooms: number; acUnits: number; activationDate: string | null; status: string; notes: string; createdAt: string };
  try {
    const [rows, serviceRows, settings, groups, subs] = await Promise.all([
      prisma.maintenancePackage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.maintenanceService.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      loadSettings(),
      loadGroups(),
      prisma.maintenanceSubscription.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    ]);
    data = {
      packages: rows.map((r) => ({ ...toPkg(r), lines: asLines(r.lines), groupId: r.groupId })),
      active: Object.fromEntries(rows.map((r) => [r.id, r.active])),
      services: serviceRows.map((s) => ({ id: s.id, nameEn: s.nameEn, nameAr: s.nameAr, showInComparison: s.showInComparison, groupId: s.groupId })),
      settings,
      groups,
      requests: subs.map((s) => ({ id: s.id, packageName: s.packageName, packagePrice: s.packagePrice, kind: s.kind, groupKey: s.groupKey, company: s.company, message: s.message, name: s.name, phone: s.phone, email: s.email, emirate: s.emirate, location: s.location, propertyType: s.propertyType, bedrooms: s.bedrooms, acUnits: s.acUnits, activationDate: s.activationDate?.toISOString().slice(0, 10) ?? null, status: s.status, notes: s.notes, createdAt: s.createdAt.toISOString() })),
    };
  } catch {
    data = null;
  }
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Maintenance Packages" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Annual maintenance packages</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">Edit the packages, prices, included services and quantities, and the terms here. Add them to any page with the “Maintenance packages” block. Customers who press “Subscribe now” appear under Requests.</p>
        {data ? <MaintenanceManager {...data} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Maintenance packages need a database update that has not been applied yet.</p>}
      </div>
    </div>
  );
}
