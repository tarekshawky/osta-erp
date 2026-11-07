import type { Pkg, PkgService } from "./packages";

// The Smart Package Builder. A customer describes their property and what they need; this module compares that with what each package
// ACTUALLY includes (its AC limit, its services, its handyman hours), warns when the chosen package falls short, recommends the cheapest
// package that fits, and prices the request. It is one pure function used by the website (through the admin API, for the live summary)
// and again by the server when the request is submitted, so the price a customer is shown is the price that is stored.
//
// Rules it keeps: it never switches the customer's package on its own (it only suggests); every upgrade shows its price difference; a
// service the package already includes is never charged again; anything without an approved price is sent as a quotation request and
// adds no amount; and nothing is promised that the package does not state (a service with no limit stated covers nothing extra).

export type Lang = "en" | "ar";
export type FieldMode = "off" | "optional" | "required";
export const FIELD_KEYS = ["whatsapp", "area", "address", "bedrooms", "bathrooms", "floors", "size", "acUnits"] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];
export const EXTRA_KINDS = ["ac_units", "visits", "handyman_hours", "duct_vents", "plumbing", "electrical", "other"] as const;
export type ExtraKind = (typeof EXTRA_KINDS)[number];
export type Named = { key: string; en: string; ar: string };
export type ExtraDef = { key: ExtraKind; nameEn: string; nameAr: string; unitEn: string; unitAr: string; unitPrice: number | null; enabled: boolean };
export const MESSAGE_KEYS = ["ac", "service", "handyman", "best", "exceeds"] as const;
export type MessageKey = (typeof MESSAGE_KEYS)[number];
export type Template = { en: string; ar: string };

export type BuilderConfig = {
  enabled: boolean;
  calculator: boolean;
  propertyTypes: Named[];
  categories: Named[];
  fields: Record<FieldKey, FieldMode>;
  extras: ExtraDef[];
  messages: Record<MessageKey, Template>;
};

export type Option = { id: string; category: string; nameEn: string; nameAr: string; serviceId: string | null; extraPrice: number | null; upgradeTrigger: boolean };
export type Needs = { acUnits: number; handymanHours: number; optionIds: string[]; extras: Partial<Record<ExtraKind, number>>; otherText?: string };
export type Tax = { vatRatePercent: number; pricesIncludeVat: boolean };

export const DEFAULT_PROPERTY_TYPES: Named[] = [
  { key: "apartment", en: "Apartment", ar: "شقة" }, { key: "villa", en: "Villa", ar: "فيلا" }, { key: "office", en: "Office", ar: "مكتب" }, { key: "shop", en: "Shop", ar: "محل تجاري" },
  { key: "restaurant", en: "Restaurant", ar: "مطعم" }, { key: "commercial-building", en: "Commercial Building", ar: "مبنى تجاري" }, { key: "residential-building", en: "Residential Building", ar: "مبنى سكني" }, { key: "other", en: "Other", ar: "أخرى" },
];
export const DEFAULT_CATEGORIES: Named[] = [
  { key: "ac", en: "AC Maintenance", ar: "صيانة التكييف" }, { key: "plumbing", en: "Plumbing", ar: "السباكة" }, { key: "electrical", en: "Electrical", ar: "الكهرباء" }, { key: "handyman", en: "Handyman & General Maintenance", ar: "الهاندي مان والصيانة العامة" },
];
const EXTRA_DEFAULTS: Record<ExtraKind, [string, string, string, string]> = {
  ac_units: ["Additional AC Units", "مكيفات إضافية", "per unit", "للمكيف"],
  visits: ["Additional Maintenance Visits", "زيارات صيانة إضافية", "per visit", "للزيارة"],
  handyman_hours: ["Extra Handyman Hours", "ساعات هاندي مان إضافية", "per hour", "للساعة"],
  duct_vents: ["Additional Duct Cleaning", "تنظيف دكت إضافي", "per vent", "للفتحة"],
  plumbing: ["Additional Plumbing Services", "خدمات سباكة إضافية", "per service", "للخدمة"],
  electrical: ["Additional Electrical Services", "خدمات كهرباء إضافية", "per service", "للخدمة"],
  other: ["Other Requirements", "متطلبات أخرى", "", ""],
};

