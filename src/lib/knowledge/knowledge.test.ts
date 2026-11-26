import { describe, expect, it } from "vitest";
import { LIMITS, autoLines, buildLlmsTxt, contactMismatches, entryProblems, entryState, isAutoSource, isPublicEntry, packageMismatches, readiness, saveProblem, textChanged, type EntryInput, type SyncData } from "./knowledge";
import { SEED_SECTIONS } from "./seed";

const good = { titleEn: "AC repair", titleAr: "تصليح المكيفات", bodyEn: "We repair split AC.", bodyAr: "نصلح مكيفات السبليت.", sourceUrl: "https://www.ostaservices.com/x" };
const input = (o: Partial<EntryInput> = {}): EntryInput => ({ ...good, type: "FAQ", sectionId: "s", visible: true, schemaOn: true, note: "", ...o });
const now = new Date("2026-11-26T10:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000);

const pkg = (o: Partial<SyncData["packages"][number]> = {}): SyncData["packages"][number] => ({ nameEn: "Gold", nameAr: "الذهبية", price: 1499, priceTextEn: "", priceTextAr: "", pricePrefixEn: "", pricePrefixAr: "", maxAcUnits: 6, services: 11, suitableEn: "", suitableAr: "", ...o });
const settings = { phone: "+971 56 867 6036", whatsapp: "971568676036", email: "info@example.com", addressEn: "Paradise Lake Tower B9, Emirates City, Ajman.\nKing Faisal Street, Al Batinah, Umm Al Quwain.", addressAr: "عجمان", hoursEn: "", hoursAr: "" };

describe("what may be published", () => {
  it("wants both languages, no open brackets and a source page", () => {
    expect(entryProblems(good)).toEqual([]);
    expect(entryProblems({ ...good, bodyAr: " " })[0]).toBe("Missing: Arabic text.");
    expect(entryProblems({ ...good, bodyEn: "Licence [licence number]." })[0]).toBe("Still to fill in: [licence number]");
    expect(entryProblems({ ...good, sourceUrl: "" })[0]).toBe("Add the source page.");
    for (const bad of ["javascript:alert(1)", "//evil.com", "www.ostaservices.com", "http://x.com"]) expect(entryProblems({ ...good, sourceUrl: bad }), bad).toHaveLength(1);
    expect(entryProblems({ ...good, sourceUrl: "/areas" })).toEqual([]);
  });
  it("is public only when checked, complete, visible and in a visible section", () => {
    const e = { ...good, visible: true, verifiedAt: ago(1) };
    expect(isPublicEntry(e, true)).toBe(true);
    expect(isPublicEntry({ ...e, verifiedAt: null }, true)).toBe(false);
    expect(isPublicEntry({ ...e, visible: false }, true)).toBe(false);
    expect(isPublicEntry(e, false)).toBe(false);
    expect(isPublicEntry({ ...e, bodyEn: "[price]" }, true)).toBe(false);
  });
  it("asks for a new check after 90 days", () => {
    expect(entryState({ ...good, verifiedAt: null }, now)).toBe("unchecked");
    expect(entryState({ ...good, verifiedAt: ago(89) }, now)).toBe("checked");
    expect(entryState({ ...good, verifiedAt: ago(91) }, now)).toBe("old");
    expect(entryState({ ...good, titleAr: "", verifiedAt: ago(1) }, now)).toBe("incomplete");
  });
  it("drops the check when the text or the source changes, not for spaces or settings", () => {
    expect(textChanged(good, { ...good, bodyEn: `${good.bodyEn} ` })).toBe(false);
    expect(textChanged(good, { ...good, bodyAr: "نص آخر" })).toBe(true);
    expect(textChanged(good, { ...good, sourceUrl: "/other" })).toBe(true);
  });
  it("lets a draft be saved unfinished, but not nameless, unsafe or huge", () => {
    expect(saveProblem(input({ titleAr: "", bodyEn: "", bodyAr: "", sourceUrl: "" }))).toBeNull();
    expect(saveProblem(input({ titleEn: " " }))).toMatch(/English title/);
    expect(saveProblem(input({ type: "NEWS" }))).toMatch(/kind/);
    expect(saveProblem(input({ sourceUrl: "javascript:1" }))).toMatch(/source page/);
    expect(saveProblem(input({ bodyEn: "x".repeat(LIMITS.body + 1) }))).toMatch(/up to/);
  });
});

describe("lines read from other screens", () => {
  const data: SyncData = { settings, packages: [pkg({ suitableEn: "up to 5 AC units" })], areas: [{ nameEn: "Ajman", nameAr: "عجمان" }], profiles: [{ platform: "x", label: "Our X", url: "https://x.com/ostaservices" }] };
  it("builds a package line from its price and limits, never from the free text", () => {
    expect(autoLines("packages", data)[0]).toMatchObject({ titleEn: "Gold", bodyEn: "AED 1,499 per year. Maximum AC units: 6. Services included: 11." });
    expect(autoLines("packages", { ...data, packages: [pkg({ price: null, priceTextEn: "Custom quotation", maxAcUnits: null, services: 0 })] })[0].bodyEn).toBe("Custom quotation.");
  });
  it("lists contact details that are filled in, areas and profiles", () => {
    expect(autoLines("contact", data).map((l) => l.titleEn)).toEqual(["Phone", "WhatsApp", "Email", "Offices"]);
    expect(autoLines("areas", data)[0].bodyAr).toContain("عجمان");
    expect(autoLines("profiles", data)[0]).toMatchObject({ titleEn: "X", sourceUrl: "https://x.com/ostaservices" });
    expect(autoLines("", data)).toEqual([]);
  });
});

describe("AI readiness", () => {
  it("finds a package description that contradicts its limit", () => {
    expect(packageMismatches([pkg({ suitableEn: "Villa with up to 6 bedrooms – up to 5 AC units.", suitableAr: "للفيلات حتى 3 غرف – حتى 6 مكيفات." })])).toEqual(["Gold: the English description says 5 AC units, the package limit is 6."]);
    expect(packageMismatches([pkg({ suitableEn: "up to 6 AC units", suitableAr: "حتى مكيفين" })])).toEqual([]);
  });
  it("finds a location whose phone or district differs from Site & contact", () => {
    const found = contactMismatches(settings, [
      { name: "Ajman Branch", phone: "+971568676036", locality: "Emirates City, Ajman" },
      { name: "Al Ain Branch", phone: "+971502032086", locality: "Al Noud, Wadi Al Ain" },
      { name: "UAQ Branch", phone: "", locality: "Al Butain" },
    ]);
    expect(found).toHaveLength(3);
    expect(found[0]).toContain("+971502032086");
    expect(found.join()).toContain("Al Noud");
    expect(found.join()).toContain("Al Butain");
  });
  it("passes only what is really in order", () => {
    const base = { llmsPublished: true, settings, packages: [pkg()], branches: [], now };
    const ok = readiness({ ...base, entries: [{ ...good, verifiedAt: ago(1), visible: true, sectionVisible: true }, { ...good, bodyAr: "", verifiedAt: null, visible: false, sectionVisible: true }] });
    expect(ok.map((c) => c.ok)).toEqual([true, true, true, true, true]);
    const bad = readiness({ ...base, llmsPublished: false, entries: [{ ...good, verifiedAt: null, visible: true, sectionVisible: true }] });
    expect(bad.filter((c) => !c.ok).map((c) => c.id)).toEqual(["checked", "llms"]);
    expect(readiness({ ...base, entries: [] }).filter((c) => !c.ok).map((c) => c.id)).toEqual(["complete", "checked"]);
  });
});

describe("llms.txt", () => {
  it("lists public lines with their source, in one line each, and skips empty sections", () => {
    const text = buildLlmsTxt({ siteName: "Osta", summary: "A UAE\ncompany.", origin: "https://www.ostaservices.com", sections: [
      { title: "Services", lines: [{ titleEn: "AC [repair]", bodyEn: "Split\n\nand central.", sourceUrl: "/ac" }, { titleEn: "Ajman", bodyEn: "Covered.", sourceUrl: "" }] },
      { title: "Empty", lines: [] },
    ] });
    expect(text).toBe("# Osta\n\n> A UAE company.\n\n## Services\n- [AC repair](https://www.ostaservices.com/ac): Split and central.\n- Ajman: Covered.\n");
  });
});

describe("starting content", () => {
  const entries = SEED_SECTIONS.flatMap((s) => s.entries);
  it("can be saved as it is, with unique section keys and known automatic sources", () => {
    for (const e of entries) expect(saveProblem(input({ ...e, note: e.note ?? "", sectionId: "s" })), e.titleEn).toBeNull();
    expect(new Set(SEED_SECTIONS.map((s) => s.key)).size).toBe(SEED_SECTIONS.length);
    for (const s of SEED_SECTIONS) if (s.auto) expect(isAutoSource(s.auto)).toBe(true);
  });
  it("has Arabic for everything and an https source for every entry", () => {
    for (const e of entries) {
      expect(e.titleAr.trim() && e.bodyAr.trim(), e.titleEn).toBeTruthy();
      expect(e.sourceUrl.startsWith("https://"), e.titleEn).toBe(true);
    }
  });
  it("holds back every fact the owner still has to supply", () => {
    const open = entries.filter((e) => entryProblems(e).length).map((e) => e.titleEn);
    expect(open).toEqual(["Legal name", "Working hours and 24/7", "Cancellation", "Which AC brands are covered in the guides?", "What is the cancellation policy?", "Is Osta a registered company?", "How much does AC cleaning or gas filling cost?"]);
  });
  it("keeps outside research and the electrical service hidden", () => {
    expect(entries.filter((e) => e.note?.startsWith("From outside research")).every((e) => e.hidden)).toBe(true);
    expect(entries.find((e) => e.titleEn === "Technical maintenance")?.hidden).toBe(true);
  });
});
