import { describe, it, expect } from "vitest";
import { parseBlocks } from "./blocks";
import { DUCTED_PAGE, DUCTED_SLUG } from "./ductedPage";
import { ICON_NAMES } from "./icons";

const walk = (v: unknown, path: string, out: { path: string; en: string; ar: string }[]) => {
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, out));
  else if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.en === "string" && typeof o.ar === "string" && Object.keys(o).length === 2) out.push({ path, en: o.en, ar: o.ar });
    else for (const [k, x] of Object.entries(o)) walk(x, `${path}.${k}`, out);
  }
};

describe("the ducted AC installation page", () => {
  const blocks = DUCTED_PAGE.blocks();
  it("is made of valid blocks: a hero, the intro, the system types, the calculator, the FAQ and why-choose", () => {
    expect(DUCTED_SLUG).toBe("ducted-ac-installation");
    expect(blocks.map((b) => b.type)).toEqual(["hero", "richText", "benefits", "ductedCalculator", "faq", "benefits", "ctaButtons"]);
    expect(parseBlocks(blocks).ok).toBe(true);
  });
  it("has the headline and the introduction exactly as supplied, in both languages", () => {
    const hero = blocks[0].props as { heading: { en: string; ar: string } };
    expect(hero.heading).toEqual({ en: "Professional Ducted & Concealed AC Installation in UAE", ar: "تركيب مكيفات الدكت والكونسيلد وشبه المركزي باحترافية في الإمارات" });
    const intro = (blocks[1].props as { body: { en: string; ar: string } }).body;
    expect(intro.en).toContain("Osta Services provides reliable installation solutions for ducted split and semi-central AC systems"); expect(intro.ar).toContain("تقدم اسطا للخدمات الفنية خدمات تركيب مكيفات الدكت");
    expect(DUCTED_PAGE.titleEn).toBe("Ducted & Concealed AC Installation UAE | Osta Services"); expect(DUCTED_PAGE.titleAr).toBe("تركيب مكيفات الدكت والكونسيلد وشبه المركزي في الإمارات | اسطا");
  });
  it("every text is written in both languages (no half-translated block)", () => {
    const texts: { path: string; en: string; ar: string }[] = []; walk(blocks.map((b) => b.props), "p", texts);
    const half = texts.filter((t) => (t.en.trim() ? !t.ar.trim() : !!t.ar.trim()));
    expect(half.map((t) => t.path)).toEqual([]);
  });
  it("has the three system types, the ten questions and the eight reasons, with real icons", () => {
    const [types, why] = [blocks[2], blocks[5]].map((b) => (b.props as { items: { icon: string }[] }).items);
    expect(types).toHaveLength(3); expect(why).toHaveLength(8);
    for (const i of [...types, ...why]) expect((ICON_NAMES as readonly string[]).includes(i.icon), i.icon).toBe(true);
    expect((blocks[4].props as { items: unknown[] }).items).toHaveLength(10);
  });
  it("carries the SEO fields from the brief", () => {
    expect(DUCTED_PAGE.seo).toMatchObject({ titleEn: "Ducted AC Installation UAE | Concealed AC Installation | Osta", titleAr: "تركيب مكيفات الدكت والكونسيلد في الإمارات | اسطا", focusKeyword: "Ducted AC Installation UAE" });
    expect(DUCTED_PAGE.seo.descriptionEn.length).toBeLessThanOrEqual(220); expect(DUCTED_PAGE.seo.descriptionAr).toContain("احسب السعر وأنشئ عرضك");
    const kw = DUCTED_PAGE.seo.secondaryKeywords.split(", ");
    for (const k of ["تركيب مكيفات الدكت في الإمارات", "plenum connection", "ducted AC installation Ajman", "تعديل وتوصيل البلينم", "تركيب وحدات التكييف المخفية", "HVAC installation UAE"]) expect(kw, k).toContain(k);
    expect(new Set(kw).size).toBe(kw.length);
  });
});
