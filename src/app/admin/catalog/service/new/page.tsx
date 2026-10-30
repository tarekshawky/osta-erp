import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CatalogServiceForm } from "@/components/catalog/CatalogServiceForm";

export default async function NewCatalogServicePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  await requireEmployee("ADMIN");
  const { category } = await searchParams;
  const categories = await prisma.catalogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, code: true, nameEn: true, nameAr: true } });
  const preset = categories.some((c) => c.id === category) ? [category!] : [];
  return (
    <div className="pb-10">
      <AdminTopBar title="Service Catalogue · New service" />
      <div className="px-6 py-6">
        <CatalogServiceForm
          id={null}
          backHref={preset[0] ? `/admin/catalog/category/${preset[0]}` : "/admin/catalog"}
          categories={categories.map((c) => ({ ...c, code: c.code ?? "" }))}
          initial={{
            slug: "", nameEn: "", nameAr: "", shortDescriptionEn: "", shortDescriptionAr: "", descriptionEn: "", descriptionAr: "", groupEn: "", groupAr: "", iconName: "", imageUrl: "", gallery: [], active: false, categoryIds: preset,
            seoTitleEn: "", seoTitleAr: "", seoDescriptionEn: "", seoDescriptionAr: "", seoKeywordsEn: "", seoKeywordsAr: "", canonicalUrl: "",
          }}
        />
      </div>
    </div>
  );
}
