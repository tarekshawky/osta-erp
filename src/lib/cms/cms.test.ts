import { describe, it, expect } from "vitest";
import { BLOCK_REGISTRY, BLOCK_TYPES, createBlock, parseBlocks } from "./blocks";
import { createPreviewToken, publishProblems, slugProblem, slugify, verifyPreviewToken } from "./pageRules";

describe("block registry", () => {
  it("every block's defaults are valid for its own schema", () => {
    for (const type of BLOCK_TYPES) {
      const res = parseBlocks([createBlock(type)]);
      expect(res.ok, type).toBe(true);
      expect(BLOCK_REGISTRY[type].fields.length).toBeGreaterThan(0);
    }
  });
  it("rejects unknown block types and malformed props", () => {
    expect(parseBlocks([{ id: "a", type: "script", props: {}, hidden: false, visibility: { desktop: true, mobile: true } }]).ok).toBe(false);
    const hero = createBlock("hero");
    hero.props.ctas = [{ label: { en: "x", ar: "y" }, url: "javascript:alert(1)" }];
    expect(parseBlocks([hero]).ok).toBe(false);
  });
  it("rejects svg/data images and too many items", () => {
    const b = createBlock("imageText");
    b.props.imageUrl = "data:image/svg+xml;base64,AAAA";
    expect(parseBlocks([b]).ok).toBe(false);
    const faq = createBlock("faq");
    faq.props.items = Array.from({ length: 31 }, () => ({ question: { en: "q", ar: "q" }, answer: { en: "a", ar: "a" } }));
    expect(parseBlocks([faq]).ok).toBe(false);
  });
  it("rejects duplicate block ids", () => {
    const a = createBlock("richText");
    expect(parseBlocks([a, { ...a }]).ok).toBe(false);
  });
});

describe("slugs", () => {
  it("normalises titles to slugs", () => expect(slugify("  Warranty & Terms! ")).toBe("warranty-terms"));
  it("blocks reserved and malformed slugs", () => {
    expect(slugProblem("about")).toMatch(/existing page/);
    expect(slugProblem("Bad Slug")).toBeTruthy();
    expect(slugProblem("")).toBeTruthy();
    expect(slugProblem("warranty-terms")).toBeNull();
  });
});

describe("publishProblems", () => {
  const ok = () => ({ slug: "warranty", titleEn: "Warranty", titleAr: "الضمان", blocks: [createBlock("richText")] });
  it("passes a complete page", () => expect(publishProblems(ok())).toEqual([]));
  it("needs both titles", () => expect(publishProblems({ ...ok(), titleAr: " " }).length).toBe(1));
  it("needs at least one visible block", () => {
    const b = createBlock("richText");
    b.hidden = true;
    expect(publishProblems({ ...ok(), blocks: [b] })[0]).toMatch(/visible block/);
    expect(publishProblems({ ...ok(), blocks: [] })[0]).toMatch(/visible block/);
  });
  it("reports invalid blocks", () => expect(publishProblems({ ...ok(), blocks: "nope" }).length).toBe(1));
});

describe("preview tokens", () => {
  it("accepts a fresh token for the same page only", () => {
    const t = createPreviewToken("page1");
    expect(verifyPreviewToken("page1", t)).toBe(true);
    expect(verifyPreviewToken("page2", t)).toBe(false);
  });
  it("rejects expired and tampered tokens", () => {
    const t = createPreviewToken("page1", 1000, 0);
    expect(verifyPreviewToken("page1", t, 5000)).toBe(false);
    const fresh = createPreviewToken("page1");
    expect(verifyPreviewToken("page1", `${fresh}x`)).toBe(false);
    expect(verifyPreviewToken("page1", "garbage")).toBe(false);
  });
});
