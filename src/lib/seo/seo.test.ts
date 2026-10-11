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

import { closestMatch, maskNames, pageText, similarity } from "./similarity";
import { aeoChecklist, isQuestionHeading } from "./analyze";

describe("similarity", () => {
  const areaText = (place: string) => `AC repair in ${place} by certified technicians. We fix leaks, noisy units and weak cooling the same day anywhere in ${place}. Call us for a free quote today.`;
  it("identical and unrelated text", () => {
    expect(similarity(areaText("Ajman"), areaText("Ajman"))).toBe(1);
    expect(similarity("alpha beta gamma delta epsilon", "one two three four five")).toBe(0);
    expect(similarity("short", "short")).toBe(0);
  });
  it("a city-swapped copy is a near duplicate once names are masked", () => {
    const raw = similarity(areaText("Ajman"), areaText("Sharjah"));
    const masked = similarity(maskNames(areaText("Ajman"), ["Ajman"]), maskNames(areaText("Sharjah"), ["Sharjah"]));
    expect(masked).toBeGreaterThan(0.99);
    expect(masked).toBeGreaterThan(raw);
  });
  it("genuinely different area content stays low", () => {
    const a = maskNames(areaText("Ajman"), ["Ajman"]);
    const b = maskNames("Near Al Jurf we often see salt-air corrosion on outdoor condensers; our Ajman Free Zone clients book night visits to avoid office hours, and we stock Daikin and Gree parts locally.", ["Ajman"]);
    expect(similarity(a, b)).toBeLessThan(0.2);
    expect(closestMatch(a, [{ label: "x", text: b }, { label: "y", text: a }])?.label).toBe("y");
  });
  it("masks Arabic names too and extracts text per language", () => {
    expect(maskNames("خدمات في عجمان اليوم", ["عجمان"])).toContain("areaname");
    const hero = createBlock("hero");
    hero.props = { ...hero.props, heading: { en: "Hello", ar: "مرحبا" } };
    expect(pageText([hero], "ar")).toContain("مرحبا");
    expect(pageText([hero], "en")).not.toContain("مرحبا");
  });
});

describe("area page duplicate check", () => {
  const body = (place: string) => `Looking for AC repair in ${place}? Our certified technicians diagnose weak cooling, water leaks and strange noises the same day. We service split, central and ducted systems and give a fourteen day warranty on all repair work.`;
  const mk = (place: string) => {
    const t = createBlock("richText");
    t.props = { heading: { en: "Repair", ar: "إصلاح" }, body: { en: body(place), ar: "" }, align: "start" };
    return { ...goodPage(), type: "area", blocks: [...goodPage().blocks, t], areaNames: { en: place, ar: "" } } as SeoPageInput;
  };
  it("blocks a copy-paste area page and ignores a different one", () => {
    const other = { label: "Sharjah", textEn: maskNames(pageText(mk("Sharjah").blocks, "en"), ["Sharjah"]), textAr: "" };
    const dup = analyzePage(mk("Ajman"), ctx({ areaPages: [other] }));
    expect(dup.issues.find((i) => i.id === "area-duplicate")?.severity).toBe("error");
    const distinct = { label: "Al Ain", textEn: "Desert dust clogs filters in Al Ain faster than anywhere else, so we recommend quarterly deep cleans and we carry extra filters on every van for the oasis neighbourhoods.", textAr: "" };
    expect(analyzePage(mk("Ajman"), ctx({ areaPages: [distinct] })).issues.some((i) => i.id.startsWith("area-"))).toBe(false);
  });
  it("only applies to area pages", () => {
    const p = mk("Ajman"); p.type = "page";
    expect(analyzePage(p, ctx({ areaPages: [{ label: "S", textEn: maskNames(pageText(mk("Sharjah").blocks, "en"), ["Sharjah"]), textAr: "" }] })).issues.some((i) => i.id.startsWith("area-"))).toBe(false);
  });
});

describe("AEO checklist", () => {
  it("recognises question headings in English and Arabic", () => {
    for (const h of ["How much does it cost?", "What is included", "هل الضمان متاح؟", "كيف أحجز"]) expect(isQuestionHeading(h), h).toBe(true);
    expect(isQuestionHeading("Our services")).toBe(false);
  });
  it("passes a well-formed page and explains failures", () => {
    const p = goodPage();
    p.blocks[0].props.subtitle = { en: Array.from({ length: 30 }, (_, i) => `w${i}`).join(" "), ar: "" };
    const faq = createBlock("faq");
    faq.props = { heading: { en: "FAQ", ar: "" }, items: Array.from({ length: 3 }, () => ({ question: { en: "How long?", ar: "" }, answer: { en: "A day.", ar: "" } })) };
    p.blocks.push(faq); p.showLastUpdated = true;
    expect(aeoChecklist(p).every((i) => i.pass)).toBe(true);
    const bare = goodPage(); bare.blocks = [createBlock("richText")];
    expect(aeoChecklist(bare).filter((i) => !i.pass).length).toBe(4);
  });
});

describe("LocalBusiness JSON-LD for area pages", () => {
  const site = { origin: "https://www.ostaservices.com", name: "OSTA Services", phone: "+971568676036", email: "info@ostaservices.com", sameAs: ["https://instagram.com/osta"] };
  const area = { nameEn: "Ajman", kind: "emirate", latitude: 25.4052, longitude: 55.5136, mapsUrl: "https://maps.google.com/?q=ajman", serviceNames: ["AC Cleaning"] };
  const page = (a = area) => ({ slug: "ac-repair-ajman", type: "area", titleEn: "AC Repair Ajman", blocks: goodPage().blocks, seo: {}, area: a });
  it("emits a valid LocalBusiness + Service with areaServed and geo", () => {
    const ld = buildJsonLd(page(), site);
    const lb = ld.find((x) => x["@type"] === "HomeAndConstructionBusiness") as Record<string, unknown>;
    expect(lb.telephone).toBe("+971568676036");
    expect((lb.geo as Record<string, unknown>).latitude).toBe(25.4052);
    expect(ld.some((x) => x["@type"] === "Service")).toBe(true);
    expect(jsonLdProblems(ld)).toEqual([]);
  });
  it("blocks when the phone is missing", () => {
    expect(jsonLdProblems(buildJsonLd(page(), { ...site, phone: "" })).join(" ")).toMatch(/phone/);
  });
  it("is not emitted for non-area pages", () => {
    expect(buildJsonLd({ ...page(), type: "page" }, site).some((x) => x["@type"] === "HomeAndConstructionBusiness")).toBe(false);
  });
});

import { redirectProblem } from "@/lib/cms/pageRules";
describe("redirectProblem", () => {
  it("accepts a simple rename and rejects bad input", () => {
    expect(redirectProblem("/old-page", "/new-page")).toBeNull();
    expect(redirectProblem("/old-page", "https://example.com/x")).toBeNull();
    expect(redirectProblem("/a/b", "/c")).toMatch(/single path/);
    expect(redirectProblem("/about", "/c")).toMatch(/real page/);
    expect(redirectProblem("/x", "/x")).toMatch(/itself/);
    expect(redirectProblem("/x", "//evil.com")).toMatch(/To/);
    expect(redirectProblem("/x", "javascript:alert(1)")).toMatch(/To/);
  });
});
