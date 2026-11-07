import { z } from "zod";

// Annual home maintenance packages: the shapes shared by the admin, the public API and the website, the comparison table that is
// built from the packages themselves (so it always matches them), the checks on what an admin saves and on a customer's request.

export type Lang = "en" | "ar";
// limit: the number the package covers for this service (for example 2 handyman hours); the Smart Package Builder compares needs with it.
export type PkgLine = { serviceId: string; quantityEn: string; quantityAr: string; shortEn?: string; shortAr?: string; limit?: number };
export type PkgService = { id: string; nameEn: string; nameAr: string; showInComparison: boolean; metric?: string };
export type Bullet = { en: string; ar: string };
export type Pkg = {
  id: string; nameEn: string; nameAr: string; descriptionEn: string; descriptionAr: string; suitableEn: string; suitableAr: string;
  // null = "Custom Quotation" (priceText says so, or the default wording does). pricePrefix is for "Starting from".
  price: number | null; pricePrefixEn?: string; pricePrefixAr?: string; priceTextEn?: string; priceTextAr?: string;
  maxAcUnits: number | null; badgeEn: string; badgeAr: string; highlighted: boolean; bullets?: Bullet[]; lines: PkgLine[];
};
export type CtaMode = "subscribe" | "quote";
export type PkgSettings = {
  headingEn: string; headingAr: string; subtitleEn: string; subtitleAr: string; noteEn: string; noteAr: string; termsEn: string; termsAr: string;
};

export const text = (en: string, ar: string, lang: Lang) => (lang === "ar" ? ar || en : en || ar);

export function formatPrice(price: number, lang: Lang): string {
  const n = price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return lang === "ar" ? `${n} د.إ` : `AED ${n}`;
}

// What a package's price reads as: "AED 999", "Starting from AED 399" or "Custom Quotation".
export function priceText(p: Pick<Pkg, "price" | "pricePrefixEn" | "pricePrefixAr" | "priceTextEn" | "priceTextAr">, lang: Lang): { prefix: string; amount: string; custom: boolean } {
  if (p.price == null) return { prefix: "", amount: text(p.priceTextEn ?? "", p.priceTextAr ?? "", lang) || (lang === "ar" ? "عرض سعر مخصص" : "Custom Quotation"), custom: true };
  return { prefix: text(p.pricePrefixEn ?? "", p.pricePrefixAr ?? "", lang), amount: formatPrice(p.price, lang), custom: false };
}

// Terms are typed one per line (a leading "1." or "-" is ignored, the website numbers them itself).
export function termsList(raw: string): string[] {
  return raw.split("\n").map((l) => l.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "").trim()).filter(Boolean);
}

// ---- comparison table ----
// The short value of a line for the table: the one typed in, else "✓" for "Included", else the leading number ("2 visits/year" -> 2),
// else the whole text.
export function shortValue(line: PkgLine | undefined, lang: Lang): string {
  if (!line) return "—";
  const explicit = (lang === "ar" ? line.shortAr : line.shortEn)?.trim() || line.shortEn?.trim();
  if (explicit) return explicit;
  const q = (lang === "ar" ? line.quantityAr : line.quantityEn).trim() || line.quantityEn.trim() || line.quantityAr.trim();
  if (!q) return "✓";
  if (/^(included|مشمول)/i.test(q)) return "✓";
  const lead = q.match(/^\d+(?:[.,]\d+)?/);
  return lead ? lead[0] : q;
}

export type ComparisonRow = { key: string; labelEn: string; labelAr: string; cells: { en: string; ar: string }[] };

