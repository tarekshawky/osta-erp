import { describe, it, expect } from "vitest";
import { SEED_SETS, seedSet, type SeedSet } from "./seeds";
import { SubscriptionInput, buildComparison, packageProblem, priceText, termsList, type Pkg, type PkgService } from "./packages";

const toPkgs = (set: SeedSet): { pkgs: Pkg[]; services: PkgService[] } => {
  const services: PkgService[] = set.services.map((s) => ({ id: s.key, nameEn: s.nameEn, nameAr: s.nameAr, showInComparison: s.showInComparison }));
  const pkgs: Pkg[] = set.packages.map((p, i) => ({
    id: `p${i}`, nameEn: p.nameEn, nameAr: p.nameAr, descriptionEn: "", descriptionAr: "", suitableEn: p.suitableEn, suitableAr: p.suitableAr, price: p.price, pricePrefixEn: p.pricePrefixEn, pricePrefixAr: p.pricePrefixAr,
    priceTextEn: p.priceTextEn, priceTextAr: p.priceTextAr, maxAcUnits: p.maxAcUnits, badgeEn: p.badgeEn, badgeAr: p.badgeAr, highlighted: p.highlighted, bullets: p.bullets,
    lines: p.lines.map((l) => ({ serviceId: l.service, quantityEn: l.en, quantityAr: l.ar, shortEn: l.shortEn, shortAr: l.shortAr })),
  }));
  return { pkgs, services };
};

describe("ready-made sets", () => {
  it("offers the home, commercial and HVAC sets, each with four packages and no pest control", () => {
    expect(SEED_SETS.map((s) => s.key)).toEqual(["home", "commercial", "hvac"]);
    for (const s of SEED_SETS) {
      expect(s.packages, s.key).toHaveLength(4);
      expect(JSON.stringify(s)).not.toMatch(/pest|مكافحة|حشرات/i);
      const { pkgs, services } = toPkgs(s);
      const ids = new Set(services.map((x) => x.id));
      for (const p of pkgs) expect(packageProblem(p, ids), `${s.key} ${p.nameEn}`).toBeNull();
      // every English bullet has an Arabic one
      for (const p of pkgs) for (const bl of p.bullets ?? []) expect(bl.ar.trim(), `${s.key} ${p.nameEn} ${bl.en}`).not.toBe("");
    }
  });
  it("the group sets use different keys, quote buttons, and the page headings from the brief", () => {
    expect(seedSet("commercial")!.group).toMatchObject({ key: "commercial-maintenance", ctaMode: "quote" });
    expect(seedSet("hvac")!.group).toMatchObject({ key: "hvac-amc", ctaMode: "quote" });
    expect(seedSet("home")!.group).toBeNull();
    expect(seedSet("commercial")!.settings.headingEn).toBe("Commercial Maintenance Packages");
    expect(seedSet("hvac")!.settings.headingAr).toBe("عقود صيانة التكييف والتهوية السنوية");
    expect(seedSet("nope")).toBeUndefined();
  });
});

describe("commercial maintenance", () => {
  const { pkgs, services } = toPkgs(seedSet("commercial")!);
  const rows = buildComparison(pkgs, services);
  const row = (label: string) => rows.find((r) => r.labelEn === label)!.cells.map((c) => c.en);
  it("has the prices from the brief, the last one a custom quotation", () => {
    expect(pkgs.map((p) => p.price)).toEqual([499, 999, 1999, null]);
    expect(priceText(pkgs[3], "en")).toMatchObject({ amount: "Custom Quotation", custom: true });
    expect(priceText(pkgs[3], "ar").amount).toBe("عرض سعر مخصص");
    expect(priceText(pkgs[0], "en")).toMatchObject({ amount: "AED 499", custom: false });
  });
  it("its comparison table is the one in the brief", () => {
    expect(row("Annual Price")).toEqual(["499", "999", "1,999", "Custom"]);
    for (const l of ["AC Inspection", "Plumbing Inspection", "Electrical Inspection", "Maintenance Reports"]) expect(row(l), l).toEqual(["✓", "✓", "✓", "✓"]);
    expect(row("Preventive Visits")).toEqual(["2", "2", "Quarterly", "Custom"]);
    expect(row("Maintenance Callouts")).toEqual(["—", "4", "6", "Custom"]);
    expect(row("Handyman Support")).toEqual(["—", "—", "✓", "✓"]);
    expect(row("Priority Service")).toEqual(["—", "✓", "✓", "✓"]);
    expect(row("Dedicated Coordinator")).toEqual(["—", "—", "—", "✓"]);
    expect(row("Emergency Response")).toEqual(["Standard", "Standard", "Priority", "Priority"]);
    expect(rows.some((r) => r.labelEn === "Maximum AC Units")).toBe(false); // this set has no AC limit, so no such row
  });
});

describe("HVAC AMC", () => {
  const { pkgs, services } = toPkgs(seedSet("hvac")!);
  const rows = buildComparison(pkgs, services);
  it("shows 'starting from' prices as 399+ in the table, with Premium on custom", () => {
    expect(pkgs.map((p) => p.price)).toEqual([399, 699, 1499, null]);
    expect(priceText(pkgs[0], "en")).toMatchObject({ prefix: "Starting from", amount: "AED 399" });
    expect(priceText(pkgs[0], "ar").prefix).toBe("ابتداءً من");
    expect(rows[0].cells.map((c) => c.en)).toEqual(["399+", "699+", "1,499+", "Custom"]);
    expect(rows[1].labelEn).toBe("Maximum AC Units");
    expect(rows[1].cells.map((c) => c.en)).toEqual(["3", "5", "10", "—"]);
  });
});

describe("a quote request", () => {
  const quote = { kind: "quote", packageId: "p1", groupKey: "commercial-maintenance", name: "Omar Ali", phone: "+971501234567", email: "omar@shop.ae", emirate: "Dubai", location: "Deira", company: "Ali Trading", message: "Three shops.", propertyType: "Shop", activationDate: "" };
  it("needs no household details, and takes a company and a message", () => {
    const r = SubscriptionInput.safeParse(quote);
    expect(r.success).toBe(true);
    expect(r.success && r.data.kind).toBe("quote");
    expect(r.success && r.data.acUnits).toBe(0);
    expect(SubscriptionInput.safeParse({ ...quote, acUnits: 12 }).success).toBe(true);
  });
  it("is still checked for the basics, and a subscription still needs its property details", () => {
    for (const bad of [{ ...quote, email: "x" }, { ...quote, phone: "1" }, { ...quote, message: "x".repeat(1001) }, { ...quote, groupKey: "Bad Key!" }]) expect(SubscriptionInput.safeParse(bad).success).toBe(false);
    const sub = { packageId: "p1", name: "Sara Ahmed", phone: "+971568676036", email: "s@x.co", emirate: "Dubai", propertyType: "Apartment", bedrooms: 2, acUnits: 3 };
    expect(SubscriptionInput.safeParse(sub).success).toBe(true); // the old form (no "kind") still works
    expect(SubscriptionInput.safeParse({ ...sub, acUnits: 0 }).success).toBe(false);
  });
  it("terms lists ignore numbering", () => {
    expect(termsList("1. First\n2) Second\n- Third\n\n")).toEqual(["First", "Second", "Third"]);
  });
});
