import { z } from "zod";
import { EXTRA_UNIT_LABEL, type Bi, type SplitConfig } from "./config";

// The ONE place a Split AC quotation's prices are worked out. The website asks the server to calculate (live preview) and the server works it
// out again when the quotation is created, so nothing the browser says about money is trusted. The result is a list of explicit lines: once
// stored they are the quotation, and a later change to the price list never alters them.

export type SplitLine = {
  id: string;
  kind: "unit" | "service" | "custom" | "discount";
  unitIndex: number | null;
  labelEn: string; labelAr: string; detailEn: string; detailAr: string;
  // Shown in the Package / AC Capacity columns of the quotation table (empty for services).
  packageKey: string; packageEn: string; packageAr: string; capacityEn: string; capacityAr: string;
  qty: number;
  unitPrice: number | null;
  // null = "request for quotation": not part of the totals until the administrator prices it.
  amount: number | null;
  rfq: boolean;
};

export type SplitInput = { units: { capacity: string; packageKey: string; qty: number }[]; services: { key: string; qty: number; note?: string }[] };

export type SplitTotals = {
  unitCount: number; unitsTotal: number; servicesTotal: number; discount: number; subtotal: number;
  vatPercent: number; vat: number; total: number; rfq: boolean; rfqItems: Bi[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;
export const lineOf = (l: Omit<SplitLine, "amount">): SplitLine => ({ ...l, amount: l.unitPrice == null ? null : r2(l.unitPrice * l.qty) });

export const InputSchema = z.object({
  units: z.array(z.object({ capacity: z.string().max(10), packageKey: z.string().max(40), qty: z.number().int().min(1).max(100) })).min(1).max(30),
  services: z.array(z.object({ key: z.string().max(40), qty: z.number().int().min(1).max(1000), note: z.string().trim().max(500).optional() })).max(40).default([]),
});

export type BuildResult = { ok: true; lines: SplitLine[]; totals: SplitTotals } | { ok: false; error: string };

export function buildLines(cfg: SplitConfig, input: SplitInput): BuildResult {
  const lines: SplitLine[] = [];
  if (input.units.length === 0) return { ok: false, error: "Add at least one AC unit." };
  for (const [i, u] of input.units.entries()) {
    const cap = cfg.capacities.find((c) => c.key === u.capacity && c.active);
    const pkg = cfg.packages.find((p) => p.key === u.packageKey && p.active);
    if (!cap) return { ok: false, error: `AC ${i + 1}: choose a capacity.` };
    if (!pkg) return { ok: false, error: `AC ${i + 1}: choose an installation package.` };
    if (!Number.isInteger(u.qty) || u.qty < 1 || u.qty > 100) return { ok: false, error: `AC ${i + 1}: the quantity must be between 1 and 100.` };
    const price = pkg.prices[cap.key];
    if (typeof price !== "number") return { ok: false, error: `AC ${i + 1}: ${pkg.nameEn} is not available for ${cap.labelEn}.` };
    lines.push(lineOf({
      id: `u${i}`, kind: "unit", unitIndex: i, qty: u.qty, unitPrice: price, rfq: false,
      labelEn: "Split AC installation", labelAr: "تركيب مكيف سبليت", detailEn: `${cap.labelEn} – ${pkg.nameEn}`, detailAr: `${cap.labelAr} – ${pkg.nameAr}`,
      packageKey: pkg.key, packageEn: pkg.nameEn, packageAr: pkg.nameAr, capacityEn: cap.labelEn, capacityAr: cap.labelAr,
    }));
  }
  for (const s of input.services) {
    const def = cfg.extras.find((x) => x.key === s.key && x.active);
    if (!def) return { ok: false, error: "One of the additional services is not available." };
    const priced = !def.rfq && def.price != null;
    const u = EXTRA_UNIT_LABEL[def.unit];
    lines.push(lineOf({
      id: `s:${def.key}`, kind: "service", unitIndex: null, qty: s.qty, unitPrice: priced ? def.price : null, rfq: !priced,
      labelEn: def.nameEn, labelAr: def.nameAr, detailEn: s.note?.trim() || u.priceEn, detailAr: s.note?.trim() || u.priceAr,
      packageKey: "", packageEn: "", packageAr: "", capacityEn: "", capacityAr: "",
    }));
  }
  // The configured discount: a percentage of, or a fixed amount off, the priced items (never more than they come to).
  if (cfg.discount.enabled && cfg.discount.value > 0) {
    const base = r2(lines.reduce((s, l) => s + (l.amount ?? 0), 0));
    const off = cfg.discount.type === "percent" ? r2((base * cfg.discount.value) / 100) : Math.min(cfg.discount.value, base);
    if (off > 0) lines.push(lineOf({
      id: "discount", kind: "discount", unitIndex: null, qty: 1, unitPrice: off, rfq: false, labelEn: cfg.discount.labelEn || "Discount", labelAr: cfg.discount.labelAr || "خصم",
      detailEn: cfg.discount.type === "percent" ? `${cfg.discount.value}%` : "", detailAr: cfg.discount.type === "percent" ? `${cfg.discount.value}%` : "",
      packageKey: "", packageEn: "", packageAr: "", capacityEn: "", capacityAr: "",
    }));
  }
  return { ok: true, lines, totals: totalsOf(lines, cfg.vatPercent) };
}

// Prices are shown WITHOUT VAT; VAT is added once, on the subtotal after the discount.
export function totalsOf(lines: SplitLine[], vatPercent: number): SplitTotals {
  const sum = (f: (l: SplitLine) => boolean) => r2(lines.filter(f).reduce((s, l) => s + (l.amount ?? 0), 0));
  const unitsTotal = sum((l) => l.kind === "unit"), servicesTotal = sum((l) => l.kind === "service" || l.kind === "custom"), discount = sum((l) => l.kind === "discount");
  const subtotal = Math.max(0, r2(unitsTotal + servicesTotal - discount));
  const vat = r2((subtotal * vatPercent) / 100);
  const open = lines.filter((l) => l.amount == null);
  const unitCount = lines.filter((l) => l.kind === "unit").reduce((s, l) => s + l.qty, 0);
  return { unitCount, unitsTotal, servicesTotal, discount, subtotal, vatPercent, vat, total: r2(subtotal + vat), rfq: open.length > 0, rfqItems: open.map((l) => ({ en: l.labelEn, ar: l.labelAr })) };
}

// ---- lines edited by an administrator (a revised quotation) ----

const money = z.number().min(0).max(10_000_000);
export const LinesSchema = z.array(z.object({
  id: z.string().min(1).max(60), kind: z.enum(["unit", "service", "custom", "discount"]), unitIndex: z.number().int().min(0).max(100).nullable(),
  labelEn: z.string().trim().min(1).max(200), labelAr: z.string().trim().max(200), detailEn: z.string().trim().max(300), detailAr: z.string().trim().max(300),
  packageKey: z.string().max(40), packageEn: z.string().max(200), packageAr: z.string().max(200), capacityEn: z.string().max(40), capacityAr: z.string().max(40),
  qty: z.number().int().min(1).max(100_000), unitPrice: money.nullable(), rfq: z.boolean(),
})).min(1).max(200);

export function linesFromEdit(raw: unknown): { ok: true; lines: SplitLine[] } | { ok: false; error: string } {
  const r = LinesSchema.safeParse(raw);
  if (!r.success) return { ok: false, error: "A line is not valid: check the descriptions, quantities and prices." };
  if (!r.data.some((l) => l.kind === "unit")) return { ok: false, error: "A quotation needs at least one AC unit line." };
  if (new Set(r.data.map((l) => l.id)).size !== r.data.length) return { ok: false, error: "Two lines share the same id." };
  return { ok: true, lines: r.data.map((l) => lineOf({ ...l, labelAr: l.labelAr || l.labelEn, rfq: l.unitPrice == null })) };
}

// The lowest and highest price a package charges (for "from AED …" and the price range on its card).
export function priceRange(prices: Record<string, number>, activeKeys: string[]): { min: number; max: number } | null {
  const v = activeKeys.map((k) => prices[k]).filter((x): x is number => typeof x === "number");
  return v.length ? { min: Math.min(...v), max: Math.max(...v) } : null;
}
