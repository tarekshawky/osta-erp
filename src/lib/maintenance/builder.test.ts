import { describe, it, expect } from "vitest";
import { STANDARD_PACKAGES, STANDARD_SERVICES, type Pkg, type PkgService } from "./packages";
import { defaultBuilder, evaluateBuilder, fill, needsProblem, parseBuilder, priceRequest, type BuilderConfig, type EvalInput, type Needs, type Option } from "./builder";

const services: PkgService[] = STANDARD_SERVICES.map((s) => ({ id: s.key, nameEn: s.nameEn, nameAr: s.nameAr, showInComparison: s.showInComparison, metric: s.metric }));
const packages: Pkg[] = STANDARD_PACKAGES.map((p, i) => ({
  id: ["essential", "silver", "gold", "platinum"][i], nameEn: p.nameEn, nameAr: p.nameAr, descriptionEn: "", descriptionAr: "", suitableEn: "", suitableAr: "", price: p.price, maxAcUnits: p.maxAcUnits,
  badgeEn: "", badgeAr: "", highlighted: p.highlighted, bullets: [], lines: p.lines.map((l) => ({ serviceId: l.service, quantityEn: l.en, quantityAr: l.ar, ...(l.limit != null ? { limit: l.limit } : {}) })),
}));
const opt = (id: string, nameEn: string, serviceId: string | null, extraPrice: number | null = null, upgradeTrigger = true): Option => ({ id, category: "general", nameEn, nameAr: `${nameEn} ع`, serviceId, extraPrice, upgradeTrigger });
const options: Option[] = [
  opt("o-ac", "AC Preventive Maintenance", "ac"), opt("o-vents", "AC Duct Vent Cleaning", "vents"), opt("o-carp", "Minor Carpentry", "carpentry"), opt("o-heater", "Water Heater Maintenance", null, 80),
  opt("o-tank", "Water Tank Inspection", null), opt("o-plumb", "Plumbing Inspection", "plumbing"),
];
const tax = { vatRatePercent: 5, pricesIncludeVat: true };
const base: Needs = { acUnits: 2, handymanHours: 0, optionIds: [], extras: {} };
const run = (selectedId: string, needs: Partial<Needs>, over: Partial<EvalInput> = {}) =>
  evaluateBuilder({ packages, services, options, config: defaultBuilder(), tax, selectedId, needs: { ...base, ...needs }, ...over });

describe("AC units", () => {
  it("Essential with 5 AC units: a message to upgrade to Gold, the price difference, and no automatic switch", () => {
    const e = run("essential", { acUnits: 5 });
    expect(e.selectedFits).toBe(false);
    const n = e.notices.find((x) => x.kind === "ac")!;
    expect(n.upgradeTo).toBe("gold");
    expect(n.en).toBe("You have selected 5 AC units, while your current package covers only 2 units. Upgrade to Gold Package to enjoy coverage for up to 5 AC units.");
    expect(n.ar).toContain("5 مكيفات"); expect(n.ar).toContain("الباقة الذهبية");
    expect(e.recommendedId).toBe("gold");
    expect(e.recommendation).toMatchObject({ packageId: "gold", priceDiff: 800, acCovers: 5, custom: false });
    expect(e.best!.en).toBe("Based on your requirements, Gold Package is the best package for your property.");
    expect(e.breakdown.packageId).toBe("essential"); // never switched without the customer's consent
  });
  it("lists what the recommended package adds", () => {
    const added = run("essential", { acUnits: 5 }).recommendation!.addedServices.map((s) => s.en);
    expect(added).toEqual(expect.arrayContaining(["Handyman Services", "AC Duct Vent Cleaning", "24/7 Emergency Call Reception"]));
    expect(added).not.toContain("Preventive AC Maintenance"); // Essential already has it
  });
  it("the units beyond the package are an extra: priced if the admin set a price, otherwise a quotation request", () => {
    const quoted = run("essential", { acUnits: 5 }).breakdown;
    expect(quoted.lines.find((l) => l.key === "extra:ac_units")).toMatchObject({ qty: 3, amount: null, note: "quote" });
    expect(quoted.quote).toBe(true);
    const cfg: BuilderConfig = { ...defaultBuilder(), extras: defaultBuilder().extras.map((x) => (x.key === "ac_units" ? { ...x, unitPrice: 120 } : x)) };
    const priced = run("essential", { acUnits: 5 }, { config: cfg }).breakdown;
    expect(priced.lines.find((l) => l.key === "extra:ac_units")).toMatchObject({ qty: 3, unitPrice: 120, amount: 360 });
    expect(priced.subtotal).toBe(699 + 360); expect(priced.quote).toBe(false);
  });
});

