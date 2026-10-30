"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { slugify } from "@/lib/slug";
import { normalizeKeywords } from "@/lib/seo/keywords";
import { addCatalogToBooking, type AddToBookingResult } from "@/lib/catalog/booking";
import { createCatalogPages, type CreatePagesResult } from "@/lib/catalog/pages";
import { runServicesImport, type ImportSummary } from "@/lib/catalog/importer";
import { categoryProblem, serviceProblem, uniqueSlug, type CategoryInput, type ServiceInput } from "@/lib/catalog/rules";

export type CatalogResult = { ok: boolean; error?: string; id?: string };
export type ImportResult = ImportSummary;

function refresh() {
  revalidatePath("/admin/catalog", "layout");
}

const seoData = (i: CategoryInput | ServiceInput) => ({
  seoTitleEn: i.seoTitleEn.trim() || null, seoTitleAr: i.seoTitleAr.trim() || null,
  seoDescriptionEn: i.seoDescriptionEn.trim() || null, seoDescriptionAr: i.seoDescriptionAr.trim() || null,
  seoKeywordsEn: normalizeKeywords(i.seoKeywordsEn), seoKeywordsAr: normalizeKeywords(i.seoKeywordsAr),
  canonicalUrl: i.canonicalUrl.trim() || null,
});

// ---- categories ----

export async function saveCatalogCategory(id: string | null, input: CategoryInput): Promise<CatalogResult> {
  const g = await guardPermission(id ? "pages.edit" : "pages.create");
  if (!g.ok) return { ok: false, error: g.error };
  const problem = categoryProblem(input);
  if (problem) return { ok: false, error: problem };
  const slug = slugify(input.slug);
  const clash = await prisma.catalogCategory.findUnique({ where: { slug } });
  if (clash && clash.id !== id) return { ok: false, error: "Another category already uses this slug." };
  const data = {
    slug, code: input.code.trim() || null, nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(),
    shortDescriptionEn: input.shortDescriptionEn.trim(), shortDescriptionAr: input.shortDescriptionAr.trim(),
    descriptionEn: input.descriptionEn.trim(), descriptionAr: input.descriptionAr.trim(),
    iconName: input.iconName.trim() || null, imageUrl: input.imageUrl.trim() || null, active: input.active, ...seoData(input),
  };
  if (id) {
    const before = await prisma.catalogCategory.findUnique({ where: { id }, select: { slug: true, nameEn: true, active: true } });
    if (!before) return { ok: false, error: "Category not found." };
    await prisma.catalogCategory.update({ where: { id }, data });
    await writeAudit(g.admin, "catalogCategory.update", "CatalogCategory", id, before, { slug, nameEn: data.nameEn, active: data.active });
    refresh();
    return { ok: true, id };
  }
  const top = (await prisma.catalogCategory.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  const created = await prisma.catalogCategory.create({ data: { ...data, sortOrder: top + 1 } });
  await writeAudit(g.admin, "catalogCategory.create", "CatalogCategory", created.id, null, { slug, nameEn: data.nameEn });
  refresh();
  return { ok: true, id: created.id };
}

export async function moveCatalogCategory(id: string, direction: "up" | "down"): Promise<CatalogResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const all = await prisma.catalogCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true } });
  const i = all.findIndex((c) => c.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return { ok: true };
  [all[i], all[j]] = [all[j], all[i]];
  await prisma.$transaction(all.map((c, n) => prisma.catalogCategory.update({ where: { id: c.id }, data: { sortOrder: n } })));
  await writeAudit(g.admin, "catalogCategory.reorder", "CatalogCategory", id, null, { direction });
  refresh();
  return { ok: true };
}

export async function setCatalogCategoryActive(id: string, active: boolean): Promise<CatalogResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return { ok: false, error: g.error };
  await prisma.catalogCategory.update({ where: { id }, data: { active } });
  await writeAudit(g.admin, active ? "catalogCategory.activate" : "catalogCategory.deactivate", "CatalogCategory", id, null, { active });
  refresh();
  return { ok: true };
}

