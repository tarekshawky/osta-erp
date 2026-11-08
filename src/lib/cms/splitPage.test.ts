import { describe, it, expect } from "vitest";
import { SPLIT_FAQ, SPLIT_SEO, mergeSeo, withSplitBlocks } from "./splitPage";

describe("upgrading the existing Split AC page", () => {
  it("has the ten FAQ questions in English and Arabic", () => {
    expect(SPLIT_FAQ).toHaveLength(10); for (const f of SPLIT_FAQ) { expect(f.q.en.length).toBeGreaterThan(10); expect(f.q.ar).toMatch(/[؀-ۿ]/); expect(f.a.ar).toMatch(/[؀-ۿ]/); }
  });
  it("adds the calculator, the FAQ and the related links after the existing blocks, and never touches them", () => {
    const existing = [{ id: "h", type: "hero", props: { heading: { en: "Keep me", ar: "ابقني" } }, hidden: false, visibility: { desktop: true, mobile: true } }];
    const r = withSplitBlocks(existing, [{ slug: "ac-repair", titleEn: "AC Repair", titleAr: "إصلاح المكيفات" }]);
    if (!r.ok) throw new Error(r.error);
    expect(r.blocks.map((b) => b.type)).toEqual(["hero", "splitQuoteCalculator", "faq", "ctaButtons"]); expect(r.blocks[0]).toEqual(existing[0]); expect(r.added).toEqual(["calculator", "faq", "links"]);
    const again = withSplitBlocks(r.blocks, [{ slug: "ac-repair", titleEn: "AC Repair", titleAr: "" }]); expect(again.ok && again.added).toEqual([]);
  });
  it("does not add a second FAQ block when the page already has one", () => {
    const r = withSplitBlocks([{ id: "f", type: "faq", props: {}, hidden: false, visibility: { desktop: true, mobile: true } }]); expect(r.ok && r.added).toEqual(["calculator"]);
  });
  it("fills only the SEO fields that are empty", () => {
    const m = mergeSeo({ titleEn: "My own title", descriptionEn: "" });
    expect(m.titleEn).toBe("My own title"); expect(m.descriptionEn).toBe(SPLIT_SEO.descriptionEn); expect(m.titleAr).toBe(SPLIT_SEO.titleAr); expect(String(m.secondaryKeywords)).toContain("تركيب مكيفات سبليت في الإمارات");
  });
});