export function buildComparison(packages: Pkg[], services: PkgService[]): ComparisonRow[] {
  // "699", "399+" (starting from) or the custom wording ("Custom").
  const priceCell = (p: Pkg, lang: Lang) => {
    if (p.price == null) return lang === "ar" ? "مخصص" : "Custom";
    return p.price.toLocaleString("en-US", { maximumFractionDigits: 2 }) + ((p.pricePrefixEn || p.pricePrefixAr) ? "+" : "");
  };
  const rows: ComparisonRow[] = [
    { key: "price", labelEn: "Annual Price", labelAr: "السعر السنوي", cells: packages.map((p) => ({ en: priceCell(p, "en"), ar: priceCell(p, "ar") })) },
  ];
  if (packages.some((p) => p.maxAcUnits != null)) {
    rows.push({ key: "ac", labelEn: "Maximum AC Units", labelAr: "الحد الأقصى للمكيفات", cells: packages.map((p) => ({ en: p.maxAcUnits == null ? "—" : String(p.maxAcUnits), ar: p.maxAcUnits == null ? "—" : String(p.maxAcUnits) })) });
  }
  for (const s of services) {
    if (!s.showInComparison) continue;
    const per = packages.map((p) => p.lines.find((l) => l.serviceId === s.id));
    // A service no active package includes would be a row of dashes.
    if (per.every((l) => !l)) continue;
    rows.push({ key: s.id, labelEn: s.nameEn, labelAr: s.nameAr, cells: per.map((l) => ({ en: shortValue(l, "en"), ar: shortValue(l, "ar") })) });
  }
  return rows;
}

// ---- what an admin saves ----
// No package or service may offer pest control.
const PEST = /pest|insect|مكافحة|حشرات/i;

export function packageProblem(p: { nameEn: string; nameAr: string; price: number | null; maxAcUnits: number | null; lines: PkgLine[]; bullets?: Bullet[] }, serviceIds: Set<string>): string | null {
  if (!p.nameEn.trim() || !p.nameAr.trim()) return "Give the package a name in English and in Arabic.";
  // An empty price is a "Custom Quotation" package; a typed one must make sense.
  if (p.price != null && (!Number.isFinite(p.price) || p.price <= 0 || p.price > 1_000_000)) return "Enter the yearly price (more than 0), or leave it empty for a custom quotation.";
  if ((p.bullets ?? []).length > 30 || (p.bullets ?? []).some((b) => b.en.length > 200 || b.ar.length > 200)) return "Each bullet can be up to 200 characters, and a package can have up to 30.";
  if (p.maxAcUnits != null && (!Number.isInteger(p.maxAcUnits) || p.maxAcUnits < 1 || p.maxAcUnits > 200)) return "The maximum number of AC units must be a whole number from 1 to 200.";
  const seen = new Set<string>();
  for (const l of p.lines) {
    if (!serviceIds.has(l.serviceId)) return "One of the included services no longer exists. Reload the page.";
    if (seen.has(l.serviceId)) return "A service is listed twice in this package.";
    seen.add(l.serviceId);
    if (l.quantityEn.length > 120 || l.quantityAr.length > 120 || (l.shortEn?.length ?? 0) > 30 || (l.shortAr?.length ?? 0) > 30) return "A quantity is too long.";
    if (l.limit != null && (!Number.isFinite(l.limit) || l.limit < 0 || l.limit > 100_000)) return "A limit must be a number from 0 up.";
  }
  if (PEST.test(`${p.nameEn} ${p.nameAr} ${p.lines.map((l) => `${l.quantityEn} ${l.quantityAr}`).join(" ")} ${(p.bullets ?? []).map((b) => `${b.en} ${b.ar}`).join(" ")}`)) return "Pest control cannot be part of a maintenance package.";
  return null;
}

export function serviceProblem(nameEn: string, nameAr: string): string | null {
  if (!nameEn.trim() || !nameAr.trim()) return "Give the service a name in English and in Arabic.";
  if (nameEn.length > 80 || nameAr.length > 80) return "Service names can be up to 80 characters.";
  if (PEST.test(`${nameEn} ${nameAr}`)) return "Pest control cannot be part of a maintenance package.";
  return null;
}

// ---- a customer's "Subscribe now" request ----
export const EMIRATES = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Al Ain", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"] as const;
export const PROPERTY_TYPES = ["Apartment", "Villa"] as const;
// The request statuses. The first four are the older ones, still valid for requests made before the Smart Package Builder.
export const REQUEST_STATUSES = ["New Request", "Under Review", "Upgrade Suggested", "Quotation Sent", "Customer Approved", "Payment Pending", "Paid", "Contract Activated", "Rejected"] as const;
export const SUBSCRIPTION_STATUSES = [...REQUEST_STATUSES, "New", "Contacted", "Activated", "Cancelled"] as const;

