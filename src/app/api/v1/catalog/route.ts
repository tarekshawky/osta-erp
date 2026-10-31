import { prisma } from "@/lib/prisma";
import { apiSuccess, corsPreflight } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

// Public, unauthenticated: the Service Catalogue for the website's Services page. Each category lists its active services; every
// service says which website page describes it (when that page is published) and which booking service to open for "Book".
export async function GET() {
  const [categories, pages, bookable] = await Promise.all([
    prisma.catalogCategory.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: { id: true, nameEn: true, nameAr: true, iconName: true, services: { orderBy: { sortOrder: "asc" }, select: { service: { select: { id: true, nameEn: true, nameAr: true, active: true } } } } },
    }),
    prisma.cmsPage.findMany({
      where: { status: "PUBLISHED", deletedAt: null, publishedVersion: { isNot: null }, OR: [{ catalogCategoryId: { not: null } }, { catalogServiceId: { not: null } }] },
      select: { catalogCategoryId: true, catalogServiceId: true, publishedVersion: { select: { slug: true } } },
    }),
    prisma.bookableService.findMany({ where: { active: true, catalogServiceId: { not: null } }, select: { slug: true, catalogServiceId: true } }),
  ]);
  const categoryPage = new Map(pages.filter((p) => p.catalogCategoryId).map((p) => [p.catalogCategoryId!, p.publishedVersion!.slug]));
  const servicePage = new Map(pages.filter((p) => p.catalogServiceId).map((p) => [p.catalogServiceId!, p.publishedVersion!.slug]));
  const bookSlug = new Map(bookable.map((b) => [b.catalogServiceId!, b.slug]));
  return apiSuccess({
    categories: categories
      .map((c) => ({
        slug: categoryPage.get(c.id) ?? null, nameEn: c.nameEn, nameAr: c.nameAr, icon: c.iconName ?? "",
        services: c.services.filter((l) => l.service.active).map((l) => ({ nameEn: l.service.nameEn, nameAr: l.service.nameAr, slug: servicePage.get(l.service.id) ?? null, bookSlug: bookSlug.get(l.service.id) ?? null })),
      }))
      .filter((c) => c.services.length > 0),
  });
}
