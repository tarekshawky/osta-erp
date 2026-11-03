import { describe, it, expect, vi } from "vitest";

const db = vi.hoisted(() => ({ branches: vi.fn(), pages: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { branch: { findMany: db.branches }, cmsPage: { findMany: db.pages } } }));
import { GET } from "./route";
import { loadBranches } from "@/lib/locations/data";

const row = (over: object = {}) => ({
  slug: "ajman", areaId: "a1", nameEn: "Osta Services Ajman", nameAr: "خدمات آسطا عجمان", branchNameEn: "Ajman Branch", branchNameAr: "", regionEn: "", streetEn: "Paradise Lake Tower B9", streetAr: "", localityEn: "Emirates City", localityAr: "", postalCode: "",
  addressEn: "", addressAr: "", latitude: 25.3925699, longitude: 55.5760205, mapsUrl: "https://www.google.com/maps?cid=1", mapsEmbedUrl: "", appleMapsUrl: "", businessProfileUrl: "", reviewsUrl: "", phone: "+971568676036", whatsapp: "", email: "",
  hours: [{ days: [0, 1, 2, 3, 4, 5, 6], opens: "10:00", closes: "24:00" }], images: [], ratingValue: 5, ratingCount: 206, coverage: [{ nameEn: "Emirates City", nameAr: "" }], faqs: [{ question: { en: "Q?", ar: "" }, answer: { en: "A.", ar: "" } }],
  area: { slug: "ajman", nameEn: "Ajman", nameAr: "عجمان" }, categories: [{ id: "c1", nameEn: "AC", nameAr: "تكييف" }, { id: "c2", nameEn: "Plumbing", nameAr: "سباكة" }], ...over,
});

describe("loadBranches / GET /api/v1/locations", () => {
  it("returns active branches with generated map links, and links each service category to its published page", async () => {
    db.branches.mockResolvedValue([row()]);
    db.pages.mockResolvedValue([{ catalogCategoryId: "c1", publishedVersion: { slug: "ac-services" } }]);
    const json = (await (await GET()).json()) as { data: { locations: { slug: string; embedUrl: string; directionsUrl: string; hoursSummary: { en: string }; categories: { nameEn: string; href: string | null }[]; addressEn: string }[] } };
    const [b] = json.data.locations;
    expect(b.slug).toBe("ajman");
    expect(b.embedUrl).toBe("https://maps.google.com/maps?q=25.3925699,55.5760205&z=16&hl=en&output=embed");
    expect(b.directionsUrl).toContain("destination=25.3925699,55.5760205");
    expect(b.hoursSummary.en).toBe("Daily 10:00–24:00");
    expect(b.addressEn).toBe("Paradise Lake Tower B9, Emirates City, Ajman, UAE");
    expect(b.categories).toEqual([{ nameEn: "AC", nameAr: "تكييف", href: "/ac-services" }, { nameEn: "Plumbing", nameAr: "سباكة", href: null }]);
    expect(db.branches.mock.calls[0][0].where).toMatchObject({ active: true, area: { active: true } });
  });
  it("returns an empty list when there are no branches (and asks for no pages)", async () => {
    db.branches.mockResolvedValue([]);
    db.pages.mockClear();
    expect((await loadBranches()).pub).toEqual([]);
    expect(db.pages).not.toHaveBeenCalled();
  });
  it("can be limited to one emirate", async () => {
    db.branches.mockResolvedValue([]);
    await loadBranches({ areaId: "a1" });
    expect(db.branches.mock.calls.at(-1)![0].where).toMatchObject({ areaId: "a1" });
  });
  it("gives the JSON-LD side what it needs, and only the English text", async () => {
    db.branches.mockResolvedValue([row({ regionEn: "Abu Dhabi" })]);
    db.pages.mockResolvedValue([]);
    const { ld } = await loadBranches();
    expect(ld[0]).toMatchObject({ slug: "ajman", streetEn: "Paradise Lake Tower B9", regionEn: "Abu Dhabi", coverage: ["Emirates City"], faqs: [{ question: "Q?", answer: "A." }] });
  });
});
