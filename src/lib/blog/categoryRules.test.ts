import { describe, it, expect } from "vitest";
import { categoryProblem, uniqueSlug, MIN_ARTICLES_FOR_INDEX, RESERVED_BLOG_SLUGS, type CategoryInput } from "./categoryRules";
import { DEFAULT_BLOG_CATEGORIES } from "./defaultCategories";

const ok: CategoryInput = { slug: "ac-tips", nameEn: "AC tips", nameAr: "نصائح", descriptionEn: "", descriptionAr: "", seoTitleEn: "", seoTitleAr: "", seoDescriptionEn: "", seoDescriptionAr: "", seoKeywordsEn: "", seoKeywordsAr: "", coverImageUrl: "", active: true };

describe("blog category rules", () => {
  it("accepts a normal category", () => expect(categoryProblem(ok)).toBeNull());
  it("needs both names and a slug", () => {
    expect(categoryProblem({ ...ok, nameEn: " " })).toMatch(/English/);
    expect(categoryProblem({ ...ok, nameAr: "" })).toMatch(/Arabic/);
    expect(categoryProblem({ ...ok, slug: "!!!" })).toMatch(/Slug/);
  });
  it("refuses addresses that belong to the category pages", () => {
    for (const s of RESERVED_BLOG_SLUGS) expect(categoryProblem({ ...ok, slug: s })).toMatch(/reserved/);
  });
  it("refuses over-long SEO text and unsafe cover images", () => {
    expect(categoryProblem({ ...ok, seoTitleEn: "x".repeat(121) })).toMatch(/120/);
    expect(categoryProblem({ ...ok, seoDescriptionAr: "x".repeat(321) })).toMatch(/320/);
    expect(categoryProblem({ ...ok, coverImageUrl: "javascript:alert(1)" })).toMatch(/cover/);
    expect(categoryProblem({ ...ok, coverImageUrl: "https://x.test/a.webp" })).toBeNull();
  });
  it("makes unique slugs", () => {
    expect(uniqueSlug("AC Tips!", new Set())).toBe("ac-tips");
    expect(uniqueSlug("AC Tips", new Set(["ac-tips"]))).toBe("ac-tips-2");
    expect(uniqueSlug("AC Tips", new Set(["ac-tips", "ac-tips-2"]))).toBe("ac-tips-3");
    expect(uniqueSlug("Category", new Set())).toBe("category-2"); // reserved
    expect(uniqueSlug("???", new Set())).toBe("category-2"); // nothing usable: falls back to the reserved word, then numbers
  });
  it("indexes a category only from a few articles", () => expect(MIN_ARTICLES_FOR_INDEX).toBeGreaterThanOrEqual(2));
});

describe("default categories", () => {
  it("are the 20 requested, with unique slugs and both names and descriptions", () => {
    expect(DEFAULT_BLOG_CATEGORIES).toHaveLength(20);
    expect(new Set(DEFAULT_BLOG_CATEGORIES.map((c) => c.slug)).size).toBe(20);
    for (const c of DEFAULT_BLOG_CATEGORIES) {
      expect(categoryProblem({ ...ok, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr })).toBeNull();
      expect(c.descriptionEn.length).toBeGreaterThan(20);
      expect(c.descriptionAr.length).toBeGreaterThan(20);
    }
  });
});
