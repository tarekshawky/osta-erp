import { describe, it, expect, vi } from "vitest";

const row = (o: Record<string, unknown>) => ({ visible: true, showDesktop: true, showMobile: true, newTab: false, labelAr: "ع", sortOrder: 0, ...o });
const menuRows = [
  row({ id: "h1", menu: "header", parentId: null, labelEn: "Home", url: "/" }),
  row({ id: "h2", menu: "header", parentId: null, labelEn: "Areas We Cover", url: "#areas" }),
  row({ id: "c1", menu: "header", parentId: "h2", labelEn: "Dubai", url: "/services-in-dubai" }), // a hand-added sub-item
  row({ id: "h3", menu: "header", parentId: null, labelEn: "Services", url: "/services" }),
  row({ id: "h4", menu: "header", parentId: null, labelEn: "Sharjah", url: "/services-in-sharjah" }), // its page is only a draft
  row({ id: "f1", menu: "footer", parentId: null, labelEn: "Areas", url: "#areas" }),
];

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSettings: { findUnique: async () => ({ id: "default", updatedAt: new Date(), footerAreas: [] }) },
    menuItem: { findMany: async () => menuRows },
    socialLink: { findMany: async () => [] },
    integrationSettings: { findUnique: async () => null },
    cmsPage: {
      findMany: async () => [
        { slug: "services-in-sharjah", type: "area", menuParent: "", areaId: null, publishedVersion: null },
        { type: "page", menuParent: "", areaId: null, publishedVersion: { slug: "about-us", titleEn: "About", titleAr: "ع" } },
        { type: "page", menuParent: "h3", areaId: null, publishedVersion: { slug: "extras", titleEn: "Extras", titleAr: "ع" } },
        { type: "page", menuParent: "", areaId: null, publishedVersion: { slug: "services-in-dubai", titleEn: "Dubai", titleAr: "ع" } }, // already linked by hand
        // A category page inside the Services dropdown, with its service pages nested below it (sorted by sortOrder), one orphan and one draft.
        { id: "p1", type: "service", menuParent: "h3", parentId: null, sortOrder: 0, areaId: null, publishedVersion: { slug: "ac-hvac", titleEn: "AC & HVAC", titleAr: "ع" } },
        { id: "p2", type: "service", menuParent: "parent", parentId: "p1", sortOrder: 1, areaId: null, publishedVersion: { slug: "ac-repair", titleEn: "AC Repair", titleAr: "ع" } },
        { id: "p3", type: "service", menuParent: "parent", parentId: "p1", sortOrder: 0, areaId: null, publishedVersion: { slug: "ac-cleaning", titleEn: "AC Cleaning", titleAr: "ع" } },
        { id: "p4", type: "service", menuParent: "parent", parentId: "p1", sortOrder: 2, areaId: null, publishedVersion: null },
        { id: "p5", type: "service", menuParent: "parent", parentId: "not-in-menu", sortOrder: 0, areaId: null, publishedVersion: { slug: "orphan-page", titleEn: "Orphan", titleAr: "ع" } },
      ],
    },
    serviceArea: { findMany: async () => [{ slug: "dubai", nameEn: "Dubai", nameAr: "د", pages: [{ publishedVersion: { slug: "services-in-dubai" } }] }] },
  },
}));

describe("GET /api/v1/cms/site", () => {
  it("builds the header with sub-items, pages and the areas dropdown without crashing", async () => {
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    const header = ((await res.json()).data.menus.header) as { labelEn: string; url: string; children: { labelEn: string; url: string }[] }[];
    const areas = header.find((m) => m.labelEn === "Areas We Cover")!;
    expect(areas.url).toBe("");
    expect(areas.children.map((c) => c.url)).toContain("/services-in-dubai");
    expect(areas.children.filter((c) => c.url === "/services-in-dubai")).toHaveLength(2); // area + the hand-added one: both kept, they are explicit
    const services = header.find((m) => m.labelEn === "Services")!;
    expect(services.children.map((c) => c.url)).toEqual(["/extras", "/ac-hvac"]);
    // three levels: Services → category page → its published service pages, in tree order; drafts and orphans are left out
    const category = services.children.find((c) => c.url === "/ac-hvac") as unknown as { children: { url: string }[] };
    expect(category.children.map((c) => c.url)).toEqual(["/ac-cleaning", "/ac-repair"]);
    expect(JSON.stringify(header)).not.toContain("orphan-page");
    expect(header.some((m) => m.url === "/about-us")).toBe(true);
    expect(header.some((m) => m.url === "/services-in-sharjah")).toBe(false); // a link to a draft page is hidden
    expect(header.filter((m) => m.url === "/services-in-dubai")).toHaveLength(0); // not duplicated at top level
  });

  it("drops the special link from the footer", async () => {
    const { GET } = await import("./route");
    const footer = ((await (await GET()).json()).data.menus.footer) as { url: string }[];
    expect(footer.some((m) => m.url === "#areas")).toBe(false);
  });
});
