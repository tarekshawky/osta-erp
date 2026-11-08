import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, parseConfig, publicConfig, type AcConfig } from "./config";
import { buildLines, linesFromEdit, totalsOf, InputSchema, type QuoteInput } from "./engine";

const one = (capacity: string, packageKey: "standard" | "complete" | "premium", qty = 1, acType = "ducted-split"): QuoteInput => ({ units: [{ acType, capacity, packageKey, qty }], services: [] });
const ok = (cfg: AcConfig, input: QuoteInput) => { const r = buildLines(cfg, input); if (!r.ok) throw new Error(r.error); return r; };

describe("the price list from the brief", () => {
  // Standard / Complete / Premium TOTAL per unit (base + the AED 250 plenum charge), exactly as in the table.
  const table: [string, number, number, number][] = [["3", 650, 1200, 1500], ["4", 750, 1450, 1750], ["5", 850, 1700, 2050], ["6", 950, 1950, 2350], ["7.5", 1100, 2250, 2750], ["10", 1350, 2850, 3450]];
  it.each(table)("%s Ton: every package total per unit matches the table", (cap, std, comp, prem) => {
    for (const [pkg, expected] of [["standard", std], ["complete", comp], ["premium", prem]] as const) {
      const r = ok(DEFAULT_CONFIG, one(cap, pkg));
      expect(r.totals.baseTotal + r.totals.plenumTotal, `${cap} ${pkg}`).toBe(expected);
      expect(r.totals.plenumTotal).toBe(250);
    }
  });
  it("the worked example: 3 Ton Standard is 400 + 250 = 650; two units are 800 + 500 = 1,300", () => {
    const a = ok(DEFAULT_CONFIG, one("3", "standard"));
    expect(a.lines.map((l) => [l.kind, l.unitPrice, l.amount])).toEqual([["unit", 400, 400], ["plenum", 250, 250]]);
    const b = ok(DEFAULT_CONFIG, one("3", "standard", 2));
    expect(b.totals).toMatchObject({ baseTotal: 800, plenumTotal: 500, subtotal: 1300 });
  });
  it("the plenum charge is applied to EVERY unit, once per unit, not once per quotation", () => {
    const r = ok(DEFAULT_CONFIG, { units: [{ acType: "ducted-split", capacity: "3", packageKey: "standard", qty: 1 }, { acType: "concealed", capacity: "5", packageKey: "complete", qty: 2 }, { acType: "semi-central", capacity: "10", packageKey: "premium", qty: 1 }], services: [] });
    expect(r.lines.filter((l) => l.kind === "plenum").map((l) => l.qty)).toEqual([1, 2, 1]);
    expect(r.totals.plenumTotal).toBe(250 * 4);
    // 400 + 2*1450 + 3200 = 6,500 base; 1,000 plenum
    expect(r.totals).toMatchObject({ baseTotal: 6500, plenumTotal: 1000, subtotal: 7500 });
  });
  it("different units are each priced on their own, with the base price and the plenum shown on separate lines", () => {
    const r = ok(DEFAULT_CONFIG, { units: [{ acType: "ducted-split", capacity: "3", packageKey: "standard", qty: 1 }, { acType: "ducted-split", capacity: "5", packageKey: "complete", qty: 2 }], services: [] });
    expect(r.lines.map((l) => `${l.id}:${l.amount}`)).toEqual(["u0:400", "p0:250", "u1:2900", "p1:500"]);
    expect(r.lines[0].labelEn).toContain("Ducted Split AC – 3 Ton – Standard");
  });
});

describe("VAT", () => {
  it("is added ONCE, on the subtotal, at the configured rate; prices are shown without VAT", () => {
    const r = ok(DEFAULT_CONFIG, one("3", "standard", 2));
    expect(r.totals).toMatchObject({ subtotal: 1300, vatPercent: 5, vat: 65, total: 1365 });
    expect(r.totals.total).toBe(r.totals.subtotal + r.totals.vat);
  });
  it("follows the rate the administrator sets", () => {
    expect(ok({ ...DEFAULT_CONFIG, vatPercent: 0 }, one("3", "standard")).totals).toMatchObject({ vat: 0, total: 650 });
    expect(ok({ ...DEFAULT_CONFIG, vatPercent: 10 }, one("3", "standard")).totals).toMatchObject({ vat: 65, total: 715 });
  });
  it("rounds to fils", () => { expect(totalsOf([{ id: "x", kind: "custom", unitIndex: null, labelEn: "x", labelAr: "x", detailEn: "", detailAr: "", qty: 1, unitPrice: 33.33, amount: 33.33, rfq: false }], 5)).toMatchObject({ vat: 1.67, total: 35 }); });
});

