import { describe, it, expect } from "vitest";
import { applyAdjustments, buildSnapshot, isNotIncluded, type ContractSnapshot } from "./snapshot";
import { DEFAULT_CLAUSES } from "./clauses";
import type { Pkg, PkgService } from "@/lib/maintenance/packages";

const services: PkgService[] = [
  { id: "s1", nameEn: "Preventive AC Maintenance", nameAr: "الصيانة الوقائية", showInComparison: true },
  { id: "s2", nameEn: "24/7 Emergency", nameAr: "الطوارئ", showInComparison: true },
  { id: "s3", nameEn: "Duct Cleaning", nameAr: "تنظيف المجاري", showInComparison: true },
  { id: "s4", nameEn: "Handyman", nameAr: "هاندي مان", showInComparison: true, metric: "handyman_hours" },
];
const pkg: Pkg = { id: "p2", nameEn: "Gold", nameAr: "الذهبية", descriptionEn: "", descriptionAr: "", suitableEn: "", suitableAr: "", price: 1499, maxAcUnits: 5, badgeEn: "", badgeAr: "", highlighted: false, bullets: [{ en: "Priority", ar: "أولوية" }],
  lines: [{ serviceId: "s1", quantityEn: "2 visits/year", quantityAr: "زيارتان" }, { serviceId: "s2", quantityEn: "Included", quantityAr: "مشمول" }, { serviceId: "s4", quantityEn: "4 hours", quantityAr: "4 ساعات", limit: 4 }, { serviceId: "s3", quantityEn: "—", quantityAr: "—" }] };
const line = (key: string, labelEn: string, amount: number | null, note: "base" | "extra" | "quote" | "included", qty = 1) => ({ key, labelEn, labelAr: `${labelEn}-ar`, qty, unitPrice: amount, amount, note });
const make = (pricesIncludeVat: boolean): ContractSnapshot => buildSnapshot({
  groupKey: "", customer: { name: "Sara", phone: "+971501234567", whatsapp: "", email: "s@x.com" },
  property: { emirate: "Dubai", area: "", address: "T1", type: "Apartment", bedrooms: 2, bathrooms: 2, floors: 1, size: null, acUnits: 7, notes: "" },
  pkg, services, pageTerms: { en: ["One property."], ar: ["عقار واحد."] }, terms: { id: "t1", version: 2, clauses: DEFAULT_CLAUSES },
  breakdown: { packageId: "p2", lines: [line("base", "Gold", 1499, "base"), line("extra:ac", "Additional AC Units", 240, "extra", 2), line("opt:o3", "Duct Cleaning", null, "quote"), line("opt:o2", "Emergency", 0, "included")], subtotal: 1739, vat: 82.81, total: pricesIncludeVat ? 1739 : 1825.95, vatPercent: 5, pricesIncludeVat, quote: true, quoteReasons: ["Duct Cleaning"] },
});

describe("the agreement's frozen record", () => {
  it("lists what is included with its quantities, and what is NOT included", () => {
    const s = make(true);
    expect(s.package.lines.map((l) => l.serviceEn)).toEqual(["Preventive AC Maintenance", "24/7 Emergency", "Handyman"]);
    expect(s.package.excluded).toEqual([{ en: "Duct Cleaning", ar: "تنظيف المجاري" }]); // its quantity is "—"
    expect(s.package.acUnitsCovered).toBe(5); expect(s.package.handymanHours).toBe(4);
    expect(s.package.visits[0].en).toContain("2 visits/year");
    expect(s.package.specialTerms.en).toEqual(["One property."]); expect(s.terms.version).toBe(2); expect(s.checks).toHaveLength(5);
  });
  it("keeps the extras, marks included ones as no charge, and lists what still needs a quotation in both languages", () => {
    const s = make(true);
    expect(s.extras.map((e) => [e.labelEn, e.amount, e.included])).toEqual([["Additional AC Units", 240, false], ["Duct Cleaning", null, false], ["Emergency", 0, true]]);
    expect(s.openItems).toEqual([{ en: "Duct Cleaning", ar: "Duct Cleaning-ar" }]);
    expect(s.pricing).toMatchObject({ packagePrice: 1499, additional: 240, discount: 0, vat: 82.81, pricesIncludeVat: true, quote: true });
  });
  it("what counts as 'not included'", () => {
    for (const q of ["", "—", "-", "✗", "No", "N/A"]) expect(isNotIncluded(q), q).toBe(true);
    for (const q of ["Included", "2 visits", "✓", "Unlimited calls"]) expect(isNotIncluded(q), q).toBe(false);
  });
});

describe("changing the price (a new version for the customer to accept)", () => {
  it("prices the open item, settles it, and keeps VAT inside the total when prices include VAT", () => {
    const r = applyAdjustments(make(true), [{ labelEn: "Duct Cleaning", labelAr: "تنظيف", amount: 300 }], { settleOpenItems: true });
    expect(r.pricing).toMatchObject({ additional: 540, subtotal: 2039, total: 2039, quote: false });
    expect(r.pricing.vat).toBe(97.1); // 2039 * 5 / 105
    expect(r.openItems).toEqual([]); expect(r.extras.some((e) => e.amount == null)).toBe(false);
  });
  it("adds VAT on top when prices exclude it, and a discount lowers the subtotal first", () => {
    const r = applyAdjustments(make(false), [{ labelEn: "Duct Cleaning", labelAr: "", amount: 300 }, { labelEn: "Loyalty", labelAr: "", amount: -100 }], { settleOpenItems: true });
    expect(r.pricing).toMatchObject({ additional: 540, discount: 100, subtotal: 1939 });
    expect(r.pricing.vat).toBe(96.95); expect(r.pricing.total).toBe(2035.95); // 1939 + 5%
  });
  it("stays 'to be quoted' while something is unpriced, and a custom-quotation package can be given its price", () => {
    expect(applyAdjustments(make(true), [{ labelEn: "Visit", labelAr: "", amount: 50 }], {}).pricing.quote).toBe(true);
    const custom = { ...make(true), pricing: { ...make(true).pricing, packagePrice: null } };
    expect(applyAdjustments(custom, [], { packagePrice: 2000, settleOpenItems: true }).pricing).toMatchObject({ packagePrice: 2000, quote: false });
    expect(applyAdjustments(custom, [], { settleOpenItems: true }).pricing.quote).toBe(true);
  });
  it("never changes the original snapshot", () => {
    const s = make(true); const before = JSON.stringify(s);
    applyAdjustments(s, [{ labelEn: "X", labelAr: "", amount: 10 }], { settleOpenItems: true });
    expect(JSON.stringify(s)).toBe(before);
  });
});