export const DEFAULT_MESSAGES: Record<MessageKey, Template> = {
  ac: {
    en: "You have selected {units} AC units, while your current package covers only {covered} units. Upgrade to {package} to enjoy coverage for up to {max} AC units.",
    ar: "لقد أدخلت {units} مكيفات، بينما تغطي باقتك الحالية {covered} مكيفات فقط. يمكنك الترقية إلى {package} لتغطية حتى {max} مكيفات.",
  },
  service: { en: "{service} is included in our {package}. Upgrade your plan to enjoy this benefit.", ar: "{service} مشمولة في {package}. قم بترقية باقتك للاستفادة من هذه الخدمة." },
  handyman: {
    en: "You need {hours} handyman hours. Your current package includes only {included} hour(s). Upgrade to {package} or add extra hours.",
    ar: "تحتاج إلى {hours} ساعات هاندي مان، بينما تشمل باقتك الحالية {included} ساعة فقط. يمكنك الترقية إلى {package} أو إضافة ساعات إضافية.",
  },
  best: { en: "Based on your requirements, {package} is the best package for your property.", ar: "بناءً على احتياجاتك، {package} هي الأنسب لعقارك." },
  exceeds: {
    en: "Your requirements go beyond our standard packages. Request a custom quotation and we will prepare an offer for you.",
    ar: "احتياجاتك تتجاوز باقاتنا القياسية. اطلب عرض سعر مخصص وسنجهز لك عرضاً مناسباً.",
  },
};

