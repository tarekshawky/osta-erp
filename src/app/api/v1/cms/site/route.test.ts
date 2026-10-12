import { describe, it, expect, vi } from "vitest";

const row = (o: Record<string, unknown>) => ({ visible: true, showDesktop: true, showMobile: true, newTab: false, labelAr: "ع", sortOrder: 0, ...o });
const menuRows = [
  row({ id: "h1", menu: "header", parentId: null, labelEn: "Home", url: "/" }),
  row({ id: "h2", menu: "header", parentId: null, labelEn: "Areas We Cover", url: "#areas" }),
  row({ id: "c1", menu: "header", parentId: "h2", labelEn: "Dubai", url: "/services-in-dubai" }), // a hand-added sub-item
  row({ id: "h3", menu: "header", parentId: null, labelEn: "Services", url: "/services" }),
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
        { type: "page", menuParent: "", areaId: null, publishedVersion: { slug: "about-us", titleEn: "About", titleAr: "ع" } },
        { type: "page", menuParent: "h3", areaId: null, publishedVersion: { slug: "extras", titleEn: "Extras", titleAr: "ع" } },
        { type: "page", menuParent: "", areaId: null, publishedVersion: { slug: "services-in-dubai", titleEn: "Dubai", titleAr: "ع" } }, // already linked by hand
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
    expect(header.find((m) => m.labelEn === "Services")!.children.map((c) => c.url)).toEqual(["/extras"]);
    expect(header.some((m) => m.url === "/about-us")).toBe(true);
    expect(header.filter((m) => m.url === "/services-in-dubai")).toHaveLength(0); // not duplicated at top level
  });

  it("drops the special link from the footer", async () => {
    const { GET } = await import("./route");
    const footer = ((await (await GET()).json()).data.menus.footer) as { url: string }[];
    expect(footer.some((m) => m.url === "#areas")).toBe(false);
  });
});