const base = {
  packageId: z.string().min(1).max(40),
  groupKey: z.string().max(40).regex(/^[a-z0-9-]*$/).default(""),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).refine((v) => { const d = v.replace(/\D/g, ""); return d.length >= 8 && d.length <= 15; }),
  email: z.string().trim().toLowerCase().max(120).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  emirate: z.enum(EMIRATES),
  location: z.string().trim().max(300).default(""),
  activationDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(""),
};

// A household subscribing: the property details are required.
const subscribe = z.object({
  ...base, kind: z.literal("subscribe").default("subscribe"), company: z.string().trim().max(120).default(""), message: z.string().trim().max(1000).default(""),
  propertyType: z.enum(PROPERTY_TYPES),
  // 0 = studio
  bedrooms: z.number().int().min(0).max(10),
  acUnits: z.number().int().min(1).max(50),
});

// A business asking for a quotation: a company name and a message instead of the household's property details; units are optional.
const quote = z.object({
  ...base, kind: z.literal("quote"), company: z.string().trim().max(120).default(""), message: z.string().trim().max(1000).default(""),
  propertyType: z.string().trim().max(60).default(""),
  bedrooms: z.number().int().min(0).max(10).default(0),
  acUnits: z.number().int().min(0).max(500).default(0),
});

export const SubscriptionInput = z.union([quote, subscribe]);
export type SubscriptionInput = z.infer<typeof SubscriptionInput>;

// The preferred activation date cannot be in the past (today is fine). Dates are UAE dates.
export function activationDateProblem(date: string, now = Date.now()): string | null {
  if (!date) return null;
  const t = Date.parse(`${date}T23:59:59+04:00`);
  if (Number.isNaN(t)) return "Choose a valid activation date.";
  if (t < now) return "The activation date cannot be in the past.";
  if (t > now + 366 * 86_400_000) return "Choose an activation date within the next year.";
  return null;
}

// ---- the standard packages (loaded once from the admin, then edited freely) ----
type SeedLine = { service: string; en: string; ar: string; shortEn?: string; shortAr?: string; limit?: number };

const visits = (n: number): [string, string] => [`${n} visit${n > 1 ? "s" : ""}/year`, n === 1 ? "زيارة واحدة في السنة" : n === 2 ? "زيارتان في السنة" : `${n} زيارات في السنة`];
const callouts = (n: number): [string, string] => [`${n} callouts/year`, n === 2 ? "بلاغان في السنة" : `${n} بلاغات في السنة`];
const times = (n: number): [string, string] => [`${n} times/year`, n === 2 ? "مرتان في السنة" : `${n} مرات في السنة`];
const hours = (n: number): [string, string] => [`${n} hour${n > 1 ? "s" : ""}/year`, n === 1 ? "ساعة واحدة في السنة" : n === 2 ? "ساعتان في السنة" : `${n} ساعات في السنة`];
const line = (service: string, [en, ar]: [string, string], short?: string, limit?: number): SeedLine => ({ service, en, ar, shortEn: short, shortAr: short, ...(limit != null ? { limit } : {}) });
const included = (service: string, en = "Included", ar = "مشمول"): SeedLine => ({ service, en, ar, shortEn: "✓", shortAr: "✓" });
const withinHandyman = (service: string): SeedLine => ({ service, en: "Included within handyman allowance", ar: "مشمولة ضمن رصيد الهاندي مان" });
const vents = (n: number): SeedLine => ({ service: "vents", en: `1 visit/year – up to ${n} vents`, ar: `زيارة واحدة في السنة – حتى ${n} فتحات`, shortEn: `${n} Vents`, shortAr: `${n} فتحات` });