// Switch every service of a category on or off at once.
export async function setCatalogCategoryServicesActive(categoryId: string, active: boolean): Promise<CatalogResult & { count?: number }> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const r = await prisma.catalogService.updateMany({ where: { categories: { some: { categoryId } } }, data: { active } });
  await writeAudit(g.admin, active ? "catalogService.activateAll" : "catalogService.deactivateAll", "CatalogCategory", categoryId, null, { count: r.count });
  refresh();
  return { ok: true, count: r.count };
}

export async function deleteCatalogCategory(id: string): Promise<CatalogResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return { ok: false, error: g.error };
  const c = await prisma.catalogCategory.findUnique({ where: { id }, include: { _count: { select: { services: true } } } });
  if (!c) return { ok: false, error: "Category not found." };
  if (c._count.services > 0) return { ok: false, error: `This category has ${c._count.services} service${c._count.services === 1 ? "" : "s"}. Move or delete them first, or deactivate the category instead.` };
  await prisma.catalogCategory.delete({ where: { id } });
  await writeAudit(g.admin, "catalogCategory.delete", "CatalogCategory", id, { slug: c.slug, nameEn: c.nameEn }, null);
  refresh();
  return { ok: true };
}

// ---- services ----

export async function saveCatalogService(id: string | null, input: ServiceInput): Promise<CatalogResult> {
  const g = await guardPermission(id ? "pages.edit" : "pages.create");
  if (!g.ok) return { ok: false, error: g.error };
  const problem = serviceProblem(input);
  if (problem) return { ok: false, error: problem };
  const slug = slugify(input.slug);
  const clash = await prisma.catalogService.findUnique({ where: { slug } });
  if (clash && clash.id !== id) return { ok: false, error: "Another service already uses this slug." };
  const known = await prisma.catalogCategory.findMany({ where: { id: { in: input.categoryIds } }, select: { id: true } });
  if (known.length !== new Set(input.categoryIds).size) return { ok: false, error: "One of the chosen categories no longer exists." };

  const data = {
    slug, nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(),
    shortDescriptionEn: input.shortDescriptionEn.trim(), shortDescriptionAr: input.shortDescriptionAr.trim(),
    descriptionEn: input.descriptionEn.trim(), descriptionAr: input.descriptionAr.trim(),
    groupEn: input.groupEn.trim() || null, groupAr: input.groupAr.trim() || null,
    iconName: input.iconName.trim() || null, imageUrl: input.imageUrl.trim() || null, gallery: input.gallery.map((u) => u.trim()).filter(Boolean),
    active: input.active, ...seoData(input),
  };
  const wanted = [...new Set(input.categoryIds)];
  let serviceId = id;
  if (id) {
    const before = await prisma.catalogService.findUnique({ where: { id }, select: { slug: true, nameEn: true, active: true } });
    if (!before) return { ok: false, error: "Service not found." };
    await prisma.catalogService.update({ where: { id }, data });
    await writeAudit(g.admin, "catalogService.update", "CatalogService", id, before, { slug, nameEn: data.nameEn, active: data.active });
  } else {
    const created = await prisma.catalogService.create({ data });
    serviceId = created.id;
    await writeAudit(g.admin, "catalogService.create", "CatalogService", created.id, null, { slug, nameEn: data.nameEn });
  }
  await syncCategories(serviceId!, wanted);
  refresh();
  return { ok: true, id: serviceId! };
}

