import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, parseConfig, publicConfig, type DuctConfig } from "./config";
import { buildDuct, linesFromEdit, reviewItems, sectionArea, totalsOf, InputSchema, type DuctInput, type SectionInput } from "./engine";

const area = (id: string, system: string, a: number, mode: SectionInput["mode"] = "supply-fabricate-install"): SectionInput => ({ id, method: "area", system, mode, area: a });
const input = (sections: SectionInput[], extra: Partial<DuctInput> = {}): DuctInput => ({ sections, accessories: [], services: [], ...extra });
const ok = (cfg: DuctConfig, i: DuctInput) => { const r = buildDuct(cfg, i); if (!r.ok) throw new Error(r.error); return r; };
const priced: DuctConfig = { ...DEFAULT_CONFIG,
  accessories: DEFAULT_CONFIG.accessories.map((a) => (a.key === "supply-diffuser" ? { ...a, prices: { PCS: 100 } } : a.key === "duct-sealing" ? { ...a, prices: { m2: 8, LOT: 500 } } : a)),
  services: DEFAULT_CONFIG.services.map((s) => (s.key === "site-measurement" ? { ...s, price: 500 } : s)),
};

describe("the three duct systems and their launch rates", () => {
  it("prices each system on its own at AED 130 / 170 / 160 per m² — the example of the brief: 29,600 + 2,000 + 500 = 32,100, VAT 1,605, total 33,705", () => {
    const r = ok(priced, input([area("a", "gi", 100), area("b", "gi-fiberglass", 60), area("c", "pir", 40)], { accessories: [{ key: "supply-diffuser", unit: "PCS", qty: 20 }], services: [{ key: "site-measurement", qty: 1 }] }));
    expect(r.lines.filter((l) => l.kind === "duct").map((l) => [l.system, l.qty, l.unitPrice, l.amount])).toEqual([["gi", 100, 130, 13000], ["gi-fiberglass", 60, 170, 10200], ["pir", 40, 160, 6400]]);
    expect(r.totals).toMatchObject({ ductSubtotal: 29600, accessoriesSubtotal: 2000, servicesSubtotal: 500, discount: 0, subtotal: 32100, vatPercent: 5, vat: 1605, total: 33705, totalArea: 200 });
    expect(r.totals.areas.map((a) => [a.system, a.area])).toEqual([["gi", 100], ["gi-fiberglass", 60], ["pir", 40]]);
  });
  it("sections of the same system are added together, sections of different systems are never mixed", () => {
    const r = ok(DEFAULT_CONFIG, input([area("a", "gi", 30), area("b", "pir", 10), area("c", "gi", 20.5)]));
    expect(r.lines.map((l) => [l.system, l.qty, l.amount])).toEqual([["gi", 50.5, 6565], ["pir", 10, 1600]]);
    expect(r.lines[0].detailEn).toBe("2 sections");
  });
});

describe("area from dimensions", () => {
  it("rectangular duct: 2 × (width + height) × length × quantity, with millimetres turned into metres", () => {
    expect(sectionArea({ id: "x", method: "rect", system: "gi", mode: "supply-fabricate-install", widthMm: 400, heightMm: 300, lengthM: 10, qty: 2 })).toBe(28); // 2 × 0.7 × 10 × 2
    expect(sectionArea({ id: "x", method: "rect", system: "gi", mode: "supply-fabricate-install", widthMm: 600, heightMm: 400, lengthM: 3.5, qty: 1 })).toBe(7); // 2 × 1.0 × 3.5
  });
  it("circular duct: π × diameter × length × quantity", () => {
    expect(sectionArea({ id: "x", method: "round", system: "gi", mode: "supply-fabricate-install", diameterMm: 300, lengthM: 10, qty: 1 })).toBe(9.42);
    expect(sectionArea({ id: "x", method: "round", system: "gi", mode: "supply-fabricate-install", diameterMm: 250, lengthM: 6, qty: 4 })).toBe(18.85); // π × 0.25 × 6 × 4
  });
  it("a total area typed from a BOQ is used as it is (the section count is information only)", () => {
    expect(sectionArea({ id: "x", method: "area", system: "gi", mode: "supply-fabricate-install", area: 123.456, sections: 12 })).toBe(123.46);
  });
  it("totals per system add the sections of each system, with the total ductwork area", () => {
    const r = ok(DEFAULT_CONFIG, input([
      { id: "r", method: "rect", system: "gi", mode: "supply-fabricate-install", widthMm: 400, heightMm: 300, lengthM: 10, qty: 2 },
      { id: "c", method: "round", system: "gi", mode: "supply-fabricate-install", diameterMm: 300, lengthM: 10, qty: 1 },
      area("p", "pir", 12.5),
    ]));
    expect(r.sections.map((s) => s.areaM2)).toEqual([28, 9.42, 12.5]);
    expect(r.totals.areas.map((a) => [a.system, a.area])).toEqual([["gi", 37.42], ["pir", 12.5]]); expect(r.totals.totalArea).toBe(49.92);
    expect(r.totals.ductSubtotal).toBeCloseTo(37.42 * 130 + 12.5 * 160, 2);
  });
  it("refuses missing, zero, negative and absurd dimensions", () => {
    const base = { id: "x", system: "gi", mode: "supply-fabricate-install" as const };
    for (const s of [{ ...base, method: "rect" as const, widthMm: 400, heightMm: 300, lengthM: 0, qty: 1 }, { ...base, method: "rect" as const, widthMm: 0, heightMm: 300, lengthM: 5, qty: 1 }, { ...base, method: "rect" as const, widthMm: 400, heightMm: 300, lengthM: 5, qty: 0 }, { ...base, method: "rect" as const, widthMm: 400, heightMm: 300, lengthM: 5, qty: 1.5 },
      { ...base, method: "round" as const, diameterMm: -5, lengthM: 5, qty: 1 }, { ...base, method: "area" as const, area: 0 }, { ...base, method: "area" as const, area: -4 }, { ...base, method: "area" as const, area: 1e9 }, { ...base, method: "round" as const, diameterMm: NaN, lengthM: 5, qty: 1 }])
      expect(buildDuct(DEFAULT_CONFIG, input([s])).ok, JSON.stringify(s)).toBe(false);
  });
});