export function defaultBuilder(): BuilderConfig {
  return {
    enabled: false,
    calculator: true,
    propertyTypes: DEFAULT_PROPERTY_TYPES,
    categories: DEFAULT_CATEGORIES,
    fields: { whatsapp: "optional", area: "optional", address: "optional", bedrooms: "optional", bathrooms: "optional", floors: "optional", size: "optional", acUnits: "required" },
    extras: EXTRA_KINDS.map((k) => ({ key: k, nameEn: EXTRA_DEFAULTS[k][0], nameAr: EXTRA_DEFAULTS[k][1], unitEn: EXTRA_DEFAULTS[k][2], unitAr: EXTRA_DEFAULTS[k][3], unitPrice: null, enabled: true })),
    messages: DEFAULT_MESSAGES,
  };
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
const isMode = (v: unknown): v is FieldMode => v === "off" || v === "optional" || v === "required";

// A stored config, repaired: anything missing or malformed falls back to the default, so a half-saved config never breaks the form.
export function parseBuilder(raw: unknown): BuilderConfig {
  const d = defaultBuilder();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const named = (v: unknown, fallback: Named[]): Named[] => {
    if (!Array.isArray(v)) return fallback;
    const out = v.flatMap((x) => { const n = x as Partial<Named> | null; const key = str(n?.key, 40).replace(/[^a-z0-9-]/gi, "").toLowerCase(); return key && (str(n?.en) || str(n?.ar)) ? [{ key, en: str(n?.en), ar: str(n?.ar) }] : []; });
    return out.length ? out : fallback;
  };
  const fields = { ...d.fields };
  if (o.fields && typeof o.fields === "object") for (const k of FIELD_KEYS) { const m = (o.fields as Record<string, unknown>)[k]; if (isMode(m)) fields[k] = m; }
  const extras = d.extras.map((def) => {
    const x = Array.isArray(o.extras) ? (o.extras as Partial<ExtraDef>[]).find((e) => e?.key === def.key) : undefined;
    if (!x) return def;
    const price = typeof x.unitPrice === "number" && Number.isFinite(x.unitPrice) && x.unitPrice >= 0 ? x.unitPrice : null;
    return { key: def.key, nameEn: str(x.nameEn) || def.nameEn, nameAr: str(x.nameAr) || def.nameAr, unitEn: typeof x.unitEn === "string" ? str(x.unitEn, 40) : def.unitEn, unitAr: typeof x.unitAr === "string" ? str(x.unitAr, 40) : def.unitAr, unitPrice: price, enabled: x.enabled !== false };
  });
  const messages = { ...d.messages };
  if (o.messages && typeof o.messages === "object") for (const k of MESSAGE_KEYS) { const t = (o.messages as Record<string, Partial<Template>>)[k]; if (t && (str(t.en, 600) || str(t.ar, 600))) messages[k] = { en: str(t.en, 600) || d.messages[k].en, ar: str(t.ar, 600) || d.messages[k].ar }; }
  return { enabled: o.enabled === true, calculator: o.calculator !== false, propertyTypes: named(o.propertyTypes, d.propertyTypes), categories: named(o.categories, d.categories), fields, extras, messages };
}

// ---- helpers ----
const r2 = (n: number) => Math.round(n * 100) / 100;
const text = (en: string, ar: string, lang: Lang) => (lang === "ar" ? ar || en : en || ar);
export const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
const pkgName = (p: Pkg, lang: Lang) => text(p.nameEn, p.nameAr, lang);

const byPrice = (a: Pkg, b: Pkg) => (a.price ?? Infinity) - (b.price ?? Infinity);
const includes = (p: Pkg, serviceId: string | null) => !!serviceId && p.lines.some((l) => l.serviceId === serviceId);

// How many handyman hours a package covers: the limit typed on its handyman line. A line with no limit covers nothing extra.
function handymanLimit(p: Pkg, services: PkgService[]): number {
  const svc = services.find((s) => s.metric === "handyman_hours");
  const line = svc ? p.lines.find((l) => l.serviceId === svc.id) : undefined;
  return line?.limit ?? 0;
}

type Totals = { units: number; hours: number };
const totals = (n: Needs): Totals => ({ units: Math.max(0, n.acUnits || 0) + (n.extras.ac_units ?? 0), hours: Math.max(0, n.handymanHours || 0) + (n.extras.handyman_hours ?? 0) });

// Does this package cover everything the customer must have (the AC count, the handyman hours and every service that needs an upgrade)?
function fits(p: Pkg, services: PkgService[], options: Option[], n: Needs): boolean {
  const t = totals(n);
  if (p.maxAcUnits != null && t.units > p.maxAcUnits) return false;
  if (t.hours > handymanLimit(p, services) && !(p.price == null)) return false;
  return options.filter((o) => n.optionIds.includes(o.id) && o.upgradeTrigger && o.serviceId).every((o) => includes(p, o.serviceId));
}

export type Notice = { kind: "ac" | "service" | "handyman"; en: string; ar: string; upgradeTo: string | null; optionId?: string };
export type Line = { key: string; labelEn: string; labelAr: string; qty: number; unitPrice: number | null; amount: number | null; note: "base" | "included" | "extra" | "quote" };
export type Breakdown = { packageId: string; lines: Line[]; subtotal: number; vat: number; total: number; vatPercent: number; pricesIncludeVat: boolean; quote: boolean; quoteReasons: string[] };
export type Recommendation = { packageId: string; priceDiff: number | null; addedServices: { en: string; ar: string }[]; acCovers: number | null; custom: boolean };
export type Evaluation = {
  selectedId: string; selectedFits: boolean; recommendedId: string | null; exceedsAll: boolean;
  notices: Notice[]; best: { en: string; ar: string } | null; exceeds: { en: string; ar: string } | null; recommendation: Recommendation | null; breakdown: Breakdown;
};

export type EvalInput = { packages: Pkg[]; services: PkgService[]; options: Option[]; config: BuilderConfig; tax: Tax; selectedId: string; chosenId?: string; needs: Needs };

export function evaluateBuilder(inp: EvalInput): Evaluation {
  const { packages, services, options, config, tax, needs } = inp;
  const selected = packages.find((p) => p.id === inp.selectedId) ?? packages[0];
  const sorted = [...packages].sort(byPrice);
  const t = totals(needs);
  const picked = options.filter((o) => needs.optionIds.includes(o.id));
  const both = (k: MessageKey, f: (lang: Lang) => Record<string, string | number>) => ({ en: fill(config.messages[k].en, f("en")), ar: fill(config.messages[k].ar, f("ar")) });

  const selectedFits = fits(selected, services, options, needs);
  const notices: Notice[] = [];
  // 1. more AC units than the selected package covers
  if (selected.maxAcUnits != null && t.units > selected.maxAcUnits) {
    const up = sorted.find((p) => p.id !== selected.id && (p.maxAcUnits == null || p.maxAcUnits >= t.units) && (p.price ?? Infinity) >= (selected.price ?? 0));
    if (up) notices.push({ kind: "ac", upgradeTo: up.id, ...both("ac", (l) => ({ units: t.units, covered: selected.maxAcUnits!, package: pkgName(up, l), max: up.maxAcUnits ?? t.units })) });
  }
  // 2. services the selected package does not include but a package does
  for (const o of picked) {
    if (!o.serviceId || includes(selected, o.serviceId) || !o.upgradeTrigger) continue;
    const up = sorted.find((p) => p.id !== selected.id && includes(p, o.serviceId));
    if (up) notices.push({ kind: "service", optionId: o.id, upgradeTo: up.id, ...both("service", (l) => ({ service: text(o.nameEn, o.nameAr, l), package: pkgName(up, l) })) });
  }
  // 3. more handyman hours than the selected package includes
  const hLimit = handymanLimit(selected, services);
  if (t.hours > hLimit && selected.price != null) {
    const up = sorted.find((p) => p.id !== selected.id && handymanLimit(p, services) >= t.hours);
    if (up) notices.push({ kind: "handyman", upgradeTo: up.id, ...both("handyman", (l) => ({ hours: t.hours, included: hLimit, package: pkgName(up, l) })) });
  }

  // the cheapest package that covers everything (never switched automatically: this is only a suggestion)
  const recommendedPkg = selectedFits ? selected : sorted.find((p) => fits(p, services, options, needs)) ?? null;
  const exceedsAll = !selectedFits && !recommendedPkg;
  let recommendation: Recommendation | null = null;
  let best: Evaluation["best"] = null;
  if (!selectedFits && recommendedPkg) {
    recommendation = {
      packageId: recommendedPkg.id,
      priceDiff: recommendedPkg.price != null && selected.price != null ? r2(recommendedPkg.price - selected.price) : null,
      addedServices: recommendedPkg.lines.filter((l) => !selected.lines.some((s) => s.serviceId === l.serviceId)).flatMap((l) => { const s = services.find((x) => x.id === l.serviceId); return s ? [{ en: s.nameEn, ar: s.nameAr }] : []; }),
      acCovers: recommendedPkg.maxAcUnits,
      custom: recommendedPkg.price == null,
    };
    best = both("best", (l) => ({ package: pkgName(recommendedPkg, l) }));
  }
  const exceeds = exceedsAll ? { en: config.messages.exceeds.en, ar: config.messages.exceeds.ar } : null;

  const chosen = packages.find((p) => p.id === inp.chosenId) ?? selected;
  return { selectedId: selected.id, selectedFits, recommendedId: recommendedPkg?.id ?? null, exceedsAll, notices, best, exceeds, recommendation, breakdown: priceRequest(chosen, services, options, config, tax, needs, exceedsAll) };
}

// ---- price ----
export function priceRequest(p: Pkg, services: PkgService[], options: Option[], config: BuilderConfig, tax: Tax, needs: Needs, exceedsAll = false): Breakdown {
  const lines: Line[] = [];
  const reasons: string[] = [];
  const t = totals(needs);
  const extraDef = (k: ExtraKind) => config.extras.find((e) => e.key === k);
  const add = (key: string, labelEn: string, labelAr: string, qty: number, unitPrice: number | null, note: Line["note"] = "extra") => {
    const amount = unitPrice == null ? null : r2(unitPrice * qty);
    lines.push({ key, labelEn, labelAr, qty, unitPrice, amount, note: unitPrice == null && note === "extra" ? "quote" : note });
    if (unitPrice == null && note === "extra") reasons.push(labelEn);
  };

  // the package itself: no amount when it is priced by quotation
  lines.push({ key: "base", labelEn: p.nameEn, labelAr: p.nameAr, qty: 1, unitPrice: p.price, amount: p.price, note: p.price == null ? "quote" : "base" });
  if (p.price == null) reasons.push(p.nameEn);

  // services the customer ticked: included in the package = shown at no charge (never charged twice); otherwise an extra
  for (const o of options.filter((x) => needs.optionIds.includes(x.id))) {
    if (includes(p, o.serviceId)) lines.push({ key: `opt:${o.id}`, labelEn: o.nameEn, labelAr: o.nameAr, qty: 1, unitPrice: 0, amount: 0, note: "included" });
    else add(`opt:${o.id}`, o.nameEn, o.nameAr, 1, o.extraPrice);
  }
  // AC units and handyman hours beyond what the package covers
  if (p.maxAcUnits != null && t.units > p.maxAcUnits) { const d = extraDef("ac_units"); if (d?.enabled !== false) add("extra:ac_units", d?.nameEn ?? "Additional AC Units", d?.nameAr ?? "مكيفات إضافية", t.units - p.maxAcUnits, d?.unitPrice ?? null); else { reasons.push("AC units"); } }
  const covered = handymanLimit(p, services);
  if (t.hours > covered && p.price != null) { const d = extraDef("handyman_hours"); add("extra:handyman_hours", d?.nameEn ?? "Extra Handyman Hours", d?.nameAr ?? "ساعات هاندي مان إضافية", t.hours - covered, d?.unitPrice ?? null); }
  // the other extras the customer asked for (AC units and handyman hours are already counted above)
  for (const k of EXTRA_KINDS) {
    if (k === "ac_units" || k === "handyman_hours") continue;
    const qty = needs.extras[k] ?? 0;
    const d = extraDef(k);
    if (qty > 0 && d?.enabled !== false) add(`extra:${k}`, d?.nameEn ?? k, d?.nameAr ?? k, qty, k === "other" ? null : d?.unitPrice ?? null);
  }
  if ((needs.otherText ?? "").trim() && !lines.some((l) => l.key === "extra:other")) { lines.push({ key: "extra:other", labelEn: "Other requirements", labelAr: "متطلبات أخرى", qty: 1, unitPrice: null, amount: null, note: "quote" }); reasons.push("Other requirements"); }
  if (exceedsAll) reasons.push("Requirements beyond the standard packages");

  const subtotal = r2(lines.reduce((s, l) => s + (l.amount ?? 0), 0));
  const rate = tax.vatRatePercent;
  // Package prices may already include VAT (a setting): then VAT is the part inside the subtotal, otherwise it is added on top.
  const vat = tax.pricesIncludeVat ? r2((subtotal * rate) / (100 + rate)) : r2((subtotal * rate) / 100);
  const total = tax.pricesIncludeVat ? subtotal : r2(subtotal + vat);
  return { packageId: p.id, lines, subtotal, vat, total, vatPercent: rate, pricesIncludeVat: tax.pricesIncludeVat, quote: reasons.length > 0, quoteReasons: reasons };
}

// ---- what the customer sends ----
export function needsProblem(n: Needs): string | null {
  if (!Number.isFinite(n.acUnits) || n.acUnits < 0 || n.acUnits > 500) return "The number of AC units must be between 0 and 500.";
  if (!Number.isFinite(n.handymanHours) || n.handymanHours < 0 || n.handymanHours > 500) return "Handyman hours must be between 0 and 500.";
  if (n.optionIds.length > 100) return "Too many services selected.";
  for (const k of Object.keys(n.extras)) { const v = n.extras[k as ExtraKind]; if (!(EXTRA_KINDS as readonly string[]).includes(k) || typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 500) return "An extra quantity is not valid."; }
  return null;
}
