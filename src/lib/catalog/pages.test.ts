import { describe, expect, it } from "vitest";
import { parseBlocks } from "@/lib/cms/blocks";
import { publishProblems } from "@/lib/cms/pageRules";
import { categoryBlocks, pageSeo, pageSlug, serviceBlocks } from "./pages";

const cat = { nameEn: "Air Conditioning & HVAC Services", nameAr: "خدمات التكييف والتبريد", shortDescriptionEn: "", shortDescriptionAr: "", descriptionEn: "", descriptionAr: "" };
const svc = { ...cat, nameEn: "Split AC Cleaning", nameAr: "تنظيف مكيفات السبليت", seoTitleEn: null, seoTitleAr: null, seoDescriptionEn: null, seoDescriptionAr: null };

describe("catalogue page generator", () => {
  it("builds valid blocks that can be published", () => {
    for (const blocks of [categoryBlocks(cat), serviceBlocks(svc, cat)]) {
      expect(parseBlocks(blocks).ok).toBe(true);
      expect(publishProblems({ slug: "split-ac-cleaning", titleEn: "x", titleAr: "ي", blocks })).toEqual([]);
    }
    expect(categoryBlocks(cat).some((b) => b.type === "subPages")).toBe(true);
  });
  it("uses the catalogue's own text and SEO when present", () => {
    const blocks = serviceBlocks({ ...svc, descriptionEn: "Own text", descriptionAr: "نص خاص" }, cat);
    expect(JSON.stringify(blocks)).toContain("Own text");
    expect(pageSeo({ ...svc, seoTitleEn: "Custom" }).titleEn).toBe("Custom");
    expect(pageSeo(svc).titleEn).toBe("Split AC Cleaning in the UAE");
  });
  it("makes unique, valid, non-reserved slugs", () => {
    const taken = new Set(["water-tank-cleaning"]);
    expect(pageSlug("Water Tank Cleaning", taken)).toBe("water-tank-cleaning-2");
    expect(pageSlug("services", taken)).toBe("services-services");
    expect(pageSlug("!!!", taken)).toBe("service");
    expect(pageSlug("a".repeat(200), taken).length).toBeLessThanOrEqual(72);
  });
});