describe("the type of work is decided by the administrator, not assumed", () => {
  it("fabrication-only and installation-only are not offered (and not priced at the standard rate) until the administrator enables them with a rate", () => {
    expect(buildDuct(DEFAULT_CONFIG, input([area("a", "gi", 10, "fabricate-supply")])).ok).toBe(false);
    expect(buildDuct(DEFAULT_CONFIG, input([area("a", "gi", 10, "install-only")])).ok).toBe(false);
    const cfg: DuctConfig = { ...DEFAULT_CONFIG, systems: DEFAULT_CONFIG.systems.map((s) => (s.key === "gi" ? { ...s, modes: { ...s.modes, "install-only": { enabled: true, rate: 45 }, "fabricate-supply": { enabled: true, rate: null } } } : s)) };
    expect(ok(cfg, input([area("a", "gi", 10, "install-only")])).lines[0]).toMatchObject({ unitPrice: 45, amount: 450, rfq: false });
    const open = ok(cfg, input([area("a", "gi", 10, "fabricate-supply")])); // enabled but no rate set: request for quotation, never the standard 130
    expect(open.lines[0]).toMatchObject({ unitPrice: null, amount: null, rfq: true }); expect(open.totals).toMatchObject({ ductSubtotal: 0, rfq: true });
  });
  it("a custom project requirement is always a request for quotation, kept apart from the standard line of the same system", () => {
    const r = ok(DEFAULT_CONFIG, input([area("a", "gi", 10), area("b", "gi", 5, "custom")]));
    expect(r.lines.map((l) => [l.mode, l.qty, l.amount, l.rfq])).toEqual([["supply-fabricate-install", 10, 1300, false], ["custom", 5, null, true]]);
    expect(r.totals.ductSubtotal).toBe(1300); expect(r.totals.rfqItems[0].en).toContain("Custom Project Requirement");
  });
  it("refuses a switched-off or unknown system", () => {
    const off: DuctConfig = { ...DEFAULT_CONFIG, systems: DEFAULT_CONFIG.systems.map((s) => (s.key === "pir" ? { ...s, active: false } : s)) };
    expect(buildDuct(off, input([area("a", "pir", 10)])).ok).toBe(false); expect(buildDuct(DEFAULT_CONFIG, input([area("a", "tin", 10)])).ok).toBe(false);
  });
});