export const STANDARD_SERVICES: { key: string; nameEn: string; nameAr: string; showInComparison: boolean; metric?: string }[] = [
  { key: "ac", nameEn: "Preventive AC Maintenance", nameAr: "الصيانة الوقائية للمكيفات", showInComparison: true },
  { key: "plumbing", nameEn: "Plumbing Inspection", nameAr: "فحص السباكة", showInComparison: true },
  { key: "electrical", nameEn: "Electrical Inspection", nameAr: "فحص الكهرباء", showInComparison: true },
  { key: "callouts", nameEn: "Maintenance Callouts", nameAr: "بلاغات الأعطال", showInComparison: true },
  { key: "balcony", nameEn: "Balcony Drain Cleaning", nameAr: "تنظيف مصارف البلكونة", showInComparison: true },
  { key: "handyman", nameEn: "Handyman Services", nameAr: "خدمات الهاندي مان", showInComparison: true, metric: "handyman_hours" },
  { key: "carpentry", nameEn: "Minor Carpentry Works", nameAr: "أعمال النجارة البسيطة", showInComparison: false },
  { key: "painting", nameEn: "Minor Painting Touch-ups", nameAr: "رتوش الدهانات البسيطة", showInComparison: false },
  { key: "masonry", nameEn: "Minor Masonry Works", nameAr: "أعمال المحارة والإصلاحات البسيطة", showInComparison: false },
  { key: "vents", nameEn: "AC Duct Vent Cleaning", nameAr: "تنظيف فتحات التكييف الدكت", showInComparison: true },
  { key: "emergency", nameEn: "24/7 Emergency Call Reception", nameAr: "استقبال بلاغات الطوارئ على مدار الساعة", showInComparison: true },
  { key: "priority", nameEn: "Priority Booking", nameAr: "أولوية حجز المواعيد", showInComparison: true },
];

export const STANDARD_PACKAGES: { nameEn: string; nameAr: string; price: number; maxAcUnits: number; suitableEn: string; suitableAr: string; badgeEn: string; badgeAr: string; highlighted: boolean; lines: SeedLine[] }[] = [
  {
    nameEn: "Essential Package", nameAr: "الباقة الأساسية", price: 699, maxAcUnits: 2, badgeEn: "", badgeAr: "", highlighted: false,
    suitableEn: "Studios and small apartments – up to 2 AC units.", suitableAr: "الاستوديوهات والشقق الصغيرة – حتى مكيفين.",
    lines: [line("ac", visits(2), "2"), line("plumbing", visits(1), "1"), line("electrical", visits(1), "1"), line("callouts", callouts(2), "2"), line("balcony", times(2), "2"), included("priority")],
  },
  {
    nameEn: "Silver Package", nameAr: "الباقة الفضية", price: 999, maxAcUnits: 3, badgeEn: "", badgeAr: "", highlighted: false,
    suitableEn: "Apartments with up to 2 bedrooms – up to 3 AC units.", suitableAr: "الشقق حتى غرفتين – حتى 3 مكيفات.",
    lines: [line("ac", visits(2), "2"), line("plumbing", visits(2), "2"), line("electrical", visits(2), "2"), line("callouts", callouts(4), "4"), line("balcony", times(3), "3"), line("handyman", hours(1), "1", 1), included("priority")],
  },
  {
    nameEn: "Gold Package", nameAr: "الباقة الذهبية", price: 1499, maxAcUnits: 5, badgeEn: "Most Recommended", badgeAr: "الأكثر ترشيحاً", highlighted: true,
    suitableEn: "Apartments with up to 3 bedrooms – up to 5 AC units.", suitableAr: "الشقق حتى 3 غرف – حتى 5 مكيفات.",
    lines: [line("ac", visits(2), "2"), line("plumbing", visits(2), "2"), line("electrical", visits(2), "2"), line("callouts", callouts(6), "6"), line("balcony", times(3), "3"), line("handyman", hours(2), "2", 2), withinHandyman("carpentry"), withinHandyman("painting"), vents(5), included("emergency"), included("priority")],
  },
  {
    nameEn: "Platinum Package", nameAr: "الباقة البلاتينية", price: 2299, maxAcUnits: 8, badgeEn: "Premium Package", badgeAr: "الباقة المميزة", highlighted: false,
    suitableEn: "Large apartments and small villas – up to 8 AC units.", suitableAr: "الشقق الكبيرة والفلل الصغيرة – حتى 8 مكيفات.",
    lines: [line("ac", visits(2), "2"), line("plumbing", visits(2), "2"), line("electrical", visits(2), "2"), line("callouts", callouts(8), "8"), line("balcony", times(4), "4"), line("handyman", hours(4), "4", 4), withinHandyman("carpentry"), withinHandyman("painting"), withinHandyman("masonry"), vents(10), included("emergency"), included("priority", "Included (top priority)", "مشمول (أولوية قصوى)")],
  },
];

