import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { WebsiteTabs } from "@/components/cms/WebsiteTabs";
import { LocationManager, type BranchRow } from "@/components/cms/LocationManager";
import type { HoursRow } from "@/lib/locations/locations";

export default async function LocationsPage() {
  await requireEmployee("ADMIN");
  const [branches, areas, categories] = await Promise.all([
    prisma.branch.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], include: { categories: { select: { id: true } } } }),
    prisma.serviceArea.findMany({ where: { kind: "emirate" }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true } }),
    prisma.catalogCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true } }),
  ]);
  const rows: BranchRow[] = branches.map((b) => ({
    id: b.id, slug: b.slug, areaId: b.areaId, nameEn: b.nameEn, nameAr: b.nameAr, branchNameEn: b.branchNameEn, branchNameAr: b.branchNameAr, regionEn: b.regionEn,
    streetEn: b.streetEn, streetAr: b.streetAr, localityEn: b.localityEn, localityAr: b.localityAr, postalCode: b.postalCode, addressEn: b.addressEn, addressAr: b.addressAr,
    latitude: b.latitude, longitude: b.longitude, mapsUrl: b.mapsUrl, mapsEmbedUrl: b.mapsEmbedUrl, appleMapsUrl: b.appleMapsUrl, businessProfileUrl: b.businessProfileUrl, reviewsUrl: b.reviewsUrl,
    phone: b.phone, whatsapp: b.whatsapp, email: b.email, hours: Array.isArray(b.hours) ? (b.hours as unknown as HoursRow[]) : [], images: b.images,
    ratingValue: b.ratingValue, ratingCount: b.ratingCount,
    coverage: Array.isArray(b.coverage) ? (b.coverage as unknown as { nameEn: string; nameAr: string }[]) : [],
    faqs: Array.isArray(b.faqs) ? (b.faqs as unknown as BranchRow["faqs"]) : [],
    categoryIds: b.categories.map((c) => c.id), active: b.active, sortOrder: b.sortOrder,
  }));
  return (
    <div className="pb-10">
      <AdminTopBar title="Website · Locations" />
      <div className="px-6 py-6">
        <WebsiteTabs />
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Locations</h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-500">
          Your real offices. Each branch shows automatically on its emirate page (address, map, directions, call and WhatsApp buttons, services, coverage areas, rating and questions) and gets its own LocalBusiness structured data. Emirates without a branch are only shown as areas you serve.
        </p>
        <LocationManager
          branches={rows}
          areas={areas.map((a) => ({ id: a.id, name: a.nameEn }))}
          categories={categories.map((c) => ({ id: c.id, name: c.nameEn }))}
          emirateStatus={areas.map((a) => ({ id: a.id, name: a.nameEn, branches: branches.filter((b) => b.areaId === a.id && b.active).length }))}
        />
      </div>
    </div>
  );
}
