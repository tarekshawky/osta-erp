import { z } from "zod";

// The HVAC ductwork quotation calculator: every rate, system, accessory, service, option list and text lives in ONE configuration
// document edited in the dashboard. The only prices written here are the three m² rates supplied for the launch; accessories and
// services have NO price until the administrator sets one (until then the customer sees "request for quotation").

export type Bi = { en: string; ar: string };
export type BiList = { en: string[]; ar: string[] };

export const UNITS = ["PCS", "LM", "m2", "SET", "LOT"] as const;
export type Unit = (typeof UNITS)[number];
export const UNIT_LABEL: Record<Unit, Bi> = {
  PCS: { en: "PCS", ar: "قطعة" }, LM: { en: "LM", ar: "متر طولي" }, m2: { en: "m²", ar: "م²" }, SET: { en: "SET", ar: "طقم" }, LOT: { en: "LOT", ar: "مجموعة / مبلغ مقطوع" },
};

// How the work is done. The administrator decides which of these are offered for each system, and at what rate: nothing is assumed.
export const MODES = ["supply-fabricate-install", "fabricate-supply", "install-only", "custom"] as const;
export type Mode = (typeof MODES)[number];
export const MODE_LABEL: Record<Mode, Bi> = {
  "supply-fabricate-install": { en: "Supply & Fabrication & Installation", ar: "توريد وتصنيع وتركيب" },
  "fabricate-supply": { en: "Fabrication & Supply Only", ar: "تصنيع وتوريد فقط" },
  "install-only": { en: "Installation Only", ar: "تركيب فقط" },
  custom: { en: "Custom Project Requirement", ar: "متطلبات مشروع خاصة" },
};

export const SPEC_KEYS = ["gauge", "fiberglass", "pir", "pressure", "application"] as const;
export type SpecKey = (typeof SPEC_KEYS)[number];

const bi = z.object({ en: z.string().max(2000), ar: z.string().max(2000) });
const biList = z.object({ en: z.array(z.string().max(400)).max(40), ar: z.array(z.string().max(400)).max(40) });
const money = z.number().min(0).max(10_000_000);
const unit = z.enum(UNITS);
const option = z.object({ key: z.string().regex(/^[a-z0-9-]{1,30}$/), en: z.string().max(80), ar: z.string().max(80) });
const modeRate = z.object({ enabled: z.boolean(), rate: money.nullable() });

export const ConfigSchema = z.object({
  vatPercent: z.number().min(0).max(100),
  validityDays: z.number().int().min(1).max(365),
  systems: z.array(z.object({
    key: z.string().regex(/^[a-z0-9-]{2,30}$/), nameEn: z.string().max(160), nameAr: z.string().max(160), shortEn: z.string().max(40), shortAr: z.string().max(40),
    descriptionEn: z.string().max(1000), descriptionAr: z.string().max(1000), included: biList, notIncluded: biList, technical: biList,
    // The specifications this system depends on (their fields appear in the technical step and are marked "subject to technical review" when unconfirmed).
    specFields: z.array(z.enum(SPEC_KEYS)).max(5),
    modes: z.object({ "supply-fabricate-install": modeRate, "fabricate-supply": modeRate, "install-only": modeRate, custom: modeRate }),
    active: z.boolean(),
  })).min(1).max(20),
  accessories: z.array(z.object({
    key: z.string().regex(/^[a-z0-9-]{2,40}$/), nameEn: z.string().max(160), nameAr: z.string().max(160), units: z.array(unit).min(1).max(5),
    prices: z.partialRecord(unit, money.nullable()), active: z.boolean(),
  })).max(80),
  services: z.array(z.object({
    key: z.string().regex(/^[a-z0-9-]{2,40}$/), nameEn: z.string().max(160), nameAr: z.string().max(160), unit, price: money.nullable(), rfq: z.boolean(), active: z.boolean(),
  })).max(40),
  discount: z.object({ enabled: z.boolean(), type: z.enum(["percent", "fixed"]), value: money, labelEn: z.string().max(80), labelAr: z.string().max(80) }),
  // 0 = no minimum. Below it the customer is asked to contact us instead of generating a quotation.
  minAreaM2: z.number().min(0).max(1_000_000),
  specs: z.object({ gauge: z.array(option).max(30), fiberglass: z.array(option).max(30), pir: z.array(option).max(30), pressure: z.array(option).max(30), application: z.array(option).max(30) }),
  estimateNotice: bi, straightDuctNote: bi, reviewNote: bi,
  terms: biList,
  projectTypes: z.array(option).min(1).max(20),
  emirates: z.array(z.object({ key: z.string().max(40), en: z.string().max(60), ar: z.string().max(60) })).min(1).max(20),
  // Shown next to the fields (the maths always uses millimetres, metres and square metres).
  labels: z.object({ dimension: z.string().max(10), length: z.string().max(10), area: z.string().max(10) }),
  uploads: z.object({ maxFiles: z.number().int().min(0).max(20), maxMb: z.number().min(1).max(25) }),
});
export type DuctConfig = z.infer<typeof ConfigSchema>;
export type DuctSystem = DuctConfig["systems"][number];

