import { prisma } from "@/lib/prisma";
import { revalidateSite } from "@/lib/cms/publish";
import { publishProblems } from "@/lib/cms/pageRules";
import { addCatalogToBooking } from "./booking";
import { createCatalogPages } from "./pages";

// One switch per service (and per category): "Published" or "Hidden". It controls everything a visitor can see of it:
//  - its website page (published / taken offline: gone from the menu, the sitemap and search engines),
//  - its place in the Services page lists and Services grids,
//  - and, for a service, whether it can be booked.
// Existing orders are never touched.

export type VisibilityResult = { changed: number; pagesPublished: number; pagesUnpublished: number; problems: string[] };

const chunks = <T,>(list: T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

type PageRow = { id: string; slug: string; titleEn: string; titleAr: string; draftBlocks: unknown; draftSeo: unknown; status: string; publishedVersion: { slug: string } | null };

// Takes the pages offline (one query) or publishes them from their draft (a new published version each). A page whose draft can't be
// published (missing title or invalid blocks) is skipped and reported.
async function syncPages(pages: PageRow[], published: boolean, result: VisibilityResult): Promise<string[]> {
  const slugs: string[] = [];
  if (!published) {
    const live = pages.filter((p) => p.status === "PUBLISHED" || p.status === "SCHEDULED");
    for (const part of chunks(live, 500)) await prisma.cmsPage.updateMany({ where: { id: { in: part.map((p) => p.id) } }, data: { status: "DRAFT", publishedVersionId: null, scheduledVersionId: null, publishAt: null } });
    result.pagesUnpublished += live.length;
    return live.map((p) => p.publishedVersion?.slug ?? p.slug);
  }
  const todo = pages.filter((p) => p.status !== "PUBLISHED");
  if (!todo.length) return slugs;
  const versions = await prisma.cmsPageVersion.groupBy({ by: ["pageId"], where: { pageId: { in: todo.map((p) => p.id) } }, _max: { version: true } });
  const last = new Map(versions.map((v) => [v.pageId, v._max.version ?? 0]));
  for (const part of chunks(todo, 25)) {
    await prisma.$transaction(async (tx) => {
      for (const p of part) {
        const problems = publishProblems({ slug: p.slug, titleEn: p.titleEn, titleAr: p.titleAr, blocks: p.draftBlocks });
        if (problems.length) { result.problems.push(`${p.slug}: ${problems.join(" ")}`); continue; }
        const v = await tx.cmsPageVersion.create({ data: { pageId: p.id, version: (last.get(p.id) ?? 0) + 1, kind: "PUBLISH", slug: p.slug, titleEn: p.titleEn, titleAr: p.titleAr, blocks: p.draftBlocks as never, seo: p.draftSeo as never, createdByName: "Service Catalogue (Publish)" } });
        await tx.cmsPage.update({ where: { id: p.id }, data: { status: "PUBLISHED", publishedVersionId: v.id, publishAt: null, scheduledVersionId: null } });
        await tx.cmsRedirect.deleteMany({ where: { fromPath: `/${p.slug}` } });
        slugs.push(p.slug);
        result.pagesPublished++;
      }
    }, { timeout: 55_000 });
  }
  return slugs;
}

const pageSelect = { id: true, slug: true, titleEn: true, titleAr: true, draftBlocks: true, draftSeo: true, status: true, publishedVersion: { select: { slug: true } } } as const;

export async function setServicesPublished(serviceIds: string[], published: boolean): Promise<VisibilityResult> {
  const result: VisibilityResult = { changed: 0, pagesPublished: 0, pagesUnpublished: 0, problems: [] };
  const ids = [...new Set(serviceIds)];
  if (!ids.length) return result;
  result.changed = (await prisma.catalogService.updateMany({ where: { id: { in: ids } }, data: { active: published } })).count;
  // Publishing: services that have no website page or no booking entry yet get them first.
  if (published) {
    const [paged, booked] = await Promise.all([
      prisma.cmsPage.count({ where: { catalogServiceId: { in: ids }, deletedAt: null } }),
      prisma.bookableService.count({ where: { catalogServiceId: { in: ids } } }),
    ]);
    if (paged < ids.length) await createCatalogPages();
    if (booked < ids.length) await addCatalogToBooking();
    await prisma.catalogService.updateMany({ where: { id: { in: ids } }, data: { active: true } }); // addCatalogToBooking only touches the new ones
  }
  for (const part of chunks(ids, 500)) await prisma.bookableService.updateMany({ where: { catalogServiceId: { in: part } }, data: { active: published } });
  const pages = await prisma.cmsPage.findMany({ where: { catalogServiceId: { in: ids }, deletedAt: null }, select: pageSelect });
  const slugs = await syncPages(pages as PageRow[], published, result);
  if (slugs.length) await revalidateSite(slugs);
  return result;
}

export async function setCategoriesPublished(categoryIds: string[], published: boolean): Promise<VisibilityResult> {
  const result: VisibilityResult = { changed: 0, pagesPublished: 0, pagesUnpublished: 0, problems: [] };
  const ids = [...new Set(categoryIds)];
  if (!ids.length) return result;
  result.changed = (await prisma.catalogCategory.updateMany({ where: { id: { in: ids } }, data: { active: published } })).count;
  if (published && (await prisma.cmsPage.count({ where: { catalogCategoryId: { in: ids }, deletedAt: null } })) < ids.length) await createCatalogPages();
  const pages = await prisma.cmsPage.findMany({ where: { catalogCategoryId: { in: ids }, deletedAt: null }, select: pageSelect });
  const slugs = await syncPages(pages as PageRow[], published, result);
  if (slugs.length) await revalidateSite(slugs);
  return result;
}

// After a CSV import (which sets the flag directly): make every service's page and booking entry match its Published/Hidden flag.
export async function reconcileCatalogVisibility(): Promise<VisibilityResult> {
  const services = await prisma.catalogService.findMany({ select: { id: true, active: true, bookable: { select: { active: true } } } });
  const pages = await prisma.cmsPage.findMany({ where: { catalogServiceId: { not: null }, deletedAt: null }, select: { catalogServiceId: true, status: true } });
  const live = new Set(pages.filter((p) => p.status === "PUBLISHED").map((p) => p.catalogServiceId!));
  const hasPage = new Set(pages.map((p) => p.catalogServiceId!));
  const toPublish = services.filter((s) => s.active && (!live.has(s.id) || s.bookable?.active !== true || !hasPage.has(s.id))).map((s) => s.id);
  const toHide = services.filter((s) => !s.active && (live.has(s.id) || s.bookable?.active === true)).map((s) => s.id);
  const a = await setServicesPublished(toPublish, true);
  const b = await setServicesPublished(toHide, false);
  return { changed: a.changed + b.changed, pagesPublished: a.pagesPublished, pagesUnpublished: b.pagesUnpublished, problems: [...a.problems, ...b.problems] };
}