describe("services and handyman hours", () => {
  it("a service only a higher package includes suggests that package", () => {
    const e = run("essential", { optionIds: ["o-vents"] });
    const n = e.notices.find((x) => x.kind === "service")!;
    expect(n).toMatchObject({ upgradeTo: "gold", optionId: "o-vents" });
    expect(n.en).toBe("AC Duct Vent Cleaning is included in our Gold Package. Upgrade your plan to enjoy this benefit.");
    expect(e.recommendedId).toBe("gold");
  });
  it("Silver with 3 handyman hours: only Platinum covers them (Gold has 2)", () => {
    const e = run("silver", { acUnits: 3, handymanHours: 3 });
    const n = e.notices.find((x) => x.kind === "handyman")!;
    expect(n.upgradeTo).toBe("platinum");
    expect(n.en).toBe("You need 3 handyman hours. Your current package includes only 1 hour(s). Upgrade to Platinum Package or add extra hours.");
    expect(e.recommendedId).toBe("platinum");
    expect(e.breakdown.lines.find((l) => l.key === "extra:handyman_hours")).toMatchObject({ qty: 2 }); // 3 needed, 1 included
  });
  it("hours within the package need no warning and no charge", () => {
    const e = run("gold", { acUnits: 4, handymanHours: 2 });
    expect(e.notices).toEqual([]); expect(e.selectedFits).toBe(true);
    expect(e.breakdown.lines.some((l) => l.key === "extra:handyman_hours")).toBe(false);
  });
});

describe("not charging twice, and not promising what is not defined", () => {
  it("a service the package includes is listed at no charge", () => {
    const e = run("gold", { acUnits: 4, optionIds: ["o-carp", "o-plumb"] });
    expect(e.breakdown.lines.filter((l) => l.note === "included").map((l) => l.amount)).toEqual([0, 0]);
    expect(e.breakdown.subtotal).toBe(1499); expect(e.breakdown.quote).toBe(false);
  });
  it("a service no package includes is an extra with the admin's price, or a quotation request when it has none", () => {
    const e = run("gold", { acUnits: 4, optionIds: ["o-heater", "o-tank"] });
    expect(e.notices).toEqual([]); // no package offers them, so there is nothing to upgrade to
    expect(e.breakdown.lines.find((l) => l.key === "opt:o-heater")).toMatchObject({ amount: 80, note: "extra" });
    expect(e.breakdown.lines.find((l) => l.key === "opt:o-tank")).toMatchObject({ amount: null, note: "quote" });
    expect(e.breakdown.subtotal).toBe(1499 + 80); expect(e.breakdown.quote).toBe(true); expect(e.breakdown.quoteReasons).toContain("Water Tank Inspection");
  });
  it("a handyman line with no limit covers no hours", () => {
    const noLimit = packages.map((p) => ({ ...p, lines: p.lines.map(({ limit: _l, ...x }) => { void _l; return x; }) }));
    const e = evaluateBuilder({ packages: noLimit, services, options, config: defaultBuilder(), tax, selectedId: "gold", needs: { ...base, acUnits: 4, handymanHours: 1 } });
    expect(e.selectedFits).toBe(false);
  });
  it("other requirements in free text are always a quotation request", () => {
    const b = run("gold", { acUnits: 4, otherText: "Please also repaint the hall" }).breakdown;
    expect(b.quote).toBe(true); expect(b.lines.find((l) => l.key === "extra:other")!.amount).toBeNull();
  });
});