const l = (en: string[], ar: string[]): BiList => ({ en, ar });
const none = (): { enabled: boolean; rate: number | null } => ({ enabled: false, rate: null });
const std = (rate: number) => ({ "supply-fabricate-install": { enabled: true, rate }, "fabricate-supply": none(), "install-only": none(), custom: { enabled: true, rate: null } });
const acc = (key: string, nameEn: string, nameAr: string, units: Unit[]) => ({ key, nameEn, nameAr, units, prices: Object.fromEntries(units.map((u) => [u, null])) as Partial<Record<Unit, number | null>>, active: true });
const svc = (key: string, nameEn: string, nameAr: string, u: Unit, rfq = false) => ({ key, nameEn, nameAr, unit: u, price: null as number | null, rfq, active: true });
const opt = (key: string, en: string, ar = en) => ({ key, en, ar });

export const DEFAULT_CONFIG: DuctConfig = {
  vatPercent: 5,
  validityDays: 14,
  systems: [
    {
      key: "gi", nameEn: "GI Duct Fabrication & Installation", nameAr: "تصنيع وتركيب دكت الصاج المجلفن", shortEn: "GI", shortAr: "صاج مجلفن",
      descriptionEn: "Galvanized steel (GI) ductwork, fabricated and installed.", descriptionAr: "دكت من الصاج المجلفن، تصنيع وتركيب.",
      included: l(["GI galvanized steel duct fabrication.", "Standard duct connections.", "Standard installation accessories.", "Duct installation labour."], ["تصنيع دكت الصاج المجلفن.", "وصلات الدكت القياسية.", "إكسسوارات التركيب القياسية.", "عمالة تركيب الدكت."]),
      notIncluded: l(["Thermal insulation.", "Acoustic insulation.", "Diffusers and grilles.", "Dampers.", "Flexible ducts.", "Special supports and civil works."], ["العزل الحراري.", "العزل الصوتي.", "مخارج الهواء والجريلات.", "الدامبرز.", "الدكت المرن.", "الحوامل الخاصة والأعمال المدنية."]),
      technical: l([], []), specFields: ["gauge"], modes: std(130), active: true,
    },
    {
      key: "gi-fiberglass", nameEn: "GI Duct with Fiberglass Insulation", nameAr: "تصنيع وتركيب دكت الصاج المجلفن مع عزل الفايبر جلاس", shortEn: "GI + Fiberglass", shortAr: "صاج + فايبر جلاس",
      descriptionEn: "Galvanized steel ductwork with fiberglass thermal insulation.", descriptionAr: "دكت من الصاج المجلفن مع عزل حراري من الفايبر جلاس.",
      included: l(["GI galvanized steel duct fabrication.", "Fiberglass thermal insulation.", "Insulation fixing and finishing.", "Standard duct connections.", "Standard installation accessories.", "Duct installation labour."], ["تصنيع دكت الصاج المجلفن.", "عزل حراري من الفايبر جلاس.", "تثبيت العزل وتشطيبه.", "وصلات الدكت القياسية.", "إكسسوارات التركيب القياسية.", "عمالة تركيب الدكت."]),
      notIncluded: l(["PIR panels.", "Acoustic lining unless specified.", "Diffusers and grilles.", "Dampers.", "Flexible ducts.", "Special supports and civil works."], ["ألواح PIR.", "البطانة الصوتية ما لم تُحدد.", "مخارج الهواء والجريلات.", "الدامبرز.", "الدكت المرن.", "الحوامل الخاصة والأعمال المدنية."]),
      technical: l([], []), specFields: ["gauge", "fiberglass"], modes: std(170), active: true,
    },
    {
      key: "pir", nameEn: "PIR Pre-Insulated Duct", nameAr: "تصنيع وتركيب دكت PIR مسبق العزل", shortEn: "PIR", shortAr: "PIR",
      descriptionEn: "PIR pre-insulated duct panels, cut, fabricated and installed.", descriptionAr: "ألواح دكت PIR مسبقة العزل، قص وتصنيع وتركيب.",
      included: l(["PIR pre-insulated duct panels.", "Cutting and fabrication.", "Standard jointing materials.", "Standard sealing and fixing accessories.", "Duct installation labour."], ["ألواح دكت PIR مسبقة العزل.", "القص والتصنيع.", "مواد الوصل القياسية.", "إكسسوارات الإحكام والتثبيت القياسية.", "عمالة تركيب الدكت."]),
      notIncluded: l(["GI sheet metal ductwork.", "Additional external insulation.", "Acoustic lining unless specified.", "Diffusers and grilles.", "Dampers.", "Flexible ducts.", "Special supports and civil works."], ["دكت الصاج المجلفن.", "عزل خارجي إضافي.", "البطانة الصوتية ما لم تُحدد.", "مخارج الهواء والجريلات.", "الدامبرز.", "الدكت المرن.", "الحوامل الخاصة والأعمال المدنية."]),
      technical: l([], []), specFields: ["pir"], modes: std(160), active: true,
    },
  ],
  accessories: [
    acc("supply-diffuser", "Supply Air Diffuser", "مخرج هواء تغذية", ["PCS"]), acc("return-grille", "Return Air Grille", "جريل هواء راجع", ["PCS"]), acc("linear-slot-diffuser", "Linear Slot Diffuser", "مخرج هواء خطي", ["LM", "PCS"]),
    acc("vcd", "Volume Control Damper (VCD)", "دامبر التحكم في الهواء", ["PCS"]), acc("fire-damper", "Fire Damper", "دامبر مقاوم للحريق", ["PCS"]), acc("smoke-damper", "Smoke Damper", "دامبر دخان", ["PCS"]),
    acc("flexible-duct", "Flexible Duct", "دكت مرن", ["LM"]), acc("access-door", "Access Door", "باب صيانة للدكت", ["PCS"]), acc("acoustic-insulation", "Acoustic Insulation", "عزل صوتي", ["m2"]),
    acc("acoustic-lining", "Acoustic Lining", "بطانة عزل صوتي داخلية", ["m2"]), acc("supports-hangers", "Duct Supports & Hangers", "حوامل وتعليقات الدكت", ["SET", "PCS"]), acc("elbows-bends", "Duct Elbows & Bends", "أكواع وانحناءات الدكت", ["PCS"]),
    acc("reducers-transitions", "Reducers & Transitions", "وصلات تخفيض وتحويل", ["PCS"]), acc("branches", "Duct Branches", "تفريعات الدكت", ["PCS"]), acc("duct-sealing", "Duct Sealing", "إحكام غلق الدكت", ["m2", "LOT"]),
    acc("additional-thermal-insulation", "Additional Thermal Insulation", "عزل حراري إضافي", ["m2"]),
  ],
  services: [
    svc("site-measurement", "Site Measurement", "معاينة وقياس الموقع", "LOT"), svc("duct-design", "HVAC Duct Design", "تصميم مخططات الدكت", "LOT", true), svc("shop-drawings", "Shop Drawings", "المخططات التنفيذية", "LOT", true),
    svc("duct-installation-only", "Duct Installation Only", "تركيب الدكت فقط", "m2"), svc("duct-fabrication-only", "Duct Fabrication Only", "تصنيع الدكت فقط", "m2"), svc("material-supply-only", "Material Supply Only", "توريد الخامات فقط", "LOT", true),
    svc("duct-testing", "Duct Testing", "اختبار الدكت", "LOT"), svc("air-leakage-testing", "Air Leakage Testing", "اختبار تسريب الهواء", "LOT"), svc("tab", "Testing, Adjusting & Balancing (TAB)", "اختبار وضبط وموازنة تدفق الهواء", "LOT", true),
    svc("supervision", "Project Supervision", "الإشراف على المشروع", "LOT", true), svc("removal-existing", "Removal of Existing Ductwork", "إزالة الدكت القديم", "LOT", true), svc("other-service", "Other Custom Services", "خدمات أخرى", "LOT", true),
  ],
  discount: { enabled: false, type: "percent", value: 0, labelEn: "Discount", labelAr: "خصم" },
  minAreaM2: 0,
  specs: {
    gauge: [opt("24", "24 gauge"), opt("22", "22 gauge"), opt("20", "20 gauge"), opt("18", "18 gauge")],
    fiberglass: [opt("25mm", "25 mm", "25 مم"), opt("38mm", "38 mm", "38 مم"), opt("50mm", "50 mm", "50 مم")],
    pir: [opt("20mm", "20 mm", "20 مم"), opt("30mm", "30 mm", "30 مم")],
    pressure: [opt("low", "Low pressure", "ضغط منخفض"), opt("medium", "Medium pressure", "ضغط متوسط"), opt("high", "High pressure", "ضغط عالٍ")],
    application: [opt("supply", "Supply air", "هواء تغذية"), opt("return", "Return air", "هواء راجع"), opt("fresh", "Fresh air", "هواء نقي"), opt("exhaust", "Exhaust", "شفط"), opt("kitchen", "Kitchen exhaust", "شفط مطابخ")],
  },
  estimateNotice: { en: "Estimated Quotation – Subject to Technical Review & Final Site Measurement", ar: "عرض سعر تقديري – يخضع للمراجعة الفنية والقياسات النهائية بالموقع" },
  straightDuctNote: {
    en: "This calculation covers straight duct surfaces only. Elbows, reducers, transitions, branches, and special fittings must be separately measured or quoted.",
    ar: "يغطي هذا الحساب أسطح الدكت المستقيمة فقط. يجب قياس أو تسعير الأكواع والوصلات والتحويلات والتفريعات والقطع الخاصة بشكل منفصل.",
  },
  reviewNote: { en: "Not confirmed by the customer: subject to technical review.", ar: "لم يؤكدها العميل: تخضع للمراجعة الفنية." },
  terms: l(
    ["This is an estimated quotation. It is subject to technical review and final site measurement.", "The rates apply to straight duct surfaces measured in square metres. Elbows, reducers, transitions, branches and special fittings are measured or quoted separately.", "Accessories and components are not included in the square-metre ductwork rates unless they are listed in this quotation.", "Specifications that the customer has not confirmed are subject to technical review.", "Items marked “request for quotation” are not included in the totals and are priced separately.", "Prices are in UAE Dirhams (AED); VAT is added once, on the subtotal."],
    ["هذا عرض سعر تقديري يخضع للمراجعة الفنية والقياسات النهائية بالموقع.", "تنطبق الأسعار على أسطح الدكت المستقيمة المقاسة بالمتر المربع. تُقاس أو تُسعَّر الأكواع والوصلات والتحويلات والتفريعات والقطع الخاصة بشكل منفصل.", "الإكسسوارات والمكونات غير مشمولة في أسعار المتر المربع للدكت ما لم تُدرج في عرض السعر.", "المواصفات التي لم يؤكدها العميل تخضع للمراجعة الفنية.", "البنود المعلّمة «بعرض سعر» غير مشمولة في الإجماليات ويتم تسعيرها بشكل منفصل.", "الأسعار بالدرهم الإماراتي، وتُضاف ضريبة القيمة المضافة مرة واحدة على المجموع."],
  ),
  projectTypes: [
    opt("residential", "Residential", "سكني"), opt("villa", "Villa", "فيلا"), opt("apartment", "Apartment", "شقة"), opt("commercial", "Commercial", "تجاري"), opt("office", "Office", "مكتب"), opt("restaurant", "Restaurant", "مطعم"),
    opt("hotel", "Hotel", "فندق"), opt("industrial", "Industrial", "صناعي"), opt("factory", "Factory", "مصنع"), opt("warehouse", "Warehouse", "مستودع"), opt("other", "Other", "أخرى"),
  ],
  emirates: [
    { key: "Ajman", en: "Ajman", ar: "عجمان" }, { key: "Sharjah", en: "Sharjah", ar: "الشارقة" }, { key: "Umm Al Quwain", en: "Umm Al Quwain", ar: "أم القيوين" }, { key: "Dubai", en: "Dubai", ar: "دبي" },
    { key: "Abu Dhabi", en: "Abu Dhabi", ar: "أبوظبي" }, { key: "Al Ain", en: "Al Ain", ar: "العين" }, { key: "Ras Al Khaimah", en: "Ras Al Khaimah", ar: "رأس الخيمة" }, { key: "Fujairah", en: "Fujairah", ar: "الفجيرة" }, { key: "Other", en: "Other", ar: "أخرى" },
  ],
  labels: { dimension: "mm", length: "m", area: "m²" },
  uploads: { maxFiles: 10, maxMb: 15 },
};

export function parseConfig(raw: unknown): DuctConfig {
  const r = ConfigSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_CONFIG;
}

// What the website may see: only what is switched on, and only the work modes the administrator offers for each system.
export function publicConfig(c: DuctConfig) {
  return { ...c, systems: c.systems.filter((s) => s.active), accessories: c.accessories.filter((a) => a.active), services: c.services.filter((s) => s.active) };
}
export type PublicDuctConfig = ReturnType<typeof publicConfig>;