describe("accessories and services", () => {
  it("a priced component is quantity × unit price in the unit chosen; one with no price is a request for quotation and NEVER priced by the system", () => {
    const r = ok(priced, input([area("a", "gi", 10)], { accessories: [{ key: "duct-sealing", unit: "m2", qty: 10 }, { key: "duct-sealing", unit: "LOT", qty: 1 }, { key: "fire-damper", unit: "PCS", qty: 3 }] }));
    const by = Object.fromEntries(r.lines.filter((l) => l.kind === "accessory").map((l) => [l.id, l]));
    expect(by["a:duct-sealing:m2"]).toMatchObject({ unitPrice: 8, amount: 80 }); expect(by["a:duct-sealing:LOT"]).toMatchObject({ unitPrice: 500, amount: 500 });
    expect(by["a:fire-damper:PCS"]).toMatchObject({ unitPrice: null, amount: null, rfq: true });
    expect(r.totals).toMatchObject({ accessoriesSubtotal: 580, rfq: true });
  });
  it("accessories are NOT assumed to be in the m² rate: with none selected they cost nothing and appear nowhere", () => {
    const r = ok(priced, input([area("a", "gi", 100)])); expect(r.totals.accessoriesSubtotal).toBe(0); expect(r.lines.some((l) => l.kind === "accessory")).toBe(false);
  });
  it("only the units the administrator allows are accepted", () => {
    expect(buildDuct(priced, input([area("a", "gi", 10)], { accessories: [{ key: "supply-diffuser", unit: "LM", qty: 1 }] })).ok).toBe(false);
    expect(buildDuct(priced, input([area("a", "gi", 10)], { accessories: [{ key: "linear-slot-diffuser", unit: "LM", qty: 4 }] })).ok).toBe(true);
    expect(buildDuct(priced, input([area("a", "gi", 10)], { accessories: [{ key: "nope", unit: "PCS", qty: 1 }] })).ok).toBe(false);
  });
  it("a service uses its configured unit and price; ones needing design or inspection stay a request for quotation even with a price on file", () => {
    const cfg: DuctConfig = { ...priced, services: priced.services.map((s) => (s.key === "duct-design" ? { ...s, price: 999 } : s)) };
    const r = ok(cfg, input([area("a", "gi", 10)], { services: [{ key: "site-measurement", qty: 1 }, { key: "duct-design", qty: 1 }, { key: "other-service", qty: 1, note: "Night work" }] }));
    expect(r.lines.filter((l) => l.kind === "service").map((l) => [l.id, l.amount, l.rfq, l.unit])).toEqual([["s:site-measurement", 500, false, "LOT"], ["s:duct-design", null, true, "LOT"], ["s:other-service", null, true, "LOT"]]);
    expect(r.lines.find((l) => l.id === "s:other-service")?.detailEn).toBe("Night work");
  });
});

describe("discount, VAT and minimum quantity", () => {
  const with5 = (d: Partial<DuctConfig["discount"]>): DuctConfig => ({ ...DEFAULT_CONFIG, discount: { ...DEFAULT_CONFIG.discount, enabled: true, ...d } });
  it("no discount unless the administrator switches one on; then a percentage or a fixed amount, never more than the items", () => {
    expect(ok(DEFAULT_CONFIG, input([area("a", "gi", 100)])).totals.discount).toBe(0);
    expect(ok(with5({ type: "percent", value: 10 }), input([area("a", "gi", 100)])).totals).toMatchObject({ ductSubtotal: 13000, discount: 1300, subtotal: 11700, vat: 585, total: 12285 });
    expect(ok(with5({ type: "fixed", value: 500 }), input([area("a", "gi", 100)])).totals).toMatchObject({ discount: 500, subtotal: 12500 });
    expect(ok(with5({ type: "fixed", value: 99999 }), input([area("a", "gi", 10)])).totals).toMatchObject({ discount: 1300, subtotal: 0, vat: 0, total: 0 });
  });
  it("VAT is added ONCE on the subtotal after the discount, at the configured rate", () => {
    const t = ok(DEFAULT_CONFIG, input([area("a", "gi", 100)])).totals; expect(t).toMatchObject({ subtotal: 13000, vat: 650, total: 13650 }); expect(t.total).toBe(t.subtotal + t.vat);
    expect(ok({ ...DEFAULT_CONFIG, vatPercent: 0 }, input([area("a", "gi", 100)])).totals).toMatchObject({ vat: 0, total: 13000 });
  });
  it("a minimum project quantity, when set, is enforced on the total area", () => {
    const min: DuctConfig = { ...DEFAULT_CONFIG, minAreaM2: 50 };
    expect(buildDuct(min, input([area("a", "gi", 30)]))).toMatchObject({ ok: false, error: expect.stringContaining("50 m²") }); expect(buildDuct(min, input([area("a", "gi", 30), area("b", "pir", 20)])).ok).toBe(true);
  });
});

describe("technical specifications", () => {
  it("what the customer did not confirm is listed as subject to technical review, and only for the systems actually used", () => {
    const gi = reviewItems(DEFAULT_CONFIG, ["gi"], { gauge: "22" }).map((i) => i.key); expect(gi).toEqual(["pressure", "application", "indoorOutdoor"]); // gauge confirmed; fiberglass and PIR do not apply
    expect(reviewItems(DEFAULT_CONFIG, ["gi-fiberglass"], { gauge: "not-sure" }).map((i) => i.key)).toEqual(["gauge", "fiberglass", "pressure", "application", "indoorOutdoor"]);
    expect(reviewItems(DEFAULT_CONFIG, ["pir"], { pir: "20mm", pressure: "low", application: "supply", indoorOutdoor: "indoor" })).toEqual([]);
    expect(reviewItems(DEFAULT_CONFIG, ["gi", "pir"], {}).map((i) => i.key)).toEqual(["gauge", "pir", "pressure", "application", "indoorOutdoor"]);
  });
  it("nothing is preselected: every option list starts unchosen and the 'not sure' answer is always possible", () => { expect(InputSchema.safeParse({ sections: [area("a", "gi", 1)] }).success).toBe(true); expect(reviewItems(DEFAULT_CONFIG, ["gi"], {}).length).toBeGreaterThan(0); });
});

