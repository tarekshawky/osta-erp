import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the few tables the Publish / Hide switch touches.
type Svc = { id: string; active: boolean };
type Page = { id: string; slug: string; catalogServiceId: string | null; catalogCategoryId: string | null; status: string; publishedVersionId: string | null; titleEn: string; titleAr: string; draftBlocks: unknown; draftSeo: unknown; deletedAt: null };
type Book = { catalogServiceId: string; active: boolean };
const db = vi.hoisted(() => ({ services: [] as Svc[], categories: [] as Svc[], pages: [] as Page[], books: [] as Book[], versions: [] as { id: string; pageId: string; version: number }[], created: 0, booked: 0 }));

const inIds = (w: { id?: { in: string[] }; catalogServiceId?: { in: string[] } | { not: null }; catalogCategoryId?: { in: string[] } }, row: { id?: string; catalogServiceId?: string | null; catalogCategoryId?: string | null }) =>
  (!w.id || w.id.in.includes(row.id!)) &&
  (!w.catalogServiceId || ("in" in w.catalogServiceId ? w.catalogServiceId.in.includes(row.catalogServiceId!) : row.catalogServiceId !== null)) &&
  (!w.catalogCategoryId || w.catalogCategoryId.in.includes(row.catalogCategoryId!));

vi.mock("@/lib/prisma", () => {
  const tx = {
    cmsPageVersion: { create: async ({ data }: { data: { pageId: string; version: number } }) => { const v = { id: `v${db.versions.length + 1}`, pageId: data.pageId, version: data.version }; db.versions.push(v); return v; } },
    cmsPage: { update: async ({ where, data }: { where: { id: string }; data: Partial<Page> }) => { Object.assign(db.pages.find((p) => p.id === where.id)!, data); } },
    cmsRedirect: { deleteMany: async () => ({ count: 0 }) },
  };
  return {
    prisma: {
      catalogService: {
        findMany: async () => db.services.map((sv) => ({ ...sv, bookable: db.books.find((b) => b.catalogServiceId === sv.id) ? { active: db.books.find((b) => b.catalogServiceId === sv.id)!.active } : null })),
        updateMany: async ({ where, data }: { where: { id: { in: string[] } }; data: Partial<Svc> }) => { const rows = db.services.filter((r) => where.id.in.includes(r.id)); rows.forEach((r) => Object.assign(r, data)); return { count: rows.length }; } },
      catalogCategory: { updateMany: async ({ where, data }: { where: { id: { in: string[] } }; data: Partial<Svc> }) => { const rows = db.categories.filter((r) => where.id.in.includes(r.id)); rows.forEach((r) => Object.assign(r, data)); return { count: rows.length }; } },
      cmsPage: {
        count: async ({ where }: { where: Parameters<typeof inIds>[0] }) => db.pages.filter((p) => inIds(where, p)).length,
        findMany: async ({ where }: { where: Parameters<typeof inIds>[0] }) => db.pages.filter((p) => inIds(where, p)).map((p) => ({ ...p, publishedVersion: p.publishedVersionId ? { slug: p.slug } : null })),
        updateMany: async ({ where, data }: { where: { id: { in: string[] } }; data: Partial<Page> }) => { db.pages.filter((p) => where.id.in.includes(p.id)).forEach((p) => Object.assign(p, data)); },
      },
      bookableService: {
        count: async ({ where }: { where: { catalogServiceId: { in: string[] } } }) => db.books.filter((b) => where.catalogServiceId.in.includes(b.catalogServiceId)).length,
        updateMany: async ({ where, data }: { where: { catalogServiceId: { in: string[] } }; data: Partial<Book> }) => { db.books.filter((b) => where.catalogServiceId.in.includes(b.catalogServiceId)).forEach((b) => Object.assign(b, data)); },
      },
      cmsPageVersion: { groupBy: async () => [] },
      $transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx),
    },
  };
});
vi.mock("@/lib/cms/publish", () => ({ revalidateSite: async () => {} }));
vi.mock("./pages", () => ({ createCatalogPages: async () => { db.created++; for (const s of db.services) if (!db.pages.some((p) => p.catalogServiceId === s.id)) db.pages.push(page(`p-${s.id}`, s.id)); } }));
vi.mock("./booking", () => ({ addCatalogToBooking: async () => { db.booked++; for (const s of db.services) if (!db.books.some((b) => b.catalogServiceId === s.id)) db.books.push({ catalogServiceId: s.id, active: true }); } }));

const blocks = [{ id: "b1", type: "richText", props: { heading: { en: "", ar: "" }, align: "start", body: { en: "x", ar: "x" } }, hidden: false, visibility: { desktop: true, mobile: true } }];
const page = (id: string, serviceId: string | null, categoryId: string | null = null, status = "DRAFT"): Page => ({ id, slug: id, catalogServiceId: serviceId, catalogCategoryId: categoryId, status, publishedVersionId: status === "PUBLISHED" ? "v0" : null, titleEn: "T", titleAr: "ع", draftBlocks: blocks, draftSeo: {}, deletedAt: null });

