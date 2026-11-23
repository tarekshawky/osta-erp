import { describe, expect, it } from "vitest";
import { arabicProgress, buildSnapshot, fieldKeysIn, fillFields, numberSections, parseBody, parseInline, publishProblems, readSections, readUrlList, readingMinutes, safeHref, type DraftDoc, type LegalSection } from "./content";

const sec = (o: Partial<LegalSection>): LegalSection => ({ id: "a", level: 2, headingEn: "H", headingAr: "ع", bodyEn: "Text", bodyAr: "نص", ...o });
const doc = (o: Partial<DraftDoc> = {}): DraftDoc => ({ titleEn: "T", titleAr: "ع", summaryEn: "", summaryAr: "", draftIntroEn: "", draftIntroAr: "", sections: [sec({})], seo: {}, ...o });

describe("numbering", () => {
  it("numbers clauses 1, 2, 3 and sub-clauses 2.1, 2.2, leaving part headings unnumbered", () => {
    expect(numberSections([{ level: 1 }, { level: 2 }, { level: 2 }, { level: 3 }, { level: 3 }, { level: 2 }, { level: 3 }])).toEqual(["", "1", "2", "2.1", "2.2", "3", "3.1"]);
  });
});

describe("the writing format", () => {
  it("makes paragraphs, bullets, numbered items, notices, small headings and tables", () => {
    const b = parseBody("First line\ncontinues\n\n### Small\n- one\n- two\n\n1. a\n2. b\n\n> Important\n> more\n\n| Fee | Amount |\n|---|---|\n| Visit | AED 100 |");
    expect(b).toEqual([
      { t: "p", text: "First line continues" },
      { t: "h", text: "Small" },
      { t: "ul", items: ["one", "two"] },
      { t: "ol", items: ["a", "b"] },
      { t: "notice", text: "Important more" },
      { t: "table", rows: [["Fee", "Amount"], ["Visit", "AED 100"]] },
    ]);
  });
  it("keeps bold text and safe links, and turns unsafe links into plain text", () => {
    expect(parseInline("See **this** and [terms](/policies/terms-and-conditions) or [x](javascript:evil).")).toEqual([
      { t: "text", text: "See " }, { t: "bold", text: "this" }, { t: "text", text: " and " }, { t: "link", text: "terms", href: "/policies/terms-and-conditions" }, { t: "text", text: " or " }, { t: "text", text: "x" }, { t: "text", text: "." },
    ]);
    expect(safeHref("//evil.com")).toBe(false);
    expect(safeHref("http://plain.com")).toBe(false);
    expect(safeHref("https://ok.com")).toBe(true);
    expect(safeHref("mailto:a@b.c")).toBe(true);
  });
});

describe("fields", () => {
  it("finds and fills {{field}} markers, in any letter case, once each", () => {
    expect(fieldKeysIn("A {{cancel_hours}} and {{ Visit_Fee }} and {{cancel_hours}}")).toEqual(["cancel_hours", "visit_fee"]);
    expect(fillFields("Cancel {{cancel_hours}}h before; fee {{Visit_Fee}}", { cancel_hours: "24", visit_fee: "AED 100" })).toBe("Cancel 24h before; fee AED 100");
  });
});

describe("what the editor sends", () => {
  it("is cleaned: bad levels become clauses, ids are made safe and unique, text is capped", () => {
    const out = readSections([{ id: "a b!", level: 9, headingEn: "x", headingAr: "y", bodyEn: "z".repeat(30000), bodyAr: 5 }, { id: "ab", level: 3 }, "junk"]);
    expect(out[0].id).toBe("ab");
    expect(out[1].id).toBe("abx");
    expect(out[0].level).toBe(2);
    expect(out[0].bodyEn.length).toBe(20000);
    expect(out[0].bodyAr).toBe("");
    expect(out[2].id).toBe("s3");
    expect(readSections("nope")).toEqual([]);
  });
  it("keeps only attachment links to this site or secure addresses", () => {
    expect(readUrlList([{ label: "A", url: "https://x.com/a.pdf" }, { label: "B", url: "javascript:1" }, { label: "C", url: "/files/c.pdf" }])).toEqual([{ label: "A", url: "https://x.com/a.pdf" }, { label: "C", url: "/files/c.pdf" }]);
  });
});

describe("publishing", () => {
  const fields = { cancel_hours: { valueEn: "24 hours", valueAr: "24 ساعة", confirmed: true } };
  it("accepts a complete bilingual document", () => {
    expect(publishProblems(doc(), {})).toEqual([]);
  });
  it("explains what is missing: titles, clauses, a language, empty sections", () => {
    expect(publishProblems(doc({ titleEn: " ", sections: [] }), {})).toEqual(["The English title is empty.", "The document has no clauses yet."]);
    expect(publishProblems(doc({ sections: [sec({ bodyAr: "" })] }), {})).toEqual(["Section 1: the text is missing in Arabic."]);
    expect(publishProblems(doc({ sections: [sec({ headingEn: "", bodyEn: "", headingAr: "", bodyAr: "" })] }), {})).toEqual(["Section 1 is empty. Fill it in or remove it."]);
    expect(publishProblems(doc({ draftIntroEn: "Hi", draftIntroAr: "" }), {})).toEqual(["The introduction is missing in Arabic."]);
  });
  it("blocks a document that uses a decision nobody has confirmed (or one that does not exist)", () => {
    const d = doc({ sections: [sec({ bodyEn: "Cancel {{cancel_hours}} before", bodyAr: "ألغِ قبل {{cancel_hours}}" })] });
    expect(publishProblems(d, { cancel_hours: { valueEn: "24 hours", valueAr: "24 ساعة", confirmed: false } })[0]).toMatch(/not confirmed/);
    expect(publishProblems(d, { cancel_hours: { valueEn: "24 hours", valueAr: "", confirmed: true } })[0]).toMatch(/not confirmed/);
    expect(publishProblems(d, {})[0]).toMatch(/does not exist/);
    expect(publishProblems(d, fields)).toEqual([]);
  });
  it("freezes the text with each language's confirmed value", () => {
    const d = doc({ draftIntroEn: "Hi {{cancel_hours}}", draftIntroAr: "مرحبا {{cancel_hours}}", sections: [sec({ bodyEn: "Cancel {{cancel_hours}} before", bodyAr: "ألغِ قبل {{cancel_hours}}" })] });
    const s = buildSnapshot(d, fields);
    expect(s.introEn).toBe("Hi 24 hours");
    expect(s.introAr).toBe("مرحبا 24 ساعة");
    expect(s.sections[0].bodyEn).toBe("Cancel 24 hours before");
    expect(s.sections[0].bodyAr).toBe("ألغِ قبل 24 ساعة");
  });
});

describe("small helpers", () => {
  it("reports how much of the document has an Arabic text", () => {
    expect(arabicProgress({ titleAr: "ع", sections: [sec({}), sec({ bodyAr: "" })] })).toBe(80); // title, 2 headings and 1 of 2 bodies = 4 of 5
    expect(arabicProgress({ titleAr: "", sections: [] })).toBe(0);
  });
  it("estimates reading time at about 200 words a minute, at least one minute", () => {
    expect(readingMinutes("word ".repeat(450))).toBe(2);
    expect(readingMinutes("")).toBe(1);
  });
});
