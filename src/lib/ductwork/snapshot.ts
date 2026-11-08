import type { Bi, BiList, DuctConfig } from "./config";
import { reviewItems, totalsOf, type ComputedSection, type DuctInput, type DuctLine, type ReviewItem, type SpecInput, type Totals } from "./engine";

// Everything a ductwork quotation says, frozen when it is created or revised: the lines, the dimensions and areas, the totals, the
// specifications the customer entered, and the wording of the systems used. A later change to the price list never alters it.

export type DuctSystemInfo = { key: string; nameEn: string; nameAr: string; shortEn: string; shortAr: string; included: BiList; notIncluded: BiList; technical: BiList };
export type SpecRow = { labelEn: string; labelAr: string; valueEn: string; valueAr: string; confirmed: boolean };
export type DuctFileRef = { name: string; category: "drawing" | "boq" | "" };

export type DuctSnapshot = {
  schema: 1;
  kind: "ductwork";
  lang: "en" | "ar";
  currency: "AED";
  input: DuctInput;
  // After an administrator edits the lines by hand, `manual` is true and the customer can no longer change it themselves.
  manual: boolean;
  sections: ComputedSection[];
  lines: DuctLine[];
  totals: Totals;
  spec: SpecInput;
  specRows: SpecRow[];
  review: ReviewItem[];
  validityDays: number;
  systems: DuctSystemInfo[];
  estimateNotice: Bi; straightDuctNote: Bi; reviewNote: Bi;
  terms: BiList;
  files: DuctFileRef[];
};

export type DuctCustomer = { name: string; company: string; phone: string; email: string };
export type DuctProject = { projectType: string; emirate: string; location: string; projectName: string; siteAddress: string; description: string };

const NOT_CONFIRMED: Bi = { en: "Not confirmed – subject to technical review", ar: "غير مؤكد – يخضع للمراجعة الفنية" };
const YN: Record<string, Bi> = { yes: { en: "Yes", ar: "نعم" }, no: { en: "No", ar: "لا" }, "not-sure": NOT_CONFIRMED };
const IO: Record<string, Bi> = { indoor: { en: "Indoor", ar: "داخلي" }, outdoor: { en: "Outdoor", ar: "خارجي" }, "not-sure": NOT_CONFIRMED };

// The specifications as the customer gave them, with the option names resolved (an unconfirmed one says so).
export function specRows(cfg: DuctConfig, systemsUsed: string[], spec: SpecInput): SpecRow[] {
  const applies = new Set<string>(["pressure", "application"]);
  for (const k of systemsUsed) for (const f of cfg.systems.find((x) => x.key === k)?.specFields ?? []) applies.add(f);
  const names: Record<string, Bi> = {
    gauge: { en: "Duct material thickness / gauge", ar: "سماكة الصاج" }, fiberglass: { en: "Fiberglass insulation thickness", ar: "سماكة عزل الفايبر جلاس" }, pir: { en: "PIR panel thickness", ar: "سماكة ألواح PIR" },
    pressure: { en: "Duct pressure class", ar: "فئة ضغط الدكت" }, application: { en: "Duct application", ar: "استخدام الدكت" },
  };
  const rows: SpecRow[] = [];
  for (const k of ["gauge", "fiberglass", "pir", "pressure", "application"] as const) {
    if (!applies.has(k)) continue;
    const v = spec[k] ?? "";
    const o = cfg.specs[k].find((x) => x.key === v);
    rows.push({ labelEn: names[k].en, labelAr: names[k].ar, valueEn: o ? o.en : NOT_CONFIRMED.en, valueAr: o ? o.ar : NOT_CONFIRMED.ar, confirmed: !!o });
  }
  const io = spec.indoorOutdoor ?? "";
  rows.push({ labelEn: "Indoor / outdoor installation", labelAr: "تركيب داخلي / خارجي", valueEn: (IO[io] ?? NOT_CONFIRMED).en, valueAr: (IO[io] ?? NOT_CONFIRMED).ar, confirmed: io === "indoor" || io === "outdoor" });
  const dr = spec.drawingsAvailable ?? "";
  if (dr) rows.push({ labelEn: "Project drawings available", labelAr: "هل تتوفر مخططات", valueEn: YN[dr].en, valueAr: YN[dr].ar, confirmed: dr !== "not-sure" });
  if (spec.completionDate) rows.push({ labelEn: "Required completion date", labelAr: "تاريخ الإنجاز المطلوب", valueEn: spec.completionDate, valueAr: spec.completionDate, confirmed: true });
  if (spec.otherSpec?.trim()) rows.push({ labelEn: "Other specification", labelAr: "مواصفات أخرى", valueEn: spec.otherSpec.trim(), valueAr: spec.otherSpec.trim(), confirmed: true });
  if (spec.special?.trim()) rows.push({ labelEn: "Special requirements", labelAr: "متطلبات خاصة", valueEn: spec.special.trim(), valueAr: spec.special.trim(), confirmed: true });
  return rows;
}

export type SnapshotParts = { lang: "en" | "ar"; input: DuctInput; lines: DuctLine[]; sections: ComputedSection[]; totals: Totals; spec: SpecInput; manual: boolean; files: DuctFileRef[] };

export function buildSnapshot(cfg: DuctConfig, p: SnapshotParts): DuctSnapshot {
  const used = [...new Set(p.sections.map((s) => s.system))];
  return {
    schema: 1, kind: "ductwork", lang: p.lang, currency: "AED", input: p.input, manual: p.manual, sections: p.sections, lines: p.lines, totals: p.totals, spec: p.spec,
    specRows: specRows(cfg, used, p.spec), review: reviewItems(cfg, used, p.spec), validityDays: cfg.validityDays,
    systems: cfg.systems.filter((s) => used.includes(s.key)).map((s) => ({ key: s.key, nameEn: s.nameEn, nameAr: s.nameAr, shortEn: s.shortEn, shortAr: s.shortAr, included: s.included, notIncluded: s.notIncluded, technical: s.technical })),
    estimateNotice: cfg.estimateNotice, straightDuctNote: cfg.straightDuctNote, reviewNote: cfg.reviewNote, terms: cfg.terms, files: p.files,
  };
}

// A revised quotation keeps the wording it was issued with; only the lines (and so the totals) change.
export function withLines(snap: DuctSnapshot, lines: DuctLine[]): DuctSnapshot {
  return { ...snap, lines, manual: true, totals: totalsOf(lines, snap.totals.vatPercent, snap.totals.areas, snap.totals.totalArea) };
}
