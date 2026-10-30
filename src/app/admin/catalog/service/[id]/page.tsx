import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CatalogServiceForm } from "@/components/catalog/CatalogServiceForm";

export default async function EditCatalogServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireEmployee("ADMIN");
  const { id } = await params;
  const [s, categories] = await Promise.all([
    prisma.catalogService.findUnique({ where: { id }, include: { categories: { orderBy: { sortOrder: "asc" } } } }),
    prisma.catalogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, code: true, nameEn: true, nameAr: true } }),
  ]);
  if (!s) notFound();
  const gallery = Array.isArray(s.gallery) ? (s.gallery as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const first = s.categories[0]?.categoryId;
  return (
    <div className="pb-10">
      <AdminTopBar title={`Service Catalogue · ${s.nameEn}`} />
      <div className="px-6 py-6">
        <CatalogServiceForm
          id={s.id}
          backHref={first ? `/admin/catalog/category/${first}` : "/admin/catalog"}
          categories={categories.map((c) => ({ ...c, code: c.code ?? "" }))}
          initial={{
            slug: s.slug, nameEn: s.nameEn, nameAr: s.nameAr, shortDescriptionEn: s.shortDescriptionEn, shortDescriptionAr: s.shortDescriptionAr, descriptionEn: s.descriptionEn, descriptionAr: s.descriptionAr,
            groupEn: s.groupEn ?? "", groupAr: s.groupAr ?? "", iconName: s.iconName ?? "", imageUrl: s.imageUrl ?? "", gallery, active: s.active, categoryIds: s.categories.map((c) => c.categoryId),
            seoTitleEn: s.seoTitleEn ?? "", seoTitleAr: s.seoTitleAr ?? "", seoDescriptionEn: s.seoDescriptionEn ?? "", seoDescriptionAr: s.seoDescriptionAr ?? "",
            seoKeywordsEn: s.seoKeywordsEn ?? "", seoKeywordsAr: s.seoKeywordsAr ?? "", canonicalUrl: s.canonicalUrl ?? "",
          }}
        />
      </div>
    </div>
  );
}
