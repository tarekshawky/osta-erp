import type { AcConfig, Bi, BiList, PackageKey } from "./config";
import { totalsOf, type QuoteInput, type QuoteLine, type Totals } from "./engine";

// Everything a quotation says, frozen when it is created or revised (the lines, the totals and the wording of the packages used).

export type SnapshotPackage = { key: PackageKey; nameEn: string; nameAr: string; subtitleEn: string; subtitleAr: string; included: BiList; notIncluded: BiList };

export type QuoteSnapshot = {
  schema: 1;
  lang: "en" | "ar";
  currency: "AED";
  // What the customer chose in the calculator (so they can come back and change it). After an administrator edits the lines by hand, `manual` is true.
  input: QuoteInput;
  manual: boolean;
  lines: QuoteLine[];
  totals: Totals;
  validityDays: number;
  packages: SnapshotPackage[];
  plenum: { nameEn: string; nameAr: string; price: number; included: BiList; notIncluded: BiList };
  exclusions: BiList;
  disclaimer: Bi;
};

export type SnapshotParts = { lang: "en" | "ar"; input: QuoteInput; lines: QuoteLine[]; manual: boolean };

export function buildSnapshot(cfg: AcConfig, p: SnapshotParts): QuoteSnapshot {
  const used = new Set(p.input.units.map((u) => u.packageKey));
  return {
    schema: 1, lang: p.lang, currency: "AED", input: p.input, manual: p.manual, lines: p.lines, totals: totalsOf(p.lines, cfg.vatPercent), validityDays: cfg.validityDays,
    packages: cfg.packages.filter((k) => used.has(k.key)).map((k) => ({ key: k.key, nameEn: k.nameEn, nameAr: k.nameAr, subtitleEn: k.subtitleEn, subtitleAr: k.subtitleAr, included: k.included, notIncluded: k.notIncluded })),
    plenum: { nameEn: cfg.plenum.nameEn, nameAr: cfg.plenum.nameAr, price: cfg.plenum.price, included: cfg.plenum.included, notIncluded: cfg.plenum.notIncluded },
    exclusions: cfg.exclusions, disclaimer: cfg.disclaimer,
  };
}

// A revised quotation keeps the wording it was issued with; only the lines (and so the totals) change.
export function withLines(snap: QuoteSnapshot, lines: QuoteLine[]): QuoteSnapshot {
  return { ...snap, lines, manual: true, totals: totalsOf(lines, snap.totals.vatPercent) };
}

export type QuoteCustomer = { name: string; phone: string; whatsapp: string; email: string; contactMethod: string; preferredDate: Date | null };
export type QuoteProject = { propertyType: string; emirate: string; location: string; floors: number; existingDuct: string; existingCopper: string; ceilingType: string; notes: string };