export const STANDARD_SETTINGS: PkgSettings = {
  headingEn: "Choose the Right Maintenance Plan for Your Home",
  headingAr: "اختر باقة الصيانة المناسبة لمنزلك",
  subtitleEn: "Enjoy peace of mind with OSTA Home Care annual maintenance packages. Professional AC, plumbing, electrical and handyman services to keep your home running smoothly throughout the year.",
  subtitleAr: "استمتع براحة البال مع باقات اسطا للصيانة المنزلية السنوية. خدمات متكاملة لصيانة المكيفات والسباكة والكهرباء وأعمال الهاندي مان، للحفاظ على منزلك طوال العام.",
  noteEn: "All prices are in AED per year.",
  noteAr: "جميع الأسعار بالدرهم الإماراتي سنوياً.",
  termsEn: [
    "Each annual maintenance package covers one registered property at one address only.",
    "The package is limited to the maximum number of AC units specified in the selected plan.",
    "Preventive maintenance visits are scheduled in coordination with the customer.",
    "Maintenance callouts cover technician attendance and fault inspection only. Repair labor, spare parts and materials are charged separately unless explicitly included.",
    "Refrigerant gas, compressors, motors, electrical components, spare parts and replacement equipment are not included.",
    "Major plumbing, electrical, civil, structural and installation works are excluded.",
    "Handyman hours cover labor time only. Materials and additional supplies are charged separately.",
    "Handyman hours are limited to the annual allowance of the selected package and cannot be carried forward to the next year.",
    "AC duct vent cleaning is limited to the number of vents specified in the package. Full duct cleaning is not included.",
    "Additional callouts beyond the annual allowance will be charged at OSTA's standard rates.",
    "Emergency support means 24/7 reception and prioritization of emergency requests, subject to technician availability and location.",
    "The contract is valid for 12 months from the activation date.",
    "Services must be booked in advance and are subject to service-area availability.",
    "Any service not expressly listed in the selected package is considered an additional paid service.",
  ].join("\n"),
  termsAr: [
    "كل باقة صيانة سنوية تغطي عقاراً واحداً مسجلاً على عنوان واحد فقط.",
    "تقتصر الباقة على الحد الأقصى لعدد المكيفات الموضح في الباقة المختارة.",
    "يتم تحديد مواعيد الصيانة الوقائية بالتنسيق مع العميل.",
    "تشمل بلاغات الأعطال حضور الفني وفحص العطل فقط، ولا تشمل أجور الإصلاح أو قطع الغيار أو المواد إلا إذا تم النص على ذلك صراحةً.",
    "لا تشمل الباقة غاز التبريد أو الكمبروسر أو المحركات أو المكونات الكهربائية أو قطع الغيار أو الأجهزة البديلة.",
    "لا تشمل الأعمال الكبيرة في السباكة أو الكهرباء أو الأعمال المدنية أو الإنشائية أو التركيب.",
    "ساعات الهاندي مان تشمل أجور العمالة فقط، وتُحاسب المواد والمستلزمات الإضافية بشكل منفصل.",
    "ساعات الهاندي مان محددة بالرصيد السنوي للباقة ولا يتم ترحيل الساعات غير المستخدمة للسنة التالية.",
    "تنظيف فتحات الدكت يقتصر على عدد الفتحات المحدد في الباقة، ولا يشمل التنظيف الكامل لمجاري الهواء الداخلية.",
    "يتم احتساب أي بلاغات إضافية تتجاوز العدد السنوي وفقاً لأسعار اسطا المعتمدة.",
    "خدمة الطوارئ تعني استقبال البلاغات على مدار الساعة وإعطاء الأولوية لها، وفقاً لتوفر الفنيين وموقع العميل.",
    "العقد صالح لمدة 12 شهراً من تاريخ التفعيل.",
    "يجب حجز الخدمات مسبقاً، وتخضع لتغطية مناطق الخدمة.",
    "أي خدمة غير مذكورة صراحةً ضمن الباقة المختارة تعتبر خدمة إضافية مدفوعة.",
  ].join("\n"),
};
