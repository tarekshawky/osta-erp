import type { Bi, BiList, SplitConfig } from "./config";
import { totalsOf, type SplitInput, type SplitLine, type SplitTotals } from "./engine";

// Everything a quotation says, frozen when it is created or revised: the lines, the totals, and the wording of the packages used (only the
// packages the customer selected are kept, so the PDF never describes a package that was not chosen).

export type SnapshotPackage = {
  key: string; nameEn: string; nameAr: string; subtitleEn: string; subtitleAr: string; copperMeters: number;
  materials: BiList; services: BiList; notIncluded: BiList;
};

export type SplitSnapshot = {
  schema: 1;
  kind: "split-ac";
  lang: "en" | "ar";
  currency: "AED";
  // What the customer chose in the calculator (so they can come back and change it). After an administrator edits the lines by hand, `manual` is true.
  input: SplitInput;
  manual: boolean;
  lines: SplitLine[];
  totals: SplitTotals;
  validityDays: number;
  packages: SnapshotPackage[];
  conditions: BiList; technicalNote: Bi; disclaimer: Bi; footer: Bi;
};

export function buildSnapshot(cfg: SplitConfig, p: { lang: "en" | "ar"; input: SplitInput; lines: SplitLine[]; manual: boolean }): SplitSnapshot {
  const used = new Set(p.lines.filter((l) => l.kind === "unit").map((l) => l.packageKey));
  return {
    schema: 1, kind: "split-ac", lang: p.lang, currency: "AED", input: p.input, manual: p.manual, lines: p.lines, totals: totalsOf(p.lines, cfg.vatPercent), validityDays: cfg.validityDays,
    packages: cfg.packages.filter((k) => used.has(k.key)).map((k) => ({ key: k.key, nameEn: k.nameEn, nameAr: k.nameAr, subtitleEn: k.subtitleEn, subtitleAr: k.subtitleAr, copperMeters: k.copperMeters, materials: k.materials, services: k.services, notIncluded: k.notIncluded })),
    conditions: cfg.conditions, technicalNote: cfg.technicalNote, disclaimer: cfg.disclaimer, footer: cfg.footer,
  };
}

// A revised quotation keeps the wording it was issued with; only the lines (and so the totals) change.
export function withLines(snap: SplitSnapshot, lines: SplitLine[]): SplitSnapshot {
  return { ...snap, lines, manual: true, totals: totalsOf(lines, snap.totals.vatPercent) };
}

export type SplitCustomer = { name: string; phone: string; email: string };
export type SplitProject = { propertyType: string; emirate: string; location: string; address: string; notes: string };
