import { describe, expect, it } from "vitest";
import { normalize, searchDocs, searchTerms, type SearchDoc } from "./search";

const sec = (id: string, level: 1 | 2 | 3, hEn: string, hAr: string, bEn: string, bAr: string) => ({ id, level, headingEn: hEn, headingAr: hAr, bodyEn: bEn, bodyAr: bAr });
const docs: SearchDoc[] = [
  { slug: "cancellation-policy", titleEn: "Cancellation Policy", titleAr: "سياسة إلغاء الحجوزات", categoryKey: "A", countries: ["AE"], version: 1, introEn: "", introAr: "", sections: [
    sec("a", 2, "How to cancel", "كيفية الإلغاء", "Ask us to cancel your AC booking through our official channels.", "اطلب الإلغاء عبر قنواتنا الرسمية."),
    sec("b", 2, "Late cancellation", "الإلغاء المتأخر", "A charge may apply to a late cancellation.", "قد تُطبَّق رسوم على الإلغاء المتأخر."),
  ] },
  { slug: "privacy-policy", titleEn: "Privacy Policy", titleAr: "سياسة الخصوصية", categoryKey: "D", countries: ["AE"], version: 1, introEn: "", introAr: "", sections: [
    sec("c", 2, "Cookies", "ملفات تعريف الارتباط", "We use cookies for the website.", "نستخدم ملفات تعريف الارتباط للموقع."),
  ] },
];

describe("search", () => {
  it("makes Arabic spellings comparable", () => {
    expect(normalize("الإلغاء")).toBe(normalize("الالغاء"));
    expect(normalize("مُكَيِّفات")).toBe("مكيفات");
    expect(normalize("Cancel!")).toBe("cancel");
  });
  it("drops question words and joins word forms", () => {
    expect(searchTerms("Can I cancel my AC booking?")).toEqual(["cancel", "book"]);
    expect(searchTerms("cancelling")).toEqual(searchTerms("cancellation"));
    expect(searchTerms("هل يمكن الإلغاء؟")).toContain("الغاء");
  });
  it("finds the cancellation clauses for a natural question, best first, with the exact section", () => {
    const hits = searchDocs(docs, "Can I cancel my AC booking?", { lang: "en" });
    expect(hits[0]).toMatchObject({ slug: "cancellation-policy", sectionId: "a", number: "1" });
    expect(hits.every((h) => h.slug === "cancellation-policy")).toBe(true);
  });
  it("searches in Arabic", () => {
    const hits = searchDocs(docs, "كيف الغي الحجز؟ الإلغاء", { lang: "ar" });
    expect(hits[0].slug).toBe("cancellation-policy");
    expect(searchDocs(docs, "ملفات تعريف الارتباط", { lang: "ar" })[0]).toMatchObject({ slug: "privacy-policy", sectionId: "c" });
  });
  it("filters by category and country, and returns nothing for nothing", () => {
    expect(searchDocs(docs, "cancel", { lang: "en", category: "D" })).toEqual([]);
    expect(searchDocs(docs, "cancel", { lang: "en", country: "SA" })).toEqual([]);
    expect(searchDocs(docs, "the of", { lang: "en" })).toEqual([]);
  });
  it("gives a short snippet around the match", () => {
    const h = searchDocs(docs, "cookies", { lang: "en" })[0];
    expect(h.snippet).toContain("cookies");
  });
});