describe("optional services", () => {
  const withPrices: AcConfig = { ...DEFAULT_CONFIG, services: DEFAULT_CONFIG.services.map((s) => (s.key === "additional-copper" ? { ...s, price: 45 } : s.key === "duct-insulation" ? { ...s, price: 30 } : s)) };
  it("a priced service is added to the subtotal; one with no price, or one that needs measuring, is a request for quotation and is NEVER priced by the system", () => {
    const r = ok(withPrices, { ...one("3", "standard"), services: [{ key: "additional-copper", qty: 4 }, { key: "new-duct", qty: 1 }, { key: "supply-diffusers", qty: 3 }, { key: "crane", qty: 1 }] });
    const by = Object.fromEntries(r.lines.filter((l) => l.kind === "service").map((l) => [l.id, l]));
    expect(by["s:additional-copper"]).toMatchObject({ unitPrice: 45, amount: 180, rfq: false });
    for (const k of ["s:new-duct", "s:supply-diffusers", "s:crane"]) expect(by[k], k).toMatchObject({ unitPrice: null, amount: null, rfq: true });
    expect(r.totals).toMatchObject({ servicesTotal: 180, subtotal: 830, rfq: true }); expect(r.totals.rfqItems.map((x) => x.en)).toEqual(["New Duct Fabrication & Installation", "Supply Air Diffusers", "Crane / Lifting Equipment"]);
  });
  it("a service the administrator marks as 'request for quotation' stays that way even with a price on file", () => {
    const cfg = { ...DEFAULT_CONFIG, services: DEFAULT_CONFIG.services.map((s) => (s.key === "new-duct" ? { ...s, price: 999, rfq: true } : s)) };
    expect(ok(cfg, { ...one("3", "standard"), services: [{ key: "new-duct", qty: 1 }] }).totals.servicesTotal).toBe(0);
  });
  it("carries the customer's note on a service (for example what 'Other' means)", () => {
    const r = ok(DEFAULT_CONFIG, { ...one("3", "standard"), services: [{ key: "other", qty: 1, note: "Move the outdoor unit to the roof" }] });
    expect(r.lines.find((l) => l.id === "s:other")?.detailEn).toBe("Move the outdoor unit to the roof");
  });
});

describe("what is refused", () => {
  it("switched-off capacities, packages, types and services, and bad quantities", () => {
    const off: AcConfig = { ...DEFAULT_CONFIG, capacities: DEFAULT_CONFIG.capacities.map((c) => (c.key === "10" ? { ...c, active: false } : c)), packages: DEFAULT_CONFIG.packages.map((p) => (p.key === "premium" ? { ...p, active: false } : p)), acTypes: DEFAULT_CONFIG.acTypes.map((t) => (t.key === "concealed" ? { ...t, active: false } : t)) };
    expect(buildLines(off, one("10", "standard")).ok).toBe(false); expect(buildLines(off, one("3", "premium")).ok).toBe(false); expect(buildLines(off, one("3", "standard", 1, "concealed")).ok).toBe(false);
    expect(buildLines(DEFAULT_CONFIG, one("3", "standard", 1, "nope")).ok).toBe(false); expect(buildLines(DEFAULT_CONFIG, one("8", "standard")).ok).toBe(false);
    expect(buildLines(DEFAULT_CONFIG, { units: [], services: [] }).ok).toBe(false);
    expect(buildLines(DEFAULT_CONFIG, { ...one("3", "standard"), services: [{ key: "nope", qty: 1 }] }).ok).toBe(false);
    expect(InputSchema.safeParse({ units: [{ acType: "ducted-split", capacity: "3", packageKey: "standard", qty: 0 }] }).success).toBe(false);
    expect(InputSchema.safeParse({ units: [{ acType: "ducted-split", capacity: "3", packageKey: "gold", qty: 1 }] }).success).toBe(false);
  });
});

