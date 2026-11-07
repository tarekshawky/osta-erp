import { describe, it, expect } from "vitest";
import { STANDARD_PACKAGES, STANDARD_SERVICES, STANDARD_SETTINGS, SubscriptionInput, activationDateProblem, buildComparison, formatPrice, packageProblem, serviceProblem, shortValue, termsList, type Pkg, type PkgService } from "./packages";

// The standard packages as the admin would have them after loading them (service keys turned into ids).
const services: PkgService[] = STANDARD_SERVICES.map((s) => ({ id: s.key, nameEn: s.nameEn, nameAr: s.nameAr, showInComparison: s.showInComparison }));
const pkgs: Pkg[] = STANDARD_PACKAGES.map((p, i) => ({
  id: `p${i}`, nameEn: p.nameEn, nameAr: p.nameAr, descriptionEn: "", descriptionAr: "", suitableEn: p.suitableEn, suitableAr: p.suitableAr, price: p.price, maxAcUnits: p.maxAcUnits,
  badgeEn: p.badgeEn, badgeAr: p.badgeAr, highlighted: p.highlighted,
  lines: p.lines.map((l) => ({ serviceId: l.service, quantityEn: l.en, quantityAr: l.ar, shortEn: l.shortEn, shortAr: l.shortAr })),
}));

describe("standard packages", () => {
  it("have the four prices and limits from the brief, Gold highlighted, and no pest control", () => {
    expect(pkgs.map((p) => p.price)).toEqual([699, 999, 1499, 2299]);
    expect(pkgs.map((p) => p.maxAcUnits)).toEqual([2, 3, 5, 8]);
    expect(pkgs.filter((p) => p.highlighted).map((p) => p.nameEn)).toEqual(["Gold Package"]);
    const ids = new Set(services.map((s) => s.id));
    for (const p of pkgs) expect(packageProblem(p, ids), p.nameEn).toBeNull();
    expect(JSON.stringify([STANDARD_PACKAGES, STANDARD_SERVICES])).not.toMatch(/pest|مكافحة/i);
  });
  it("have 14 terms in each language", () => {
    expect(termsList(STANDARD_SETTINGS.termsEn)).toHaveLength(14);
    expect(termsList(STANDARD_SETTINGS.termsAr)).toHaveLength(14);
  });
  it("every English text has an Arabic one", () => {
    for (const p of pkgs) for (const l of p.lines) expect(l.quantityAr.trim(), `${p.nameEn} ${l.serviceId}`).not.toBe("");
  });
});

describe("comparison table", () => {
  const rows = buildComparison(pkgs, services);
  const row = (key: string) => rows.find((r) => r.key === key)!.cells.map((c) => c.en);
  it("matches the table in the brief", () => {
    expect(row("price")).toEqual(["699", "999", "1,499", "2,299"]);
    expect(row("ac")).toEqual(["2", "3", "5", "8"]);
    expect(row("plumbing")).toEqual(["1", "2", "2", "2"]);
    expect(row("callouts")).toEqual(["2", "4", "6", "8"]);
    expect(row("balcony")).toEqual(["2", "3", "3", "4"]);
    expect(row("handyman")).toEqual(["—", "1", "2", "4"]);
    expect(row("vents")).toEqual(["—", "—", "5 Vents", "10 Vents"]);
    expect(row("emergency")).toEqual(["—", "—", "✓", "✓"]);
    expect(row("priority")).toEqual(["✓", "✓", "✓", "✓"]);
    // the small works inside the handyman allowance stay out of the table, as in the brief
    expect(rows.some((r) => ["carpentry", "painting", "masonry"].includes(r.key))).toBe(false);
  });
  it("follows the packages: a new price or quantity shows straight away, a service nobody includes disappears", () => {
    const changed = pkgs.map((p, i) => (i === 0 ? { ...p, price: 749, lines: p.lines.map((l) => (l.serviceId === "callouts" ? { ...l, quantityEn: "3 callouts/year", shortEn: undefined } : l)) } : p));
    const r2 = buildComparison(changed, services);
    expect(r2[0].cells[0].en).toBe("749");
    expect(r2.find((r) => r.key === "callouts")!.cells[0].en).toBe("3");
    const noEmergency = buildComparison(pkgs.map((p) => ({ ...p, lines: p.lines.filter((l) => l.serviceId !== "emergency") })), services);
    expect(noEmergency.some((r) => r.key === "emergency")).toBe(false);
  });
  it("derives a short value from the quantity when none is typed", () => {
    const l = (quantityEn: string, quantityAr = "") => ({ serviceId: "x", quantityEn, quantityAr });
    expect(shortValue(l("2 visits/year"), "en")).toBe("2");
    expect(shortValue(l("Included"), "en")).toBe("✓");
    expect(shortValue(l("", "مشمول"), "ar")).toBe("✓");
    expect(shortValue(l("Unlimited"), "en")).toBe("Unlimited");
    expect(shortValue(undefined, "en")).toBe("—");
  });
});