describe("recommendations", () => {
  it("never downgrades: a package that already fits is only confirmed", () => {
    const e = run("platinum", { acUnits: 2 });
    expect(e.selectedFits).toBe(true); expect(e.recommendation).toBeNull(); expect(e.best).toBeNull(); expect(e.recommendedId).toBe("platinum");
  });
  it("picks the cheapest package that fits everything", () => {
    expect(run("essential", { acUnits: 3 }).recommendedId).toBe("silver");
    expect(run("essential", { acUnits: 6 }).recommendedId).toBe("platinum");
  });
  it("needs beyond every package offer a custom quotation", () => {
    const e = run("essential", { acUnits: 12 });
    expect(e.exceedsAll).toBe(true); expect(e.recommendation).toBeNull();
    expect(e.exceeds!.en).toContain("custom quotation"); expect(e.exceeds!.ar).toContain("عرض سعر مخصص");
    expect(e.breakdown.quote).toBe(true);
  });
  it("a customer-chosen extra counts towards the totals", () => {
    expect(run("essential", { acUnits: 2, extras: { ac_units: 3 } }).selectedFits).toBe(false);
  });
});

describe("price and VAT", () => {
  it("prices already include VAT: VAT is the part inside the total", () => {
    const b = priceRequest(packages[2], services, options, defaultBuilder(), { vatRatePercent: 5, pricesIncludeVat: true }, base);
    expect(b.total).toBe(1499); expect(b.vat).toBe(71.38);
  });
  it("prices exclude VAT: VAT is added on top", () => {
    const b = priceRequest(packages[2], services, options, defaultBuilder(), { vatRatePercent: 5, pricesIncludeVat: false }, base);
    expect(b.subtotal).toBe(1499); expect(b.vat).toBe(74.95); expect(b.total).toBe(1573.95);
  });
  it("a custom-quotation package carries no amount", () => {
    const custom: Pkg = { ...packages[3], id: "custom", price: null };
    const b = priceRequest(custom, services, options, defaultBuilder(), tax, base);
    expect(b.lines[0]).toMatchObject({ amount: null, note: "quote" }); expect(b.quote).toBe(true); expect(b.total).toBe(0);
  });
  it("disabled extras are not charged", () => {
    const cfg: BuilderConfig = { ...defaultBuilder(), extras: defaultBuilder().extras.map((x) => (x.key === "visits" ? { ...x, unitPrice: 50, enabled: false } : x)) };
    expect(priceRequest(packages[0], services, options, cfg, tax, { ...base, extras: { visits: 2 } }).lines.some((l) => l.key === "extra:visits")).toBe(false);
    const on: BuilderConfig = { ...defaultBuilder(), extras: defaultBuilder().extras.map((x) => (x.key === "visits" ? { ...x, unitPrice: 50 } : x)) };
    expect(priceRequest(packages[0], services, options, on, tax, { ...base, extras: { visits: 2 } }).subtotal).toBe(699 + 100);
  });
});

describe("configuration and input", () => {
  it("repairs a malformed stored config with the defaults", () => {
    for (const raw of [null, undefined, "x", 42, { fields: "no", extras: "no", messages: 3 }, {}]) expect(parseBuilder(raw).propertyTypes.length).toBe(8);
    const c = parseBuilder({ enabled: true, calculator: false, fields: { whatsapp: "required", area: "nonsense" }, extras: [{ key: "visits", unitPrice: 75, nameEn: "More visits" }, { key: "visits", unitPrice: -5 }], propertyTypes: [{ key: "Villa!", en: "Villa", ar: "فيلا" }, { key: "", en: "x" }] });
    expect(c.enabled).toBe(true); expect(c.calculator).toBe(false); expect(c.fields.whatsapp).toBe("required"); expect(c.fields.area).toBe("optional");
    expect(c.extras.find((x) => x.key === "visits")).toMatchObject({ unitPrice: 75, nameEn: "More visits" });
    expect(c.propertyTypes).toEqual([{ key: "villa", en: "Villa", ar: "فيلا" }]);
  });
  it("fills message placeholders and leaves unknown ones", () => {
    expect(fill("Upgrade to {package} for {max} units {nope}", { package: "Gold", max: 5 })).toBe("Upgrade to Gold for 5 units {nope}");
  });
  it("refuses impossible needs", () => {
    expect(needsProblem(base)).toBeNull();
    for (const bad of [{ ...base, acUnits: -1 }, { ...base, acUnits: 501 }, { ...base, handymanHours: NaN }, { ...base, extras: { visits: 1.5 } }, { ...base, extras: { bogus: 1 } as never }]) expect(needsProblem(bad), JSON.stringify(bad)).not.toBeNull();
  });
});