describe("a revised quotation (lines edited by an administrator)", () => {
  const base = () => ok(priced, input([area("a", "gi", 100)], { accessories: [{ key: "fire-damper", unit: "PCS", qty: 2 }] })).lines;
  it("pricing a line that was a request for quotation brings it into the totals; amounts are recomputed, never taken from the browser", () => {
    const edited = base().map((l) => (l.id === "a:fire-damper:PCS" ? { ...l, unitPrice: 350, amount: 1 } : l));
    const r = linesFromEdit(edited); expect(r.ok).toBe(true);
    if (r.ok) { const t = totalsOf(r.lines, 5); expect(t).toMatchObject({ accessoriesSubtotal: 700, subtotal: 13700, rfq: false }); expect(r.lines.find((l) => l.id === "a:fire-damper:PCS")?.amount).toBe(700); }
  });
  it("decimal quantities (areas) are kept, and a discount line is subtracted", () => {
    const edited = [...base().map((l) => (l.id === "d:gi:supply-fabricate-install" ? { ...l, qty: 99.75 } : l)), { id: "x1", kind: "discount" as const, system: null, mode: null, labelEn: "Goodwill", labelAr: "", detailEn: "", detailAr: "", qty: 1, unit: "LOT" as const, unitPrice: 200, rfq: false }];
    const r = linesFromEdit(edited); expect(r.ok && totalsOf(r.lines, 5)).toMatchObject({ ductSubtotal: 12967.5, discount: 200, subtotal: 12767.5 });
  });
  it("refuses a quotation with no duct line, a duplicate id, a negative price and an empty list", () => {
    expect(linesFromEdit(base().filter((l) => l.kind !== "duct")).ok).toBe(false); expect(linesFromEdit([...base(), base()[0]]).ok).toBe(false);
    expect(linesFromEdit(base().map((l) => (l.kind === "duct" ? { ...l, unitPrice: -1 } : l))).ok).toBe(false); expect(linesFromEdit([]).ok).toBe(false);
  });
});

describe("the settings", () => {
  it("what is stored is checked; unreadable settings fall back to the launch values; the website sees only what is switched on", () => {
    expect(parseConfig({})).toEqual(DEFAULT_CONFIG); expect(parseConfig({ ...DEFAULT_CONFIG, vatPercent: 500 })).toEqual(DEFAULT_CONFIG); expect(parseConfig({ ...DEFAULT_CONFIG, vatPercent: 7 }).vatPercent).toBe(7);
    const p = publicConfig({ ...DEFAULT_CONFIG, accessories: DEFAULT_CONFIG.accessories.map((a) => (a.key === "fire-damper" ? { ...a, active: false } : a)) });
    expect(p.accessories.some((a) => a.key === "fire-damper")).toBe(false);
  });
  it("the launch figures are complete: three systems with the supplied rates, sixteen components, twelve services, and NO invented prices for extras", () => {
    expect(DEFAULT_CONFIG.systems.map((s) => [s.key, s.modes["supply-fabricate-install"].rate])).toEqual([["gi", 130], ["gi-fiberglass", 170], ["pir", 160]]);
    for (const s of DEFAULT_CONFIG.systems) { expect(s.modes["fabricate-supply"]).toEqual({ enabled: false, rate: null }); expect(s.modes["install-only"]).toEqual({ enabled: false, rate: null }); }
    expect(DEFAULT_CONFIG.accessories).toHaveLength(16); expect(DEFAULT_CONFIG.services).toHaveLength(12); expect(DEFAULT_CONFIG.projectTypes).toHaveLength(11);
    expect(DEFAULT_CONFIG.accessories.every((a) => Object.values(a.prices).every((p) => p === null))).toBe(true); expect(DEFAULT_CONFIG.services.every((s) => s.price === null)).toBe(true);
    expect(DEFAULT_CONFIG.accessories.find((a) => a.key === "linear-slot-diffuser")?.units).toEqual(["LM", "PCS"]); expect(DEFAULT_CONFIG.accessories.find((a) => a.key === "duct-sealing")?.units).toEqual(["m2", "LOT"]);
  });
});
