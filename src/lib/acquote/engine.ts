import { z } from "zod";
import type { AcConfig, Bi, PackageKey } from "./config";

// The ONE place a quotation's prices are worked out. The website asks the server to calculate (live preview) and the server works it out
// again when the quotation is created, so nothing the browser says about money is trusted. The result is a list of explicit lines: once
// stored they are the quotation, and a later change to the price list never alters them.

export type QuoteLine = {
  id: string;
  kind: "unit" | "plenum" | "service" | "custom";
  unitIndex: number | null;
  labelEn: string; labelAr: string; detailEn: string; detailAr: string;
  qty: number;
  unitPrice: number | null;
  // null = "request for quotation": not part of the totals until the administrator prices it after inspection.
  amount: number | null;
  rfq: boolean;
};

export type UnitInput = { acType: string; capacity: string; packageKey: PackageKey; qty: number };
export type ServiceInput = { key: string; qty: number; note?: string };
export type QuoteInput = { units: UnitInput[]; services: ServiceInput[] };

export type Totals = {
  baseTotal: number; plenumTotal: number; servicesTotal: number; subtotal: number;
  vatPercent: number; vat: number; total: number;
  rfq: boolean; rfqItems: Bi[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const line = (l: Omit<QuoteLine, "amount">): QuoteLine => ({ ...l, amount: l.unitPrice == null ? null : r2(l.unitPrice * l.qty) });

export const InputSchema = z.object({
  units: z.array(z.object({ acType: z.string().max(40), capacity: z.string().max(10), packageKey: z.enum(["standard", "complete", "premium"]), qty: z.number().int().min(1).max(100) })).min(1).max(30),
  services: z.array(z.object({ key: z.string().max(40), qty: z.number().int().min(1).max(1000), note: z.string().trim().max(500).optional() })).max(40).default([]),
});

export type BuildResult = { ok: true; lines: QuoteLine[]; totals: Totals } | { ok: false; error: string };

export function buildLines(cfg: AcConfig, input: QuoteInput): BuildResult {
  const lines: QuoteLine[] = [];
  if (input.units.length === 0) return { ok: false, error: "Add at least one AC unit." };
  for (const [i, u] of input.units.entries()) {
    const type = cfg.acTypes.find((t) => t.key === u.acType && t.active);
    const cap = cfg.capacities.find((c) => c.key === u.capacity && c.active);
    const pkg = cfg.packages.find((p) => p.key === u.packageKey && p.active);
    if (!type) return { ok: false, error: `Unit ${i + 1}: choose an AC type.` };
    if (!cap) return { ok: false, error: `Unit ${i + 1}: choose a capacity.` };
    if (!pkg) return { ok: false, error: `Unit ${i + 1}: choose an installation package.` };
    if (!Number.isInteger(u.qty) || u.qty < 1 || u.qty > 100) return { ok: false, error: `Unit ${i + 1}: the quantity must be between 1 and 100.` };
    lines.push(line({
      id: `u${i}`, kind: "unit", unitIndex: i, qty: u.qty, unitPrice: cap.prices[pkg.key], rfq: false,
      labelEn: `${type.nameEn} – ${cap.labelEn} – ${pkg.nameEn}`, labelAr: `${type.nameAr} – ${cap.labelAr} – ${pkg.nameAr}`,
      detailEn: pkg.subtitleEn, detailAr: pkg.subtitleAr,
    }));
    // The plenum modification is charged on EVERY unit, in every package, and cannot be switched off by the customer.
    lines.push(line({ id: `p${i}`, kind: "plenum", unitIndex: i, qty: u.qty, unitPrice: cfg.plenum.price, rfq: false, labelEn: cfg.plenum.nameEn, labelAr: cfg.plenum.nameAr, detailEn: "Mandatory, per unit", detailAr: "إلزامي، لكل وحدة" }));
  }
  for (const s of input.services) {
    const def = cfg.services.find((x) => x.key === s.key && x.active);
    if (!def) return { ok: false, error: "One of the additional services is not available." };
    if (!Number.isInteger(s.qty) || s.qty < 1 || s.qty > 1000) return { ok: false, error: "An additional service quantity is not valid." };
    const priced = !def.rfq && def.price != null;
    lines.push(line({
      id: `s:${def.key}`, kind: "service", unitIndex: null, qty: s.qty, unitPrice: priced ? def.price : null, rfq: !priced,
      labelEn: def.nameEn, labelAr: def.nameAr, detailEn: s.note?.trim() || (def.unit === "meter" ? "per metre" : def.unit === "unit" ? "per unit" : ""), detailAr: s.note?.trim() || (def.unit === "meter" ? "بالمتر" : def.unit === "unit" ? "للوحدة" : ""),
    }));
  }
  return { ok: true, lines, totals: totalsOf(lines, cfg.vatPercent) };
}

// Prices are shown WITHOUT VAT; VAT is added once, on the subtotal, at the end.
export function totalsOf(lines: QuoteLine[], vatPercent: number): Totals {
  const sum = (f: (l: QuoteLine) => boolean) => r2(lines.filter(f).reduce((s, l) => s + (l.amount ?? 0), 0));
  const baseTotal = sum((l) => l.kind === "unit");
  const plenumTotal = sum((l) => l.kind === "plenum");
  const servicesTotal = sum((l) => l.kind === "service" || l.kind === "custom");
  const subtotal = r2(baseTotal + plenumTotal + servicesTotal);
  const vat = r2((subtotal * vatPercent) / 100);
  const open = lines.filter((l) => l.amount == null);
  return { baseTotal, plenumTotal, servicesTotal, subtotal, vatPercent, vat, total: r2(subtotal + vat), rfq: open.length > 0, rfqItems: open.map((l) => ({ en: l.labelEn, ar: l.labelAr })) };
}

// ---- lines edited by an administrator (a revised quotation) ----

const money = z.number().min(0).max(10_000_000);
export const LinesSchema = z.array(z.object({
  id: z.string().min(1).max(60),
  kind: z.enum(["unit", "plenum", "service", "custom"]),
  unitIndex: z.number().int().min(0).max(100).nullable(),
  labelEn: z.string().trim().min(1).max(200), labelAr: z.string().trim().max(200), detailEn: z.string().trim().max(300), detailAr: z.string().trim().max(300),
  qty: z.number().int().min(1).max(100_000),
  unitPrice: money.nullable(),
  rfq: z.boolean(),
})).min(1).max(200);

export function linesFromEdit(raw: unknown): { ok: true; lines: QuoteLine[] } | { ok: false; error: string } {
  const r = LinesSchema.safeParse(raw);
  if (!r.success) return { ok: false, error: "A line is not valid: check the descriptions, quantities and prices." };
  if (!r.data.some((l) => l.kind === "unit")) return { ok: false, error: "A quotation needs at least one AC unit line." };
  if (new Set(r.data.map((l) => l.id)).size !== r.data.length) return { ok: false, error: "Two lines share the same id." };
  return { ok: true, lines: r.data.map((l) => line({ ...l, labelAr: l.labelAr || l.labelEn, rfq: l.unitPrice == null })) };
}
