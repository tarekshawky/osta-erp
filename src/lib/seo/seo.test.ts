import { describe, it, expect } from "vitest";
import { createBlock } from "@/lib/cms/blocks";
import { analyzePage, brokenInternalLinks, collectLinks, type SeoContext, type SeoPageInput } from "./analyze";
import { buildJsonLd, jsonLdProblems } from "./jsonld";

const ctx = (over: Partial<SeoContext> = {}): SeoContext => ({ others: [], knownPaths: new Set(["/", "/services", "/blog", "/about", "/services/ac-repair"]), ...over });
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

function goodPage(): SeoPageInput {
  const hero = createBlock("hero");
  hero.props = { ...hero.props, heading: { en: "AC Repair in Ajman", ar: "تصليح مكيفات" }, subtitle: { en: words(120), ar: "" } };
  return {
    slug: "ac-repair-ajman", type: "page", titleEn: "AC Repair in Ajman", titleAr: "تصليح المكيفات", showInSitemap: true, blocks: [hero],
    seo: {
      titleEn: "AC Repair in Ajman | Fast Same-Day Service", titleAr: "تصليح المكيفات في عجمان | خدمة سريعة في نفس اليوم",
      descriptionEn: "Professional AC repair in Ajman with same-day service, certified technicians and a 14-day warranty on every job we do.",
      descriptionAr: "خدمة تصليح المكيفات في عجمان بفنيين معتمدين وضمان 14 يوماً على كل عمل ونصل إليك في نفس اليوم دائماً.",
      canonical: "", noindex: false, ogImage: "https://x.com/a.jpg", focusKeyword: "ac repair",
    },
  };
}

describe("analyzePage", () => {
  it("a complete page scores 100 with no issues", () => {
    const r = analyzePage(goodPage(), ctx());
    expect(r.issues).toEqual([]);
    expect(r.score).toBe(100);
  });
  it("flags missing and over-long titles and descriptions", () => {
    const p = goodPage();
    p.seo.titleEn = ""; p.seo.descriptionEn = ""; p.seo.titleAr = "x".repeat(70);
    const ids = analyzePage(p, ctx()).issues.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(["title-missing-en", "desc-missing-en", "title-long-ar"]));
  });
  it("flags no H1 and multiple H1s", () => {
    const p = goodPage();
    p.blocks = [createBlock("richText")];
    expect(analyzePage(p, ctx()).issues.map((i) => i.id)).toContain("h1-missing");
    const a = goodPage().blocks[0]; const b = { ...structuredClone(a), id: "other" };
    p.blocks = [a, b];
    const multi = analyzePage(p, ctx()).issues.find((i) => i.id === "h1-multiple");
    expect(multi?.severity).toBe("error");
  });
  it("ignores hidden blocks", () => {
    const p = goodPage(); p.blocks[0].hidden = true;
    expect(analyzePage(p, ctx()).issues.map((i) => i.id)).toContain("h1-missing");
  });
  it("detects broken internal links but not external or existing ones", () => {
    const p = goodPage();
    const cta = createBlock("cta");
    cta.props = { ...cta.props, button: { label: { en: "Go", ar: "اذهب" }, url: "/nope" } };
    p.blocks.push(cta);
    const r = analyzePage(p, ctx());
    expect(r.issues.find((i) => i.id === "broken-link-/nope")?.severity).toBe("error");
    expect(brokenInternalLinks(["/services", "/services/?x=1#a", "https://x.com/zzz", "tel:+97150", "mailto:a@b.c", "/services/ac-repair"], ctx().knownPaths)).toEqual([]);
    expect(collectLinks(p.blocks)).toEqual(["/nope"]);
  });
  it("detects duplicate meta across the site", () => {
    const p = goodPage();
    const r = analyzePage(p, ctx({ others: [{ label: "Other page", titleEn: p.seo.titleEn.toUpperCase() }] }));
    expect(r.issues.map((i) => i.id)).toContain("dup-English SEO title");
  });
  it("warns on noindex + sitemap, bad canonical, thin content, missing alt", () => {
    const p = goodPage();
    p.seo.noindex = true; p.seo.canonical = "ftp://x"; p.blocks[0].props.subtitle = { en: "short", ar: "" };
    const img = createBlock("imageText"); img.props = { ...img.props, imageUrl: "https://x.com/i.jpg" }; p.blocks.push(img);
    const ids = analyzePage(p, ctx()).issues.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(["noindex-sitemap", "canonical-invalid", "thin-content"]));
    expect(ids.some((i) => i.startsWith("alt-missing"))).toBe(true);
  });
  it("checks the focus keyword", () => {
    const p = goodPage(); p.seo.focusKeyword = "plumbing";
    expect(analyzePage(p, ctx()).issues.map((i) => i.id)).toEqual(expect.arrayContaining(["kw-title", "kw-desc", "kw-h1"]));
  });
  it("never scores below zero", () => {
    const p = goodPage(); p.blocks = []; p.seo = { titleEn: "", titleAr: "", descriptionEn: "", descriptionAr: "", canonical: "x", noindex: true, ogImage: "" };
    expect(analyzePage(p, ctx()).score).toBeGreaterThanOrEqual(0);
  });
});

describe("JSON-LD", () => {
  const site = { origin: "https://www.ostaservices.com", name: "OSTA Services", phone: "+971568676036" };
  const page = () => ({ slug: "ac-repair", type: "page", titleEn: "AC Repair", blocks: goodPage().blocks, seo: { descriptionEn: "d" } });
  it("always emits valid WebPage + BreadcrumbList", () => {
    const ld = buildJsonLd(page(), site);
    expect(ld.map((x) => x["@type"])).toEqual(["WebPage", "BreadcrumbList"]);
    expect(jsonLdProblems(ld)).toEqual([]);
  });
  it("emits FAQPage only when there is an FAQ block, and rejects incomplete questions", () => {
    const faq = createBlock("faq");
    faq.props = { heading: { en: "", ar: "" }, items: [{ question: { en: "Q?", ar: "س؟" }, answer: { en: "", ar: "ج" } }] };
    const ld = buildJsonLd({ ...page(), blocks: [faq] }, site);
    expect(ld.map((x) => x["@type"])).toContain("FAQPage");
    expect(jsonLdProblems(ld)[0]).toMatch(/FAQ question 1/);
    faq.props = { heading: { en: "", ar: "" }, items: [{ question: { en: "Q?", ar: "س؟" }, answer: { en: "A", ar: "ج" } }] };
    expect(jsonLdProblems(buildJsonLd({ ...page(), blocks: [faq] }, site))).toEqual([]);
  });
  it("adds Service and Article by page type", () => {
    expect(buildJsonLd({ ...page(), type: "service" }, site).map((x) => x["@type"])).toContain("Service");
    const art = buildJsonLd({ ...page(), type: "article", publishedAt: "2026-01-01" }, site);
    expect(art.map((x) => x["@type"])).toContain("Article");
    expect(jsonLdProblems(art)).toEqual([]);
  });
  it("catches malformed data", () => {
    expect(jsonLdProblems([{ "@type": "WebPage", name: "", url: "" }]).length).toBe(1);
    expect(jsonLdProblems([{ "@type": "BreadcrumbList", itemListElement: [] }]).length).toBe(1);
  });
});
