import { describe, expect, it } from "vitest";
import { parseLinks } from "@/lib/links/linkCheck";
import { assessLink, backlinkStats, disavowFile, domainOf, isOurDomain, outreachDraft, parseCsv, readImport, readPage, ratingOf, type PageSignals, type RatingInput } from "./backlinks";

const signals = (o: Partial<PageSignals> = {}): PageSignals => ({ title: "", lang: "en", externalLinks: 5, relevant: true, local: true, ...o });
const input = (o: Partial<RatingInput> = {}): RatingInput => ({ sourceUrl: "https://news-site.ae/post", anchorText: "Osta Services", linkType: "dofollow", authority: null, signals: signals(), ...o });
const labels = (i: RatingInput) => assessLink(i).tags.map((t) => t.label);

describe("reading the linking page", () => {
  const html = `<html lang="ar-AE"><head><title> صيانة المكيفات في دبي </title><script>var x="casino"</script></head><body>
    <a href="https://www.ostaservices.com/services">Osta</a><a href="https://other.com/a">x</a><a href="/local">in</a><a href="https://blog.example.com/own">own</a></body></html>`;
  it("takes the title and language, counts links to other sites only, and spots topic and place", () => {
    const s = readPage(html, parseLinks(html, "https://blog.example.com/p"), "https://blog.example.com/p");
    expect(s).toEqual({ title: "صيانة المكيفات في دبي", lang: "ar-ae", externalLinks: 1, relevant: true, local: true });
  });
  it("reads &amp; and numeric codes in the title as the characters they stand for", () => {
    expect(readPage("<title>AC &amp; Cooling &#8211; &#x62F;&unknown;</title>", [], "https://a.com").title).toBe("AC & Cooling \u2013 \u062F&unknown;");
  });
  it("ignores words inside scripts and handles pages without a language", () => {
    const plain = `<html><title>Cooking</title><script>"air conditioning dubai"</script><body>recipes</body></html>`;
    expect(readPage(plain, [], "https://a.com")).toEqual({ title: "Cooking", lang: "", externalLinks: 0, relevant: false, local: false });
  });
});

describe("rating a link", () => {
  it("rates a relevant UAE page with a brand anchor as good, and says why", () => {
    const a = assessLink(input());
    expect(a).toMatchObject({ rating: "good", checked: true });
    expect(labels(input())).toEqual(["UAE domain", "Brand anchor", "Relevant topic", "Mentions the UAE"]);
  });
  it("rates a link farm with a sales anchor in another language as bad", () => {
    const bad = input({ sourceUrl: "https://cheap-links-farm.xyz/p", anchorText: "best ac repair cheap", signals: signals({ lang: "ru", externalLinks: 400, relevant: false, local: false }) });
    const a = assessLink(bad);
    expect(a.rating).toBe("bad");
    expect(a.score).toBe(0);
    expect(labels(bad)).toEqual(["Risky domain ending (.xyz)", "Looks like a link network", "Sales-keyword anchor", "Very many outgoing links (400)", "Unrelated topic", "Other language (ru)"]);
  });
  it("flags spam words in the anchor, address or page title", () => {
    expect(labels(input({ anchorText: "online casino" }))).toContain("Spam words");
    expect(labels(input({ sourceUrl: "https://viagra.example.com/x", anchorText: "" }))).toContain("Spam words");
    expect(labels(input({ anchorText: "AC repair", signals: signals({ title: "Online betting tips" }) }))).toContain("Spam words");
  });
  it("only mentions authority when a file provided it", () => {
    expect(labels(input()).join()).not.toMatch(/authority/i);
    expect(labels(input({ authority: 72 }))).toContain("High authority (72)");
    expect(labels(input({ authority: 10 }))).toContain("Low authority (10)");
  });
  it("shows nofollow, and says when the page was never checked", () => {
    const a = assessLink(input({ sourceUrl: "https://blog-example.com/p", anchorText: "AC gas filling", linkType: "nofollow", signals: null }));
    expect(a).toMatchObject({ checked: false, rating: "neutral", score: 50 });
    expect(a.tags).toEqual([{ label: "Nofollow", tone: "neutral" }]);
  });
  it("uses 70 and 40 as the borders", () => {
    expect([ratingOf(70), ratingOf(69), ratingOf(40), ratingOf(39)]).toEqual(["good", "neutral", "neutral", "bad"]);
  });
  it("trusts official and well-known sites", () => {
    expect(labels(input({ sourceUrl: "https://www.dm.gov.ae/x", signals: null }))).toContain("Official or education site");
    expect(labels(input({ sourceUrl: "https://m.facebook.com/x", signals: null }))).toContain("Well-known site");
    expect(labels(input({ sourceUrl: "https://notfacebook.com/x", signals: null }))).not.toContain("Well-known site");
  });
});