beforeEach(() => {
  db.services = [{ id: "s1", active: true }, { id: "s2", active: true }];
  db.categories = [{ id: "c1", active: true }];
  db.pages = [page("pa", "s1", null, "PUBLISHED"), page("pb", "s2", null, "PUBLISHED"), page("pc", null, "c1", "PUBLISHED")];
  db.books = [{ catalogServiceId: "s1", active: true }, { catalogServiceId: "s2", active: true }];
  db.versions = []; db.created = 0; db.booked = 0;
});

describe("Publish / Hide a service", () => {
  it("hiding takes the page offline, closes booking and clears the flag, for the chosen services only", async () => {
    const { setServicesPublished } = await import("./visibility");
    const r = await setServicesPublished(["s1"], false);
    expect(r).toMatchObject({ changed: 1, pagesUnpublished: 1, pagesPublished: 0, problems: [] });
    expect(db.services.find((s) => s.id === "s1")!.active).toBe(false);
    expect(db.pages.find((p) => p.id === "pa")).toMatchObject({ status: "DRAFT", publishedVersionId: null });
    expect(db.books.find((b) => b.catalogServiceId === "s1")!.active).toBe(false);
    // the other service is untouched
    expect(db.services.find((s) => s.id === "s2")!.active).toBe(true);
    expect(db.pages.find((p) => p.id === "pb")!.status).toBe("PUBLISHED");
    expect(db.books.find((b) => b.catalogServiceId === "s2")!.active).toBe(true);
  });

  it("publishing again goes live from the draft with a new version and re-opens booking", async () => {
    const { setServicesPublished } = await import("./visibility");
    await setServicesPublished(["s1"], false);
    const r = await setServicesPublished(["s1"], true);
    expect(r).toMatchObject({ pagesPublished: 1, problems: [] });
    expect(db.versions).toHaveLength(1);
    expect(db.pages.find((p) => p.id === "pa")).toMatchObject({ status: "PUBLISHED", publishedVersionId: "v1" });
    expect(db.books.find((b) => b.catalogServiceId === "s1")!.active).toBe(true);
    expect(db.services.find((s) => s.id === "s1")!.active).toBe(true);
  });

  it("publishing a service that has no page or booking entry yet creates them first", async () => {
    const { setServicesPublished } = await import("./visibility");
    db.services.push({ id: "s3", active: false });
    const r = await setServicesPublished(["s3"], true);
    expect(db.created).toBe(1);
    expect(db.booked).toBe(1);
    expect(r.pagesPublished).toBe(1);
    expect(db.pages.find((p) => p.catalogServiceId === "s3")!.status).toBe("PUBLISHED");
    expect(db.books.find((b) => b.catalogServiceId === "s3")!.active).toBe(true);
  });

  it("a page that can't be published is reported and the rest still go live", async () => {
    const { setServicesPublished } = await import("./visibility");
    await setServicesPublished(["s1", "s2"], false);
    db.pages.find((p) => p.id === "pa")!.titleEn = ""; // no English title
    const r = await setServicesPublished(["s1", "s2"], true);
    expect(r.pagesPublished).toBe(1);
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]).toContain("pa");
    expect(db.pages.find((p) => p.id === "pb")!.status).toBe("PUBLISHED");
  });

  it("hiding a category takes its page offline; services are not touched", async () => {
    const { setCategoriesPublished } = await import("./visibility");
    const r = await setCategoriesPublished(["c1"], false);
    expect(r.pagesUnpublished).toBe(1);
    expect(db.categories[0].active).toBe(false);
    expect(db.pages.find((p) => p.id === "pc")!.status).toBe("DRAFT");
    expect(db.pages.find((p) => p.id === "pa")!.status).toBe("PUBLISHED");
  });

  it("reconcile makes pages and booking match a flag set directly (CSV import)", async () => {
    const { reconcileCatalogVisibility } = await import("./visibility");
    db.services.find((s) => s.id === "s2")!.active = false; // flag turned off, page and booking still live
    db.services.push({ id: "s4", active: true }); // flag turned on, no page and no booking yet
    const r = await reconcileCatalogVisibility();
    expect(r.pagesUnpublished).toBe(1);
    expect(db.pages.find((p) => p.id === "pb")!.status).toBe("DRAFT");
    expect(db.books.find((b) => b.catalogServiceId === "s2")!.active).toBe(false);
    expect(db.pages.find((p) => p.catalogServiceId === "s4")!.status).toBe("PUBLISHED");
    expect(db.books.find((b) => b.catalogServiceId === "s4")!.active).toBe(true);
    // the untouched service stays as it was
    expect(db.pages.find((p) => p.id === "pa")!.status).toBe("PUBLISHED");
  });
});
