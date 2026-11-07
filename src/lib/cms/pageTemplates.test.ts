import { describe, it, expect } from "vitest";
import { PAGE_TEMPLATES } from "./pageTemplates";
import { parseBlocks, type Block } from "./blocks";

// Every English text a template writes needs an Arabic one next to it (the site is bilingual).
function missingArabic(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => missingArabic(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.en === "string" && typeof o.ar === "string" && Object.keys(o).length === 2) return o.en.trim() && !o.ar.trim() ? [path] : [];
    return Object.entries(o).flatMap(([k, v]) => missingArabic(v, `${path}.${k}`));
  }
  return [];
}

describe("page templates", () => {
  it("has the twenty requested templates with unique ids", () => {
    expect(PAGE_TEMPLATES).toHaveLength(20);
    expect(new Set(PAGE_TEMPLATES.map((t) => t.id)).size).toBe(20);
  });
  for (const t of PAGE_TEMPLATES) {
    it(`${t.name}: valid blocks, unique ids, Arabic for every English text`, () => {
      const blocks = t.build();
      expect(blocks.length).toBeGreaterThan(3);
      const parsed = parseBlocks(blocks);
      expect(parsed.ok, parsed.ok ? "" : parsed.error).toBe(true);
      expect(new Set(blocks.map((b: Block) => b.id)).size).toBe(blocks.length);
      expect(blocks.filter((b) => b.type === "hero" || b.type === "heading").length).toBeGreaterThan(0);
      expect(missingArabic(blocks.map((b) => b.props))).toEqual([]);
      expect(t.seo.titleAr && t.seo.descriptionAr && t.seo.titleEn && t.seo.descriptionEn).toBeTruthy();
    });
  }
  it("each build gives fresh block ids", () => {
    const a = PAGE_TEMPLATES[0].build().map((b) => b.id);
    const b = PAGE_TEMPLATES[0].build().map((x) => x.id);
    expect(a.some((id) => b.includes(id))).toBe(false);
  });
  it("service pages mention no prices, reviews or statistics", () => {
    for (const t of PAGE_TEMPLATES) {
      const text = JSON.stringify(t.build().map((b) => b.props));
      expect(text, t.id).not.toMatch(/\bAED\s*\d|\d+\s*%|\d+\+? (years|customers|clients)/i);
    }
  });
});
