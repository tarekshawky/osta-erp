import { z } from "zod";
import { MODES, MODE_LABEL, SPEC_KEYS, UNITS, UNIT_LABEL, type Bi, type DuctConfig, type Mode, type SpecKey, type Unit } from "./config";

// The ONE place a ductwork quotation is worked out. The website asks the server for the live price and the server works it out again when the
// quotation is created, so nothing the browser says about money or areas is trusted. The result is a list of explicit lines: once stored they
// are the quotation, and a later change to the price list never alters them.

export type SectionInput = {
  id: string;
  method: "area" | "rect" | "round";
  system: string;
  mode: Mode;
  description?: string;
  // method "area": the total m² from an approved BOQ (sections = how many sections it covers; informational)
  area?: number; sections?: number;
  // method "rect" / "round": millimetres and metres
  widthMm?: number; heightMm?: number; diameterMm?: number; lengthM?: number; qty?: number;
};
export type DuctInput = {
  sections: SectionInput[];
  accessories: { key: string; unit: Unit; qty: number; note?: string }[];
  services: { key: string; qty: number; note?: string }[];
};
export type SpecInput = Partial<Record<SpecKey, string>> & { indoorOutdoor?: string; drawingsAvailable?: string; completionDate?: string; special?: string; otherSpec?: string };

export type DuctLine = {
  id: string;
  kind: "duct" | "accessory" | "service" | "custom" | "discount";
  system: string | null; mode: Mode | null;
  labelEn: string; labelAr: string; detailEn: string; detailAr: string;
  qty: number;
  unit: Unit;
  unitPrice: number | null;
  // null = "request for quotation": not in the totals until the administrator prices it after review.
  amount: number | null;
  rfq: boolean;
};
export type ComputedSection = SectionInput & { areaM2: number };
export type AreaRow = { system: string; mode: Mode; nameEn: string; nameAr: string; area: number };
export type Totals = {
  areas: AreaRow[]; totalArea: number;
  ductSubtotal: number; accessoriesSubtotal: number; servicesSubtotal: number; discount: number;
  subtotal: number; vatPercent: number; vat: number; total: number;
  rfq: boolean; rfqItems: Bi[];
};
export type ReviewItem = { key: string; en: string; ar: string };

const r2 = (n: number) => Math.round(n * 100) / 100;
const lineOf = (l: Omit<DuctLine, "amount">): DuctLine => ({ ...l, amount: l.unitPrice == null ? null : r2(l.unitPrice * l.qty) });

