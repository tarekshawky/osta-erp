import { describe, expect, it } from "vitest";
import { categoryProblem, parseCsv, parseServicesCsv, serviceProblem, uniqueSlug, type ServiceInput } from "./rules";

const seo = { seoTitleEn: "", seoTitleAr: "", seoDescriptionEn: "", seoDescriptionAr: "", seoKeywordsEn: "", seoKeywordsAr: "", canonicalUrl: "" };
const service = (o: Partial<ServiceInput> = {}): ServiceInput => ({ slug: "ac-repair", nameEn: "AC Repair", nameAr: "تصليح", shortDescriptionEn: "", shortDescriptionAr: "", descriptionEn: "", descriptionAr: "", groupEn: "", groupAr: "", iconName: "", imageUrl: "", gallery: [], active: false, categoryIds: ["c1"], ...seo, ...o });

describe("catalogue rules", () => {
  it("needs both names, a slug and a category", () => {
    expect(serviceProblem(service())).toBeNull();
    expect(serviceProblem(service({ nameAr: "" }))).toMatch(/Arabic/);
    expect(serviceProblem(service({ slug: "!!" }))).toMatch(/Slug/);
    expect(serviceProblem(service({ categoryIds: [] }))).toMatch(/category/);
    expect(serviceProblem(service({ imageUrl: "http://x.com/a.png" }))).toMatch(/https/);
    expect(serviceProblem(service({ canonicalUrl: "x.com" }))).toMatch(/canonical/i);
  });
  it("validates a category", () => {
    expect(categoryProblem({ ...seo, code: "01", slug: "ac", nameEn: "AC", nameAr: "تكييف", shortDescriptionEn: "", shortDescriptionAr: "", descriptionEn: "", descriptionAr: "", iconName: "", imageUrl: "", active: false })).toBeNull();
  });
  it("makes unique slugs", () => {
    expect(uniqueSlug("Water Tank Cleaning", new Set())).toBe("water-tank-cleaning");
    expect(uniqueSlug("Water Tank Cleaning", new Set(["water-tank-cleaning", "water-tank-cleaning-2"]))).toBe("water-tank-cleaning-3");
  });
});

describe("CSV", () => {
  it("parses quotes, commas, newlines and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","he said ""hi""\nthere"\n')).toEqual([["a", "b"], ["x, y", 'he said "hi"\nthere']]);
  });
  it("reads services with several categories", () => {
    const { rows, issues } = parseServicesCsv("category,name_en,name_ar,active\nplumbing|cleaning,Water Tank Cleaning,تنظيف الخزانات,yes\n,No cat,بدون,\n");
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryRefs).toEqual(["plumbing", "cleaning"]);
    expect(rows[0].active).toBe(true);
    expect(issues).toEqual([{ line: 3, message: "Category is required." }]);
  });
  it("reports missing columns", () => {
    expect(parseServicesCsv("name_en\nx").issues[0].message).toMatch(/Missing column/);
  });
});
