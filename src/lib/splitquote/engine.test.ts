import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, type SplitConfig } from "./config";
import { buildLines, linesFromEdit, priceRange, totalsOf } from "./engine";

const CAPS = ["1", "1.5", "2", "2.5", "3", "4", "5"];
const PRICES: Record<string, number[]> = {
  standard: [150, 175, 200, 225, 250, 300, 350], complete: [450, 500, 550, 650, 750, 900, 1100], premium: [600, 650, 700, 800, 950, 1150, 1400],
};
const one = (capacity: string, packageKey: string, qty = 1, cfg: SplitConfig = DEFAULT_CONFIG) => { const r = buildLines(cfg, { units: [{ capacity, packageKey, qty }], services: [] }); if (!r.ok) throw new Error(r.error); return r; };

describe("the launch price list", () => {
  it("has the three packages with the right price for all seven capacities", () => {
    for (const [pkg, prices] of Object.entries(PRICES)) CAPS.forEach((cap, i) => expect(one(cap, pkg).lines[0].unitPrice, `${pkg} ${cap}`).toBe(prices[i]));
  });
  it("names the packages in English and Arabic and gives the copper allowances", () => {
    const p = Object.fromEntries(DEFAULT_CONFIG.packages.map((x) => [x.key, x]));
    expect(p.standard.nameEn).toBe("Standard Installation – Labour Only"); expect(p.standard.nameAr).toBe("التركيب الأساسي – دون خامات");
    expect(p.complete.nameAr).toBe("التركيب الشامل – بخامات حتى 3 متر"); expect(p.premium.nameAr).toBe("التركيب المميز – بخامات حتى 5 متر");
    expect([p.standard, p.complete, p.premium].map((x) => x.copperMeters)).toEqual([0, 3, 5]); expect(p.premium.highlighted).toBe(true);
    expect(p.standard.services.en).toHaveLength(7); expect(p.complete.materials.en).toHaveLength(8); expect(p.complete.notIncluded.en).toHaveLength(11); expect(p.premium.notIncluded.en).toHaveLength(10);
    expect(DEFAULT_CONFIG.conditions.en).toHaveLength(8); expect(DEFAULT_CONFIG.vatPercent).toBe(5);
  });
  it("invents no price for the extras", () => { expect(DEFAULT_CONFIG.extras.length).toBeGreaterThanOrEqual(8); expect(DEFAULT_CONFIG.extras.every((e) => e.price === null)).toBe(true); });
  it("gives the price range of a package", () => { expect(priceRange(PRICES_OF("standard"), CAPS)).toEqual({ min: 150, max: 350 }); });
});
const PRICES_OF = (k: string) => DEFAULT_CONFIG.packages.find((p) => p.key === k)!.prices;

describe("working a quotation out", () => {
  it("adds VAT once, on the subtotal", () => {
    const r = buildLines(DEFAULT_CONFIG, { units: [{ capacity: "1.5", packageKey: "standard", qty: 2 }, { capacity: "3", packageKey: "premium", qty: 1 }, { capacity: "5", packageKey: "complete", qty: 3 }], services: [] });
    if (!r.ok) throw new Error(r.error);
    // 2x175 + 950 + 3x1100 = 4,600 ; VAT 230 ; total 4,830
    expect(r.totals).toMatchObject({ unitCount: 6, unitsTotal: 4600, subtotal: 4600, vat: 230, total: 4830 });
  });
  it("lets every row choose its own package and capacity", () => {
    const r = buildLines(DEFAULT_CONFIG, { units: [{ capacity: "1", packageKey: "standard", qty: 1 }, { capacity: "1", packageKey: "premium", qty: 1 }], services: [] });
    if (!r.ok) throw new Error(r.error); expect(r.lines.map((l) => l.unitPrice)).toEqual([150, 600]); expect(r.lines.map((l) => l.packageKey)).toEqual(["standard", "premium"]);
  });
  it("prices an extra only when the administrator has set a price, otherwise it is a request for quotation", () => {
    const cfg: SplitConfig = { ...DEFAULT_CONFIG, extras: DEFAULT_CONFIG.extras.map((e) => (e.key === "additional-copper" ? { ...e, price: 40 } : e)) };
    const r = buildLines(cfg, { units: [{ capacity: "2", packageKey: "complete", qty: 1 }], services: [{ key: "additional-copper", qty: 4 }, { key: "gas-charging", qty: 1 }] });
    if (!r.ok) throw new Error(r.error);
    expect(r.totals).toMatchObject({ unitsTotal: 550, servicesTotal: 160, subtotal: 710, vat: 35.5, total: 745.5, rfq: true }); expect(r.totals.rfqItems.map((i) => i.en)).toEqual(["Refrigerant gas charging"]);
  });
  it("applies a configured discount before VAT, never more than the items", () => {
    const pct = buildLines({ ...DEFAULT_CONFIG, discount: { enabled: true, type: "percent", value: 10, labelEn: "Discount", labelAr: "خصم" } }, { units: [{ capacity: "2", packageKey: "standard", qty: 1 }], services: [] });
    if (!pct.ok) throw new Error(pct.error); expect(pct.totals).toMatchObject({ discount: 20, subtotal: 180, vat: 9, total: 189 });
    const big = buildLines({ ...DEFAULT_CONFIG, discount: { enabled: true, type: "fixed", value: 99999, labelEn: "D", labelAr: "خ" } }, { units: [{ capacity: "2", packageKey: "standard", qty: 1 }], services: [] });
    if (!big.ok) throw new Error(big.error); expect(big.totals).toMatchObject({ discount: 200, subtotal: 0, total: 0 });
  });
  it("uses the VAT percentage of the price list", () => { expect(one("1", "standard", 1, { ...DEFAULT_CONFIG, vatPercent: 0 }).totals).toMatchObject({ vat: 0, total: 150 }); });
  it("refuses a capacity, package, quantity or extra that is not available, and a package with no price for the capacity", () => {
    const bad = (u: { capacity: string; packageKey: string; qty: number }, cfg = DEFAULT_CONFIG) => buildLines(cfg, { units: [u], services: [] }).ok;
    expect(bad({ capacity: "9", packageKey: "standard", qty: 1 })).toBe(false); expect(bad({ capacity: "1", packageKey: "gold", qty: 1 })).toBe(false); expect(bad({ capacity: "1", packageKey: "standard", qty: 0 })).toBe(false);
    expect(bad({ capacity: "1", packageKey: "standard", qty: 1 }, { ...DEFAULT_CONFIG, packages: DEFAULT_CONFIG.packages.map((p) => ({ ...p, active: p.key !== "standard" })) })).toBe(false);
    expect(bad({ capacity: "1", packageKey: "standard", qty: 1 }, { ...DEFAULT_CONFIG, packages: DEFAULT_CONFIG.packages.map((p) => (p.key === "standard" ? { ...p, prices: {} } : p)) })).toBe(false);
    expect(buildLines(DEFAULT_CONFIG, { units: [{ capacity: "1", packageKey: "standard", qty: 1 }], services: [{ key: "nope", qty: 1 }] }).ok).toBe(false);
  });
});

describe("lines edited by the team", () => {
  it("recomputes the amounts and needs at least one AC unit line", () => {
    const r = one("2", "standard", 2); const edited = linesFromEdit(r.lines.map((l) => ({ ...l, unitPrice: 190 })));
    expect(edited.ok && totalsOf(edited.lines, 5)).toMatchObject({ subtotal: 380, vat: 19, total: 399 });
    expect(linesFromEdit(r.lines.map((l) => ({ ...l, kind: "service" }))).ok).toBe(false);
  });
});