// Make the service belong to exactly these categories; new ones go to the end of their list.
async function syncCategories(serviceId: string, wanted: string[]) {
  const current = await prisma.catalogCategoryService.findMany({ where: { serviceId }, select: { categoryId: true } });
  const have = new Set(current.map((c) => c.categoryId));
  const remove = [...have].filter((c) => !wanted.includes(c));
  if (remove.length) await prisma.catalogCategoryService.deleteMany({ where: { serviceId, categoryId: { in: remove } } });
  for (const categoryId of wanted.filter((c) => !have.has(c))) {
    const top = (await prisma.catalogCategoryService.aggregate({ where: { categoryId }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
    await prisma.catalogCategoryService.create({ data: { categoryId, serviceId, sortOrder: top + 1 } });
  }
}

export async function moveCatalogService(categoryId: string, serviceId: string, direction: "up" | "down"): Promise<CatalogResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const all = await prisma.catalogCategoryService.findMany({ where: { categoryId }, orderBy: [{ sortOrder: "asc" }, { serviceId: "asc" }], select: { serviceId: true } });
  const i = all.findIndex((c) => c.serviceId === serviceId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return { ok: true };
  [all[i], all[j]] = [all[j], all[i]];
  await prisma.$transaction(all.map((c, n) => prisma.catalogCategoryService.update({ where: { categoryId_serviceId: { categoryId, serviceId: c.serviceId } }, data: { sortOrder: n } })));
  refresh();
  return { ok: true };
}

export async function setCatalogServiceActive(id: string, active: boolean): Promise<CatalogResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return { ok: false, error: g.error };
  await prisma.catalogService.update({ where: { id }, data: { active } });
  await writeAudit(g.admin, active ? "catalogService.activate" : "catalogService.deactivate", "CatalogService", id, null, { active });
  refresh();
  return { ok: true };
}

export async function duplicateCatalogService(id: string): Promise<CatalogResult> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return { ok: false, error: g.error };
  const s = await prisma.catalogService.findUnique({ where: { id }, include: { categories: true } });
  if (!s) return { ok: false, error: "Service not found." };
  const taken = new Set((await prisma.catalogService.findMany({ select: { slug: true } })).map((x) => x.slug));
  const { id: _id, createdAt: _c, updatedAt: _u, categories, ...rest } = s;
  void _id; void _c; void _u;
  const copy = await prisma.catalogService.create({ data: { ...rest, gallery: rest.gallery ?? [], slug: uniqueSlug(`${s.slug}-copy`, taken), nameEn: `${s.nameEn} (Copy)`, nameAr: `${s.nameAr} (نسخة)`, active: false } });
  await syncCategories(copy.id, categories.map((c) => c.categoryId));
  await writeAudit(g.admin, "catalogService.duplicate", "CatalogService", copy.id, { from: id }, { slug: copy.slug });
  refresh();
  return { ok: true, id: copy.id };
}

export async function deleteCatalogService(id: string): Promise<CatalogResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return { ok: false, error: g.error };
  const s = await prisma.catalogService.findUnique({ where: { id }, select: { slug: true, nameEn: true } });
  if (!s) return { ok: false, error: "Service not found." };
  await prisma.catalogService.delete({ where: { id } });
  await writeAudit(g.admin, "catalogService.delete", "CatalogService", id, s, null);
  refresh();
  return { ok: true };
}

// ---- CSV import ----

export async function importCatalogServicesCsv(text: string): Promise<ImportResult> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return { ok: false, error: g.error, created: 0, updated: 0, issues: [] };
  const r = await runServicesImport(text);
  if (r.ok) await writeAudit(g.admin, "catalogService.import", "CatalogService", "csv", null, { created: r.created, updated: r.updated, skipped: r.issues.length });
  refresh();
  return r;
}

// ---- website pages ----

// One draft page per category and per service, nested in the page tree (Website → Page Structure). Safe to repeat: only what is
// missing is created. Nothing is visible to visitors until the pages are published.
export async function createCatalogWebsitePages(): Promise<{ ok: boolean; error?: string; result?: CreatePagesResult }> {
  const g = await guardPermission("pages.create");
  if (!g.ok) return { ok: false, error: g.error };
  const result = await createCatalogPages();
  await writeAudit(g.admin, "catalogPages.create", "CmsPage", "catalog", null, { ...result });
  revalidatePath("/admin/website", "layout");
  refresh();
  return { ok: true, result };
}

// ---- booking ----

// Every catalogue service becomes bookable with "price after inspection" in every active emirate (existing priced services are
// linked, not duplicated). Safe to repeat.
export async function addCatalogServicesToBooking(): Promise<{ ok: boolean; error?: string; result?: AddToBookingResult }> {
  const g = await guardPermission("pricing.edit");
  if (!g.ok) return { ok: false, error: g.error };
  const result = await addCatalogToBooking();
  await writeAudit(g.admin, "catalogBooking.add", "BookableService", "catalog", null, { ...result });
  revalidatePath("/admin/pricing", "layout");
  refresh();
  return { ok: true, result };
}