describe("the stored quotation does not move when prices change", () => {
  it("lines are data: a later price change affects only new quotations", () => {
    const first = ok(DEFAULT_CONFIG, one("3", "standard"));
    const raised: AcConfig = { ...DEFAULT_CONFIG, plenum: { ...DEFAULT_CONFIG.plenum, price: 300 }, capacities: DEFAULT_CONFIG.capacities.map((c) => (c.key === "3" ? { ...c, prices: { ...c.prices, standard: 500 } } : c)) };
    expect(ok(raised, one("3", "standard")).totals.subtotal).toBe(800);
    expect(first.totals.subtotal).toBe(650); expect(totalsOf(first.lines, 5).subtotal).toBe(650);
  });
});

describe("a revised quotation (lines edited by an administrator)", () => {
  const base = () => ok(DEFAULT_CONFIG, { ...one("3", "standard"), services: [{ key: "new-duct", qty: 1 }] }).lines;
  it("pricing a line that was a request for quotation brings it into the totals", () => {
    const edited = base().map((l) => (l.id === "s:new-duct" ? { ...l, unitPrice: 1800 } : l));
    const r = linesFromEdit(edited); expect(r.ok).toBe(true);
    if (r.ok) { const t = totalsOf(r.lines, 5); expect(t).toMatchObject({ servicesTotal: 1800, subtotal: 2450, rfq: false }); expect(r.lines.find((l) => l.id === "s:new-duct")).toMatchObject({ amount: 1800, rfq: false }); }
  });
  it("amounts are always recomputed from quantity × price, never taken from the browser", () => {
    const r = linesFromEdit(base().map((l) => (l.id === "u0" ? { ...l, qty: 3, amount: 1 } : l)));
    expect(r.ok && r.lines.find((l) => l.id === "u0")?.amount).toBe(1200);
  });
  it("refuses a quotation with no AC unit, a duplicate id, a negative price and an empty list", () => {
    expect(linesFromEdit(base().filter((l) => l.kind !== "unit")).ok).toBe(false);
    expect(linesFromEdit([...base(), base()[0]]).ok).toBe(false);
    expect(linesFromEdit(base().map((l) => (l.id === "u0" ? { ...l, unitPrice: -5 } : l))).ok).toBe(false);
    expect(linesFromEdit([]).ok).toBe(false);
  });
});

describe("the settings", () => {
  it("what is stored is checked; unreadable settings fall back to the launch values", () => {
    expect(parseConfig({})).toEqual(DEFAULT_CONFIG); expect(parseConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(parseConfig({ ...DEFAULT_CONFIG, vatPercent: 7 }).vatPercent).toBe(7);
    expect(parseConfig({ ...DEFAULT_CONFIG, vatPercent: 500 })).toEqual(DEFAULT_CONFIG);
  });
  it("the website only sees what is switched on, and the launch figures are complete", () => {
    const p = publicConfig({ ...DEFAULT_CONFIG, capacities: DEFAULT_CONFIG.capacities.map((c) => (c.key === "7.5" ? { ...c, active: false } : c)) });
    expect(p.capacities.map((c) => c.key)).toEqual(["3", "4", "5", "6", "7.5", "10"].filter((k) => k !== "7.5"));
    expect(DEFAULT_CONFIG.acTypes).toHaveLength(3); expect(DEFAULT_CONFIG.packages.map((x) => x.key)).toEqual(["standard", "complete", "premium"]); expect(DEFAULT_CONFIG.services).toHaveLength(13);
    expect(DEFAULT_CONFIG.plenum.price).toBe(250); expect(DEFAULT_CONFIG.exclusions.en).toHaveLength(9); expect(DEFAULT_CONFIG.exclusions.ar).toHaveLength(9);
    expect(DEFAULT_CONFIG.services.every((s) => s.price === null)).toBe(true); // no price is invented for extras
  });
});