describe("totals", () => {
  const now = new Date("2026-11-25T00:00:00Z");
  const r = (status: string, sourceSite: string, days: number, rating: "good" | "neutral" | "bad") => ({ status, sourceSite, rating, discoveredAt: new Date(now.getTime() - days * 86_400_000).toISOString() });
  it("counts active, new (30 days), bad and distinct referring domains", () => {
    const s = backlinkStats([r("ACTIVE", "a.com", 1, "good"), r("ACTIVE", "a.com", 90, "bad"), r("ACTIVE", "b.com", 31, "neutral"), r("LOST", "c.com", 2, "bad"), r("PENDING", "d.com", 3, "neutral")], now);
    expect(s).toEqual({ active: 3, fresh: 2, bad: 1, domains: 2, quality: { good: 1, neutral: 2, bad: 1 } });
  });
  it("is all zeros with no links", () => {
    expect(backlinkStats([], now)).toEqual({ active: 0, fresh: 0, bad: 0, domains: 0, quality: { good: 0, neutral: 0, bad: 0 } });
  });
});

describe("disavow file and messages", () => {
  it("writes Google's format: unique, sorted domains, never our own, nothing malformed", () => {
    const f = disavowFile(["WWW.Bad.xyz", "bad.xyz", "a-spam.com", "ostaservices.com", "www.ostaservices.com", "not a domain", "x"], "2026-11-25");
    expect(f.split("\n").filter((l) => l && !l.startsWith("#"))).toEqual(["domain:a-spam.com", "domain:bad.xyz"]);
    expect(f.endsWith("\n")).toBe(true);
  });
  it("drafts a removal request that names both pages", () => {
    const d = outreachDraft("removal", "https://x.com/p", "/services");
    expect(d.subject).toMatch(/remove/i);
    expect(d.body).toContain("https://x.com/p");
    expect(d.body).toContain("https://www.ostaservices.com/services");
  });
  it("knows our own domain", () => {
    expect(domainOf("https://WWW.OstaServices.com/a")).toBe("ostaservices.com");
    expect(isOurDomain("blog.ostaservices.com")).toBe(true);
    expect(isOurDomain("notostaservices.com")).toBe(false);
  });
});

describe("CSV import", () => {
  it("reads quotes, commas inside cells, tabs and semicolons", () => {
    expect(parseCsv('a,b\n"x, y","he said ""hi"""\n')).toEqual([["a", "b"], ["x, y", 'he said "hi"']]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("﻿a;b\r\n1;2\r\n\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("reads a Search Console export (linking page only; the target is found by the scan)", () => {
    const r = readImport("Linking page,Last crawled\nhttps://news.ae/a,2026-11-01\nhttps://www.ostaservices.com/self,2026-11-01\nnot-a-url,x\nhttps://news.ae/a,2026-11-02");
    expect(r.rows).toEqual([{ sourceUrl: "https://news.ae/a", targetUrl: "", anchorText: "", linkType: "dofollow", authority: null, discoveredAt: "" }]);
    expect(r.skipped).toBe(3);
  });
  it("reads an Ahrefs-style export with rating, nofollow and first seen", () => {
    const r = readImport('Referring page URL,Target URL,Anchor,Nofollow,Domain rating,First seen\nhttps://b.com/p,https://www.ostaservices.com/pricing,"AC, cleaning",true,63,2026-10-02');
    expect(r.rows[0]).toMatchObject({ targetUrl: "https://www.ostaservices.com/pricing", anchorText: "AC, cleaning", linkType: "nofollow", authority: 63, discoveredAt: "2026-10-02T00:00:00.000Z" });
  });
  it("explains what is wrong with an unusable file", () => {
    expect(readImport("").problem).toMatch(/no rows/);
    expect(readImport("name,age\nx,1").problem).toMatch(/Source URL/);
  });
});
