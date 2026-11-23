import { describe, expect, it } from "vitest";
import { publishProblems, sectionFieldKeys, type FieldValue } from "../content";
import { SEED_CATEGORIES, SEED_DOCUMENTS, SEED_FIELDS } from "./index";
import { seedCode, toSections, toSeo } from "./convert";

const URLS = [
  "terms-and-conditions", "customer-service-agreement", "booking-policy", "cancellation-policy", "rescheduling-policy", "refund-policy", "pricing-policy", "customer-rights",
  "ac-maintenance-policy", "ac-cleaning-policy", "electrical-services-policy", "plumbing-policy", "painting-policy", "carpentry-policy", "tiling-policy", "wallpaper-policy",
  "service-warranty", "quality-standards", "health-and-safety", "complaints-policy", "privacy-policy", "data-protection", "cookie-policy", "acceptable-use", "ai-disclosure",
  "corporate-agreement", "corporate-payment-terms", "supplier-policy", "workforce-code-of-conduct", "anti-fraud-compliance",
];

const fields: Record<string, FieldValue> = Object.fromEntries(SEED_FIELDS.map((f) => [f.key, { valueEn: f.valueEn, valueAr: f.valueAr, confirmed: f.confirmed }]));

describe("the 30 starter documents", () => {
  it("are exactly the 30 of the brief, numbered 1-30 with the brief's addresses", () => {
    expect(SEED_DOCUMENTS.map((d) => d.slug)).toEqual(URLS);
    expect(SEED_DOCUMENTS.map((d) => d.number)).toEqual(URLS.map((_, i) => i + 1));
    expect(seedCode(7)).toBe("OSTA-LEG-007");
  });
  it("sit in the six categories A-F, in the brief's counts (8, 8, 4, 5, 3, 2)", () => {
    expect(SEED_CATEGORIES.map((c) => c.key)).toEqual(["A", "B", "C", "D", "E", "F"]);
    const count = (k: string) => SEED_DOCUMENTS.filter((d) => d.cat === k).length;
    expect(["A", "B", "C", "D", "E", "F"].map(count)).toEqual([8, 8, 4, 5, 3, 2]);
  });
  it("have a title, a summary, an introduction and SEO text in both languages", () => {
    for (const d of SEED_DOCUMENTS) {
      for (const v of [d.titleEn, d.titleAr, d.summaryEn, d.summaryAr, d.introEn, d.introAr, d.seoTitleEn, d.seoTitleAr, d.seoDescEn, d.seoDescAr]) expect(v.trim(), `${d.slug} missing text`).not.toBe("");
      expect(d.seoDescEn.length, d.slug).toBeLessThanOrEqual(320);
    }
  });
  it("only link to documents that exist, never to themselves", () => {
    for (const d of SEED_DOCUMENTS) {
      expect(d.related.length, d.slug).toBeGreaterThan(0);
      for (const r of d.related) { expect(URLS, `${d.slug} -> ${r}`).toContain(r); expect(r).not.toBe(d.slug); }
    }
  });
  it("use only decisions that exist in the field list, and every field is used somewhere", () => {
    const defined = new Set(SEED_FIELDS.map((f) => f.key));
    const used = new Set<string>();
    for (const d of SEED_DOCUMENTS) {
      for (const k of sectionFieldKeys({ draftIntroEn: d.introEn, draftIntroAr: d.introAr, sections: toSections(d) })) { expect(defined.has(k), `${d.slug} uses unknown {{${k}}}`).toBe(true); used.add(k); }
    }
    expect([...defined].filter((k) => !used.has(k))).toEqual([]);
  });
  it("are complete in both languages: the only thing stopping a publish is an unconfirmed decision", () => {
    for (const d of SEED_DOCUMENTS) {
      const problems = publishProblems({ titleEn: d.titleEn, titleAr: d.titleAr, summaryEn: d.summaryEn, summaryAr: d.summaryAr, draftIntroEn: d.introEn, draftIntroAr: d.introAr, sections: toSections(d), seo: toSeo(d) }, fields);
      expect(problems.filter((p) => !/not confirmed yet/.test(p)), d.slug).toEqual([]);
    }
  });
  it("keep every clause of the live Terms: 100 numbered clauses in document 1", () => {
    const terms = SEED_DOCUMENTS[0];
    expect(terms.sections.filter((s) => s[0] === 2)).toHaveLength(100);
    expect(terms.sections.filter((s) => s[0] === 1)).toHaveLength(11); // 10 parts and the contact block
  });
  it("hold back the electrical policy until the owner confirms what the licence allows", () => {
    const elec = SEED_DOCUMENTS.find((d) => d.slug === "electrical-services-policy")!;
    const problems = publishProblems({ titleEn: elec.titleEn, titleAr: elec.titleAr, summaryEn: "", summaryAr: "", draftIntroEn: elec.introEn, draftIntroAr: elec.introAr, sections: toSections(elec), seo: toSeo(elec) }, fields);
    expect(problems.join(" ")).toMatch(/electrical_scope/);
  });
  it("have unique section ids inside each document", () => {
    for (const d of SEED_DOCUMENTS) { const ids = toSections(d).map((s) => s.id); expect(new Set(ids).size, d.slug).toBe(ids.length); }
  });
});
