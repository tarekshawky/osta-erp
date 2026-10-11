import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { AreaManager } from "@/components/cms/AreaManager";

export default async function AreasPage() {
  await requireEmployee("ADMIN");
  const [areas, regions, services] = await Promise.all([
    prisma.serviceArea.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      include: { region: true, services: { select: { id: true } }, pages: { where: { deletedAt: null }, select: { id: true, status: true }, take: 1 } },
    }),
    prisma.region.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true } }),
    prisma.bookableService.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true } }),
  ]);
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Service Areas" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Service areas</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">
          Where you work, with the services offered in each. Create a page for an area to rank for local searches. Each area page must have its own content: a page that is a near-copy of another area page can&apos;t be published.
        </p>
        <AreaManager
          regions={regions.map((r) => ({ id: r.id, name: r.nameEn }))}
          services={services.map((s) => ({ id: s.id, name: s.nameEn }))}
          areas={areas.map((a) => ({
            id: a.id, regionId: a.regionId, regionName: a.region.nameEn, slug: a.slug, nameEn: a.nameEn, nameAr: a.nameAr, kind: a.kind as "emirate" | "area",
            latitude: a.latitude == null ? "" : String(a.latitude), longitude: a.longitude == null ? "" : String(a.longitude), mapsUrl: a.mapsUrl,
            active: a.active, serviceIds: a.services.map((s) => s.id), pageId: a.pages[0]?.id ?? null, pageStatus: a.pages[0]?.status ?? null,
          }))}
        />
      </div>
    </div>
  );
}
