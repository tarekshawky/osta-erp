import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CatalogCategoryManager, type CategoryRow } from "@/components/catalog/CatalogCategoryManager";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireEmployee("ADMIN");
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const [cats, counts, active, found, serviceCount] = await Promise.all([
    prisma.catalogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] }),
    prisma.catalogCategoryService.groupBy({ by: ["categoryId"], _count: { _all: true } }),
    prisma.catalogCategoryService.groupBy({ by: ["categoryId"], where: { service: { active: true } }, _count: { _all: true } }),
    q
      ? prisma.catalogService.findMany({
          where: { OR: [{ nameEn: { contains: q, mode: "insensitive" } }, { nameAr: { contains: q } }, { slug: { contains: q, mode: "insensitive" } }] },
          include: { categories: { include: { category: { select: { nameEn: true } } } } },
          orderBy: { nameEn: "asc" }, take: 100,
        })
      : Promise.resolve([]),
    prisma.catalogService.count(),
  ]);
  const total = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  const act = new Map(active.map((c) => [c.categoryId, c._count._all]));
  const rows: CategoryRow[] = cats.map((c) => ({
    id: c.id, code: c.code ?? "", slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr, shortDescriptionEn: c.shortDescriptionEn, shortDescriptionAr: c.shortDescriptionAr,
    descriptionEn: c.descriptionEn, descriptionAr: c.descriptionAr, iconName: c.iconName ?? "", imageUrl: c.imageUrl ?? "", active: c.active,
    seoTitleEn: c.seoTitleEn ?? "", seoTitleAr: c.seoTitleAr ?? "", seoDescriptionEn: c.seoDescriptionEn ?? "", seoDescriptionAr: c.seoDescriptionAr ?? "",
    seoKeywordsEn: c.seoKeywordsEn ?? "", seoKeywordsAr: c.seoKeywordsAr ?? "", canonicalUrl: c.canonicalUrl ?? "",
    total: total.get(c.id) ?? 0, activeCount: act.get(c.id) ?? 0,
  }));

  return (
    <div className="pb-10">
      <AdminTopBar title="Service Catalogue" />
      <div className="px-6 py-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Service Catalogue · دليل الخدمات</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">The master list of service categories and the services in each, in English and Arabic, with SEO per item. A service can belong to several categories. Open a category to manage its services.</p>
          </div>
          <form className="flex gap-2" action="/admin/catalog">
            <input name="q" defaultValue={q} placeholder="Search all services…" className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" />
            <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Search</button>
          </form>
        </div>

        {q && (
          <div className="mb-6 max-w-3xl rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-800">{found.length} result{found.length === 1 ? "" : "s"} for “{q}” <Link href="/admin/catalog" className="ms-2 text-xs font-medium text-blue-600">Clear</Link></p>
            <ul className="divide-y divide-slate-100 text-sm">
              {found.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/admin/catalog/service/${s.id}`} className="font-medium text-slate-900 hover:text-blue-700">{s.nameEn}</Link>
                    <span className="ms-2 text-xs text-slate-500" dir="rtl">{s.nameAr}</span>
                    <p className="truncate text-xs text-slate-400">{s.categories.map((c) => c.category.nameEn).join(" · ")}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${s.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{s.active ? "Active" : "Inactive"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <CatalogCategoryManager rows={rows} serviceCount={serviceCount} />
      </div>
    </div>
  );
}
