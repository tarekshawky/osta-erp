// Integration test against the real database. Skipped unless CATALOG_E2E=1. Creates only "ZZ TEST" rows and removes them.
// The admin login check is replaced, so this exercises the actions themselves, not the sign-in.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock("@/lib/adminGuard", () => ({
  guardPermission: async () => ({ ok: true, admin: { id: null, name: "e2e" } }),
  peekPermission: async () => ({ admin: { id: null, name: "e2e" } }),
  writeAudit: async () => {},
}));

const run = process.env.CATALOG_E2E === "1";
const seo = { seoTitleEn: "", seoTitleAr: "", seoDescriptionEn: "", seoDescriptionAr: "", seoKeywordsEn: "", seoKeywordsAr: "", canonicalUrl: "" };

describe.skipIf(!run)("service catalogue actions (real database)", () => {
  let a: typeof import("./actions");
  let prisma: typeof import("@/lib/prisma").prisma;
  const ids = { catA: "", catB: "", s1: "", s2: "" };
  const cat = (n: string) => ({ code: "ZZ", slug: `zz-test-${n}`, nameEn: `ZZ TEST ${n}`, nameAr: `قسم ${n}`, shortDescriptionEn: "", shortDescriptionAr: "", descriptionEn: "", descriptionAr: "", iconName: "Wrench", imageUrl: "", active: false, ...seo });
  const svc = (n: string, categoryIds: string[]) => ({ slug: `zz-test-svc-${n}`, nameEn: `ZZ TEST ${n}`, nameAr: `خدمة ${n}`, shortDescriptionEn: "s", shortDescriptionAr: "ق", descriptionEn: "d", descriptionAr: "و", groupEn: "", groupAr: "", iconName: "", imageUrl: "", gallery: [], active: false, categoryIds, ...seo });

  beforeAll(async () => {
    a = await import("./actions");
    prisma = (await import("@/lib/prisma")).prisma;
  });
  afterAll(async () => {
    await prisma.catalogService.deleteMany({ where: { nameEn: { startsWith: "ZZ TEST" } } });
    await prisma.catalogCategory.deleteMany({ where: { nameEn: { startsWith: "ZZ TEST" } } });
    await prisma.$disconnect();
  });

  it("creates, edits and rejects bad categories", async () => {
    expect((await a.saveCatalogCategory(null, { ...cat("A"), nameAr: "" })).ok).toBe(false);
    const A = await a.saveCatalogCategory(null, cat("A"));
    const B = await a.saveCatalogCategory(null, cat("B"));
    expect(A.ok && B.ok).toBe(true);
    ids.catA = A.id!; ids.catB = B.id!;
    expect((await a.saveCatalogCategory(null, cat("A"))).error).toMatch(/slug/i);
    expect((await a.saveCatalogCategory(ids.catA, { ...cat("A"), nameEn: "ZZ TEST A edited", seoKeywordsEn: "x, y", canonicalUrl: "https://example.com/a" })).ok).toBe(true);
    const row = await prisma.catalogCategory.findUniqueOrThrow({ where: { id: ids.catA } });
    expect(row.nameEn).toBe("ZZ TEST A edited");
    expect(row.canonicalUrl).toBe("https://example.com/a");
  }, 60_000);

  it("creates services in several categories and keeps order", async () => {
    const s1 = await a.saveCatalogService(null, svc("one", [ids.catA]));
    const s2 = await a.saveCatalogService(null, svc("two", [ids.catA, ids.catB]));
    expect(s1.ok && s2.ok).toBe(true);
    ids.s1 = s1.id!; ids.s2 = s2.id!;
    expect((await a.saveCatalogService(null, svc("one", [ids.catA]))).error).toMatch(/slug/i);
    expect((await a.saveCatalogService(null, svc("three", []))).error).toMatch(/category/i);
    expect((await prisma.catalogCategoryService.count({ where: { serviceId: ids.s2 } }))).toBe(2);
    // move the second service up in category A
    expect((await a.moveCatalogService(ids.catA, ids.s2, "up")).ok).toBe(true);
    const order = (await prisma.catalogCategoryService.findMany({ where: { categoryId: ids.catA }, orderBy: { sortOrder: "asc" } })).map((l) => l.serviceId);
    expect(order).toEqual([ids.s2, ids.s1]);
    // remove s2 from category B by editing it
    expect((await a.saveCatalogService(ids.s2, svc("two", [ids.catA]))).ok).toBe(true);
    expect(await prisma.catalogCategoryService.count({ where: { serviceId: ids.s2 } })).toBe(1);
  }, 60_000);

  it("activates, bulk-activates, duplicates and reorders categories", async () => {
    expect((await a.setCatalogServiceActive(ids.s1, true)).ok).toBe(true);
    expect((await prisma.catalogService.findUniqueOrThrow({ where: { id: ids.s1 } })).active).toBe(true);
    const bulk = await a.setCatalogCategoryServicesActive(ids.catA, false);
    expect(bulk.count).toBe(2);
    expect(await prisma.catalogService.count({ where: { id: { in: [ids.s1, ids.s2] }, active: true } })).toBe(0);
    const copy = await a.duplicateCatalogService(ids.s1);
    expect(copy.ok).toBe(true);
    const c = await prisma.catalogService.findUniqueOrThrow({ where: { id: copy.id! }, include: { categories: true } });
    expect(c.slug).toMatch(/^zz-test-svc-one-copy/);
    expect(c.active).toBe(false);
    expect(c.categories).toHaveLength(1);
    expect((await a.setCatalogCategoryActive(ids.catA, true)).ok).toBe(true);
    const before = (await prisma.catalogCategory.findUniqueOrThrow({ where: { id: ids.catB } })).sortOrder;
    expect((await a.moveCatalogCategory(ids.catB, "up")).ok).toBe(true);
    expect((await prisma.catalogCategory.findUniqueOrThrow({ where: { id: ids.catB } })).sortOrder).toBeLessThan(before);
  }, 60_000);

  it("imports CSV: adds, updates, reports bad rows, never deletes", async () => {
    const head = "category,slug,name_en,name_ar,active,seo_title_en,canonical_url";
    const csv = [head, `zz-test-a|zz-test-b,zz-test-svc-one,ZZ TEST one updated,خدمة محدثة,yes,Title,https://example.com/x`, `zz-test-b,,ZZ TEST imported new,خدمة مستوردة,no,,`, `nope,,ZZ TEST bad,سيء,,,`, `zz-test-a,,,,,,`].join("\n");
    const r = await a.importCatalogServicesCsv(csv);
    expect(r.ok).toBe(true);
    expect(r.created).toBe(1);
    expect(r.updated).toBe(1);
    expect(r.issues.map((i) => i.line)).toEqual([4, 5]);
    const one = await prisma.catalogService.findFirstOrThrow({ where: { slug: "zz-test-svc-one" }, include: { categories: true } });
    expect(one.nameEn).toBe("ZZ TEST one updated");
    expect(one.active).toBe(true);
    expect(one.categories).toHaveLength(2);
    expect(await prisma.catalogService.count({ where: { nameEn: "ZZ TEST imported new" } })).toBe(1);
  }, 60_000);

  it("refuses to delete a category that has services, then deletes services and categories", async () => {
    expect((await a.deleteCatalogCategory(ids.catA)).error).toMatch(/services/);
    expect((await a.deleteCatalogService(ids.s1)).ok).toBe(true);
    expect(await prisma.catalogService.count({ where: { id: ids.s1 } })).toBe(0);
    await prisma.catalogService.deleteMany({ where: { nameEn: { startsWith: "ZZ TEST" } } });
    expect((await a.deleteCatalogCategory(ids.catA)).ok).toBe(true);
    expect((await a.deleteCatalogCategory(ids.catB)).ok).toBe(true);
  }, 60_000);

  it("exports every service as CSV the importer can read back", async () => {
    const { GET } = await import("@/app/api/admin/catalog/export/route");
    const res = await GET();
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    const { parseServicesCsv } = await import("@/lib/catalog/rules");
    const parsed = parseServicesCsv(await res.text());
    expect(parsed.issues).toEqual([]);
    expect(parsed.rows.length).toBe(await prisma.catalogService.count());
    expect(parsed.rows.some((r) => r.nameAr.length > 0 && r.categoryRefs.length > 0)).toBe(true);
  }, 60_000);
});