// The surface area of one section, in m². Millimetres are turned into metres first.
//   rectangular: 2 × (width + height) × length × quantity      circular: π × diameter × length × quantity
export function sectionArea(s: SectionInput): number {
  if (s.method === "area") return r2(Number(s.area) || 0);
  const len = Number(s.lengthM) || 0, q = Number(s.qty) || 0;
  if (s.method === "rect") return r2(2 * (((Number(s.widthMm) || 0) + (Number(s.heightMm) || 0)) / 1000) * len * q);
  return r2(Math.PI * ((Number(s.diameterMm) || 0) / 1000) * len * q);
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const id = z.string().min(1).max(40);
export const InputSchema = z.object({
  sections: z.array(z.object({
    id, method: z.enum(["area", "rect", "round"]), system: z.string().max(40), mode: z.enum(MODES), description: z.string().trim().max(300).optional(),
    area: z.number().optional(), sections: z.number().int().min(0).max(100_000).optional(),
    widthMm: z.number().optional(), heightMm: z.number().optional(), diameterMm: z.number().optional(), lengthM: z.number().optional(), qty: z.number().optional(),
  })).min(1).max(150),
  accessories: z.array(z.object({ key: z.string().max(40), unit: z.enum(UNITS), qty: z.number().positive().max(1_000_000), note: z.string().trim().max(300).optional() })).max(80).default([]),
  services: z.array(z.object({ key: z.string().max(40), qty: z.number().positive().max(1_000_000), note: z.string().trim().max(500).optional() })).max(40).default([]),
});

export const SpecSchema = z.object({
  gauge: z.string().max(40).optional(), fiberglass: z.string().max(40).optional(), pir: z.string().max(40).optional(), pressure: z.string().max(40).optional(), application: z.string().max(40).optional(),
  indoorOutdoor: z.enum(["", "indoor", "outdoor", "not-sure"]).optional(), drawingsAvailable: z.enum(["", "yes", "no", "not-sure"]).optional(),
  completionDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional(), special: z.string().trim().max(2000).optional(), otherSpec: z.string().trim().max(500).optional(),
}).default({});

export type BuildResult = { ok: true; lines: DuctLine[]; sections: ComputedSection[]; totals: Totals } | { ok: false; error: string };

export function buildDuct(cfg: DuctConfig, input: DuctInput): BuildResult {
  const sections: ComputedSection[] = [];
  for (const [i, s] of input.sections.entries()) {
    const n = i + 1;
    const sys = cfg.systems.find((x) => x.key === s.system && x.active);
    if (!sys) return { ok: false, error: `Section ${n}: choose a duct system.` };
    if (!MODES.includes(s.mode) || !sys.modes[s.mode].enabled) return { ok: false, error: `Section ${n}: this type of work is not available for ${sys.nameEn}.` };
    if (s.method === "area") {
      const a = num(s.area);
      if (!(a > 0) || a > 1_000_000) return { ok: false, error: `Section ${n}: enter the area in m².` };
    } else {
      const len = num(s.lengthM), q = num(s.qty);
      if (!(len > 0) || len > 10_000) return { ok: false, error: `Section ${n}: enter the length in metres.` };
      if (!Number.isInteger(q) || q < 1 || q > 100_000) return { ok: false, error: `Section ${n}: enter the quantity.` };
      if (s.method === "rect") {
        const w = num(s.widthMm), h = num(s.heightMm);
        if (!(w > 0) || !(h > 0) || w > 20_000 || h > 20_000) return { ok: false, error: `Section ${n}: enter the width and height in millimetres.` };
      } else {
        const d = num(s.diameterMm);
        if (!(d > 0) || d > 20_000) return { ok: false, error: `Section ${n}: enter the diameter in millimetres.` };
      }
    }
    const area = sectionArea(s);
    if (!(area > 0)) return { ok: false, error: `Section ${n}: the area is zero.` };
    sections.push({ ...s, areaM2: area });
  }

  // Each system and each kind of work is calculated on its own.
  const lines: DuctLine[] = [];
  const groups = new Map<string, { system: string; mode: Mode; area: number; count: number }>();
  for (const s of sections) {
    const k = `${s.system}|${s.mode}`;
    const g = groups.get(k) ?? { system: s.system, mode: s.mode, area: 0, count: 0 };
    g.area = r2(g.area + s.areaM2); g.count += 1; groups.set(k, g);
  }
  const areas: AreaRow[] = [];
  for (const g of groups.values()) {
    const sys = cfg.systems.find((x) => x.key === g.system)!;
    const rate = sys.modes[g.mode].rate;
    const custom = g.mode === "custom" || rate == null;
    areas.push({ system: g.system, mode: g.mode, nameEn: sys.shortEn || sys.nameEn, nameAr: sys.shortAr || sys.nameAr, area: g.area });
    lines.push(lineOf({
      id: `d:${g.system}:${g.mode}`, kind: "duct", system: g.system, mode: g.mode, qty: g.area, unit: "m2", unitPrice: custom ? null : rate, rfq: custom,
      labelEn: `${sys.nameEn} – ${MODE_LABEL[g.mode].en}`, labelAr: `${sys.nameAr} – ${MODE_LABEL[g.mode].ar}`, detailEn: `${g.count} section${g.count === 1 ? "" : "s"}`, detailAr: `${g.count} ${g.count === 1 ? "قسم" : "أقسام"}`,
    }));
  }
  const totalArea = r2(areas.reduce((s, a) => s + a.area, 0));
  if (cfg.minAreaM2 > 0 && totalArea < cfg.minAreaM2) return { ok: false, error: `The minimum project quantity is ${cfg.minAreaM2} m². Please contact us for smaller works.` };

  for (const a of input.accessories) {
    const def = cfg.accessories.find((x) => x.key === a.key && x.active);
    if (!def) return { ok: false, error: "One of the components is not available." };
    if (!def.units.includes(a.unit)) return { ok: false, error: `${def.nameEn}: this unit is not available.` };
    const price = def.prices[a.unit] ?? null;
    lines.push(lineOf({ id: `a:${def.key}:${a.unit}`, kind: "accessory", system: null, mode: null, qty: a.qty, unit: a.unit, unitPrice: price, rfq: price == null, labelEn: def.nameEn, labelAr: def.nameAr, detailEn: a.note?.trim() ?? "", detailAr: a.note?.trim() ?? "" }));
  }
  for (const s of input.services) {
    const def = cfg.services.find((x) => x.key === s.key && x.active);
    if (!def) return { ok: false, error: "One of the additional services is not available." };
    const priced = !def.rfq && def.price != null;
    lines.push(lineOf({ id: `s:${def.key}`, kind: "service", system: null, mode: null, qty: s.qty, unit: def.unit, unitPrice: priced ? def.price : null, rfq: !priced, labelEn: def.nameEn, labelAr: def.nameAr, detailEn: s.note?.trim() ?? "", detailAr: s.note?.trim() ?? "" }));
  }

  // The configured discount: a percentage of, or a fixed amount off, the priced items (never more than they come to).
  if (cfg.discount.enabled && cfg.discount.value > 0) {
    const base = r2(lines.reduce((s, l) => s + (l.amount ?? 0), 0));
    const off = cfg.discount.type === "percent" ? r2((base * cfg.discount.value) / 100) : Math.min(cfg.discount.value, base);
    if (off > 0) lines.push(lineOf({ id: "discount", kind: "discount", system: null, mode: null, qty: 1, unit: "LOT", unitPrice: off, rfq: false, labelEn: cfg.discount.labelEn || "Discount", labelAr: cfg.discount.labelAr || "خصم", detailEn: cfg.discount.type === "percent" ? `${cfg.discount.value}%` : "", detailAr: cfg.discount.type === "percent" ? `${cfg.discount.value}%` : "" }));
  }
  return { ok: true, lines, sections, totals: totalsOf(lines, cfg.vatPercent, areas, totalArea) };
}

// Prices are shown WITHOUT VAT; VAT is added once, on the subtotal after the discount.
export function totalsOf(lines: DuctLine[], vatPercent: number, areas: AreaRow[] = [], totalArea = 0): Totals {
  const sum = (f: (l: DuctLine) => boolean) => r2(lines.filter(f).reduce((s, l) => s + (l.amount ?? 0), 0));
  const ductSubtotal = sum((l) => l.kind === "duct"), accessoriesSubtotal = sum((l) => l.kind === "accessory"), servicesSubtotal = sum((l) => l.kind === "service" || l.kind === "custom");
  const discount = sum((l) => l.kind === "discount");
  const subtotal = Math.max(0, r2(ductSubtotal + accessoriesSubtotal + servicesSubtotal - discount));
  const vat = r2((subtotal * vatPercent) / 100);
  const open = lines.filter((l) => l.amount == null);
  return { areas, totalArea, ductSubtotal, accessoriesSubtotal, servicesSubtotal, discount, subtotal, vatPercent, vat, total: r2(subtotal + vat), rfq: open.length > 0, rfqItems: open.map((l) => ({ en: l.labelEn, ar: l.labelAr })) };
}

// The technical specifications the customer did not confirm (left blank or "Not sure"): they are printed as subject to technical review.
// A specification only counts when a system that depends on it is in the quotation.
export function reviewItems(cfg: DuctConfig, systemsUsed: string[], spec: SpecInput): ReviewItem[] {
  const needed = new Set<SpecKey>(["pressure", "application"]);
  for (const k of systemsUsed) for (const f of cfg.systems.find((x) => x.key === k)?.specFields ?? []) needed.add(f);
  const names: Record<SpecKey, Bi> = {
    gauge: { en: "Duct material thickness / gauge", ar: "سماكة الصاج" }, fiberglass: { en: "Fiberglass insulation thickness", ar: "سماكة عزل الفايبر جلاس" }, pir: { en: "PIR panel thickness", ar: "سماكة ألواح PIR" },
    pressure: { en: "Duct pressure class", ar: "فئة ضغط الدكت" }, application: { en: "Duct application", ar: "استخدام الدكت" },
  };
  const out: ReviewItem[] = [];
  for (const k of SPEC_KEYS) {
    if (!needed.has(k)) continue;
    const v = spec[k] ?? "";
    if (v === "" || v === "not-sure") out.push({ key: k, ...names[k] });
  }
  if ((spec.indoorOutdoor ?? "") === "" || spec.indoorOutdoor === "not-sure") out.push({ key: "indoorOutdoor", en: "Indoor / outdoor installation", ar: "تركيب داخلي / خارجي" });
  return out;
}

// ---- lines edited by an administrator (a revised quotation) ----

const money = z.number().min(0).max(100_000_000);
export const LinesSchema = z.array(z.object({
  id: z.string().min(1).max(80), kind: z.enum(["duct", "accessory", "service", "custom", "discount"]),
  system: z.string().max(40).nullable(), mode: z.enum(MODES).nullable(),
  labelEn: z.string().trim().min(1).max(200), labelAr: z.string().trim().max(200), detailEn: z.string().trim().max(300), detailAr: z.string().trim().max(300),
  qty: z.number().positive().max(100_000_000), unit: z.enum(UNITS), unitPrice: money.nullable(), rfq: z.boolean(),
})).min(1).max(300);

export function linesFromEdit(raw: unknown): { ok: true; lines: DuctLine[] } | { ok: false; error: string } {
  const r = LinesSchema.safeParse(raw);
  if (!r.success) return { ok: false, error: "A line is not valid: check the descriptions, quantities and prices." };
  if (!r.data.some((l) => l.kind === "duct")) return { ok: false, error: "A quotation needs at least one ductwork line." };
  if (new Set(r.data.map((l) => l.id)).size !== r.data.length) return { ok: false, error: "Two lines share the same id." };
  return { ok: true, lines: r.data.map((l) => lineOf({ ...l, labelAr: l.labelAr || l.labelEn, rfq: l.unitPrice == null })) };
}

export const unitLabel = (u: Unit, lang: "en" | "ar") => UNIT_LABEL[u][lang];
