import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CatalogServiceList, type ServiceRow } from "@/components/catalog/CatalogServiceList";

export default async function CatalogCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;
  const category = await prisma.catalogCategory.findUnique({ where: { id } });
  if (!category) notFound();
  const links = await prisma.catalogCategoryService.findMany({
    where: { categoryId: id },
    orderBy: [{ sortOrder: "asc" }, { serviceId: "asc" }],
    include: { service: { include: { categories: { where: { categoryId: { not: id } }, include: { category: { select: { nameEn: true } } } } } } },
  });
  const rows: ServiceRow[] = links.map((l) => ({
    id: l.service.id, slug: l.service.slug, nameEn: l.service.nameEn, nameAr: l.service.nameAr, groupEn: l.service.groupEn, active: l.service.active,
    others: l.service.categories.map((c) => c.category.nameEn),
  }));
  return (
    <div className="pb-10">
      <AdminTopBar title={`Service Catalogue · ${category.nameEn}`} />
      <div className="px-6 py-6">
        <div className="mb-5">
          <Link href="/admin/catalog" className="text-sm font-medium text-blue-600">← All categories</Link>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{category.code ? `${category.code}. ` : ""}{category.nameEn} <span className="text-lg font-semibold text-slate-500" dir="rtl">· {category.nameAr}</span></h2>
          {category.descriptionEn && <p className="mt-2 max-w-3xl text-sm text-amber-700">{category.descriptionEn}</p>}
        </div>
        <CatalogServiceList categoryId={id} rows={rows} />
      </div>
    </div>
  );
}
