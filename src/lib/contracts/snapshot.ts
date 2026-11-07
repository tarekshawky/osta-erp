import type { Breakdown, Lang } from "@/lib/maintenance/builder";
import type { Pkg, PkgService } from "@/lib/maintenance/packages";
import { COMPANY, AGREEMENT_CHECKS, type Bi, type Clause } from "./clauses";

// Everything an agreement says, frozen at the moment the customer accepts it. The PDF is always drawn from this and never from the
// live package, price or terms screens, so changing a package or its terms later cannot alter an agreement already accepted.

export type SnapshotLine = { serviceEn: string; serviceAr: string; quantityEn: string; quantityAr: string; limit: number | null; metric: string };
export type SnapshotExtra = { labelEn: string; labelAr: string; qty: number; unitPrice: number | null; amount: number | null; included: boolean };

export type ContractSnapshot = {
  schema: 1;
  groupKey: string;
  customer: { name: string; phone: string; whatsapp: string; email: string };
  property: { emirate: string; area: string; address: string; type: string; bedrooms: number; bathrooms: number; floors: number; size: number | null; acUnits: number; notes: string };
  package: {
    id: string; nameEn: string; nameAr: string; durationMonths: number;
    lines: SnapshotLine[]; excluded: Bi[]; acUnitsCovered: number | null; handymanHours: number | null; visits: Bi[];
    bullets: Bi[]; specialTerms: { en: string[]; ar: string[] };
  };
  extras: SnapshotExtra[];
  // What the customer asked for that the package price does not settle (shown as "to be quoted").
  openItems: Bi[];
  pricing: { currency: string; packagePrice: number | null; additional: number; discount: number; subtotal: number; vatPercent: number; vat: number; pricesIncludeVat: boolean; total: number; quote: boolean };
  terms: { id: string | null; version: number; clauses: Clause[] };
  checks: Bi[];
};

// A cell that says the service is NOT part of the package.
const NOT_INCLUDED = new Set(["", "—", "-", "–", "✗", "✕", "x", "no", "n/a", "لا", "غير مشمول"]);
export const isNotIncluded = (quantity: string) => NOT_INCLUDED.has(quantity.trim().toLowerCase());

const r2 = (n: number) => Math.round(n * 100) / 100;

export type SnapshotInput = {
  groupKey: string;
  customer: ContractSnapshot["customer"];
  property: ContractSnapshot["property"];
  pkg: Pkg;
  services: PkgService[];
  breakdown: Breakdown;
  pageTerms: { en: string[]; ar: string[] };
  terms: { id: string | null; version: number; clauses: Clause[] };
};

export function buildSnapshot(inp: SnapshotInput): ContractSnapshot {
  const { pkg, services, breakdown: b } = inp;
  const byId = new Map(services.map((s) => [s.id, s]));
  const included = pkg.lines.filter((l) => byId.has(l.serviceId) && !isNotIncluded(l.quantityEn) && !isNotIncluded(l.quantityAr));
  const lines: SnapshotLine[] = included.map((l) => {
    const s = byId.get(l.serviceId)!;
    return { serviceEn: s.nameEn, serviceAr: s.nameAr || s.nameEn, quantityEn: l.quantityEn, quantityAr: l.quantityAr || l.quantityEn, limit: l.limit ?? null, metric: s.metric ?? "" };
  });
  const includedIds = new Set(included.map((l) => l.serviceId));
  const excluded = services.filter((s) => !includedIds.has(s.id)).map((s) => ({ en: s.nameEn, ar: s.nameAr || s.nameEn }));
  const handyman = lines.find((l) => l.metric === "handyman_hours");
  // Visits per year are whatever the package's quantity text says for a "visits" service; they are listed as written, never invented.
  const visits = lines.filter((l) => /visit|زيار/i.test(`${l.quantityEn} ${l.quantityAr}`)).map((l) => ({ en: `${l.serviceEn}: ${l.quantityEn}`, ar: `${l.serviceAr}: ${l.quantityAr}` }));

  const extraLines = b.lines.filter((l) => l.note !== "base");
  const base = b.lines.find((l) => l.note === "base" || l.key === "base");
  const additional = r2(extraLines.reduce((s, l) => s + (l.amount ?? 0), 0));
  return {
    schema: 1,
    groupKey: inp.groupKey,
    customer: inp.customer,
    property: inp.property,
    package: {
      id: pkg.id, nameEn: pkg.nameEn, nameAr: pkg.nameAr || pkg.nameEn, durationMonths: COMPANY.durationMonths,
      lines, excluded, acUnitsCovered: pkg.maxAcUnits, handymanHours: handyman?.limit ?? null, visits,
      bullets: (pkg.bullets ?? []).map((x) => ({ en: x.en, ar: x.ar })), specialTerms: inp.pageTerms,
    },
    extras: extraLines.map((l) => ({ labelEn: l.labelEn, labelAr: l.labelAr, qty: l.qty, unitPrice: l.unitPrice, amount: l.amount, included: l.note === "included" })),
    openItems: b.lines.filter((l) => l.note === "quote").map((l) => ({ en: l.labelEn, ar: l.labelAr || l.labelEn })),
    pricing: {
      currency: COMPANY.currency, packagePrice: base?.amount ?? null, additional, discount: 0, subtotal: b.subtotal,
      vatPercent: b.vatPercent, vat: b.vat, pricesIncludeVat: b.pricesIncludeVat, total: b.total, quote: b.quote,
    },
    terms: inp.terms,
    checks: AGREEMENT_CHECKS,
  };
}

export type ContractLang = Lang;

// ---- changing an agreement's price (always a NEW version the customer must accept) ----

export type Adjustment = { labelEn: string; labelAr: string; amount: number }; // + a charge, - a discount

// Applies the admin's price changes to a copy of the snapshot: priced charges and discounts, an optional package price (for a package
// that was "custom quotation"), and whether the "to be quoted" items are now settled. VAT follows the snapshot's own VAT settings.
export function applyAdjustments(snap: ContractSnapshot, adjustments: Adjustment[], opts: { packagePrice?: number | null; settleOpenItems?: boolean } = {}): ContractSnapshot {
  const extras = snap.extras.filter((e) => !(opts.settleOpenItems && e.amount == null && !e.included));
  for (const a of adjustments) extras.push({ labelEn: a.labelEn, labelAr: a.labelAr || a.labelEn, qty: 1, unitPrice: a.amount, amount: a.amount, included: false });
  const packagePrice = opts.packagePrice !== undefined ? opts.packagePrice : snap.pricing.packagePrice;
  const additional = r2(extras.filter((e) => (e.amount ?? 0) > 0).reduce((s, e) => s + (e.amount ?? 0), 0));
  const discount = r2(-extras.filter((e) => (e.amount ?? 0) < 0).reduce((s, e) => s + (e.amount ?? 0), 0));
  const subtotal = r2((packagePrice ?? 0) + additional - discount);
  const rate = snap.pricing.vatPercent;
  const vat = snap.pricing.pricesIncludeVat ? r2((subtotal * rate) / (100 + rate)) : r2((subtotal * rate) / 100);
  const total = snap.pricing.pricesIncludeVat ? subtotal : r2(subtotal + vat);
  const stillOpen = extras.some((e) => e.amount == null && !e.included) || packagePrice == null;
  return {
    ...snap,
    extras,
    openItems: stillOpen ? snap.openItems : [],
    pricing: { ...snap.pricing, packagePrice, additional, discount, subtotal, vat, total, quote: stillOpen },
  };
}