describe("what an admin saves", () => {
  const ids = new Set(["a", "b"]);
  const base = { nameEn: "Gold", nameAr: "ذهبية", price: 1499, maxAcUnits: 5, lines: [{ serviceId: "a", quantityEn: "2", quantityAr: "2" }] };
  it("accepts a good package and refuses bad ones", () => {
    expect(packageProblem(base, ids)).toBeNull();
    for (const bad of [{ ...base, nameAr: " " }, { ...base, price: 0 }, { ...base, price: NaN }, { ...base, maxAcUnits: 0 }, { ...base, lines: [{ serviceId: "zzz", quantityEn: "1", quantityAr: "1" }] }, { ...base, lines: [base.lines[0], base.lines[0]] }])
      expect(packageProblem(bad, ids), JSON.stringify(bad).slice(0, 40)).not.toBeNull();
  });
  it("never allows pest control anywhere in a package or service", () => {
    expect(packageProblem({ ...base, nameEn: "Gold + Pest Control" }, ids)).toMatch(/Pest/);
    expect(packageProblem({ ...base, lines: [{ serviceId: "a", quantityEn: "Pest control visit", quantityAr: "" }] }, ids)).toMatch(/Pest/);
    expect(serviceProblem("Pest Control", "x")).toMatch(/Pest/);
    expect(serviceProblem("Insect spraying", "رش")).toMatch(/Pest/);
    expect(serviceProblem("مكافحة الحشرات", "x")).toMatch(/Pest/);
    expect(serviceProblem("Plumbing", "سباكة")).toBeNull();
  });
  it("formats prices in both languages", () => {
    expect(formatPrice(1499, "en")).toBe("AED 1,499");
    expect(formatPrice(699, "ar")).toBe("699 د.إ");
  });
});

describe("a customer's subscription request", () => {
  const ok = { packageId: "p1", name: "Sara Ahmed", phone: "+971 56 867 6036", email: "Sara@Example.com", emirate: "Dubai", location: "Marina", propertyType: "Apartment", bedrooms: 2, acUnits: 3, activationDate: "" };
  it("accepts a complete request and normalises the email", () => {
    const r = SubscriptionInput.safeParse(ok);
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBe("sara@example.com");
    expect(SubscriptionInput.safeParse({ ...ok, bedrooms: 0 }).success).toBe(true); // a studio
  });
  it("refuses incomplete or invalid ones", () => {
    for (const bad of [{ ...ok, name: "S" }, { ...ok, phone: "123" }, { ...ok, email: "nope" }, { ...ok, emirate: "Mars" }, { ...ok, propertyType: "Castle" }, { ...ok, acUnits: 0 }, { ...ok, bedrooms: -1 }, { ...ok, activationDate: "soon" }, { ...ok, packageId: "" }])
      expect(SubscriptionInput.safeParse(bad).success, JSON.stringify(bad).slice(0, 50)).toBe(false);
  });
  it("the activation date may be today or later, but not the past or beyond a year", () => {
    const now = Date.parse("2026-11-07T10:00:00Z");
    expect(activationDateProblem("", now)).toBeNull();
    expect(activationDateProblem("2026-11-07", now)).toBeNull();
    expect(activationDateProblem("2026-11-06", now)).not.toBeNull();
    expect(activationDateProblem("2027-01-15", now)).toBeNull();
    expect(activationDateProblem("2028-01-15", now)).not.toBeNull();
  });
});
