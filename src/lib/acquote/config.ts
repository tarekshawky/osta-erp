import { z } from "zod";

// The Ducted / Concealed / Semi-Central AC installation calculator: everything an administrator can change (prices, packages, optional
// services, texts) lives in ONE configuration document, edited in the dashboard. Nothing about prices is written into the code except
// the starting values below, which are the figures supplied for the launch.

export type Bi = { en: string; ar: string };
export type BiList = { en: string[]; ar: string[] };

export const PACKAGE_KEYS = ["standard", "complete", "premium"] as const;
export type PackageKey = (typeof PACKAGE_KEYS)[number];

const bi = z.object({ en: z.string().max(2000), ar: z.string().max(2000) });
const biList = z.object({ en: z.array(z.string().max(400)).max(40), ar: z.array(z.string().max(400)).max(40) });
const money = z.number().min(0).max(1_000_000);

export const ConfigSchema = z.object({
  vatPercent: z.number().min(0).max(100),
  // How long a generated quotation stays valid.
  validityDays: z.number().int().min(1).max(365),
  // Charged automatically on EVERY unit: the customer cannot remove it.
  plenum: z.object({ nameEn: z.string().max(200), nameAr: z.string().max(200), price: money, descriptionEn: z.string().max(2000), descriptionAr: z.string().max(2000), included: biList, notIncluded: biList }),
  acTypes: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]{2,30}$/), nameEn: z.string().max(120), nameAr: z.string().max(120), descriptionEn: z.string().max(1000), descriptionAr: z.string().max(1000), active: z.boolean() })).min(1).max(10),
  capacities: z.array(z.object({ key: z.string().regex(/^[0-9.]{1,5}$/), labelEn: z.string().max(40), labelAr: z.string().max(40), active: z.boolean(), prices: z.object({ standard: money, complete: money, premium: money }) })).min(1).max(30),
  packages: z.array(z.object({
    key: z.enum(PACKAGE_KEYS), nameEn: z.string().max(80), nameAr: z.string().max(80), subtitleEn: z.string().max(160), subtitleAr: z.string().max(160),
    included: biList, notIncluded: biList, copperMeters: z.number().min(0).max(100), active: z.boolean(),
  })).length(3),
  // Optional extras. A price of null (or rfq: true) means "Request for quotation": no price is ever invented for work that needs measuring.
  services: z.array(z.object({
    key: z.string().regex(/^[a-z0-9-]{2,40}$/), nameEn: z.string().max(160), nameAr: z.string().max(160), unit: z.enum(["meter", "unit", "lot"]),
    price: money.nullable(), rfq: z.boolean(), active: z.boolean(),
  })).max(40),
  exclusions: biList,
  disclaimer: bi,
  propertyTypes: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]{2,30}$/), en: z.string().max(60), ar: z.string().max(60) })).min(1).max(20),
  emirates: z.array(z.object({ key: z.string().max(40), en: z.string().max(60), ar: z.string().max(60) })).min(1).max(20),
  // Uploads on the customer form.
  uploads: z.object({ maxFiles: z.number().int().min(0).max(20), maxMb: z.number().min(1).max(25) }),
});
export type AcConfig = z.infer<typeof ConfigSchema>;
export type AcService = AcConfig["services"][number];

const l = (en: string[], ar: string[]): BiList => ({ en, ar });
const PLENUM_INCLUDED = l(
  ["Plenum modification to suit the unit's size and position.", "Adjustment of the connection opening.", "Connecting the unit to the duct openings that already exist.", "Basic sealing of the connection."],
  ["تعديل الـ Plenum حسب مقاس وموقع الوحدة.", "ضبط فتحة التوصيل.", "توصيل الوحدة بفتحات الدكت الموجودة بالفعل.", "إحكام التوصيل الأساسي."],
);
const PLENUM_EXCLUDED = l(
  ["Fabricating a completely new duct network.", "Changing duct routes or replacing large parts of the network."],
  ["تصنيع شبكة دكت جديدة بالكامل.", "تغيير مسارات الدكت أو استبدال أجزاء كبيرة من الشبكة."],
);

export const DEFAULT_CONFIG: AcConfig = {
  vatPercent: 5,
  validityDays: 14,
  plenum: {
    nameEn: "Existing Plenum Modification & Duct Connection", nameAr: "تعديل وتوصيل البلينم بفتحات الدكت الموجودة", price: 250,
    descriptionEn: "AED 250 is added automatically to every unit in every package. It is mandatory and included in the totals.",
    descriptionAr: "يتم إضافة 250 درهماً لكل وحدة بشكل تلقائي في جميع الباقات. هذا المبلغ إلزامي ومشمول في الإجمالي.",
    included: PLENUM_INCLUDED, notIncluded: PLENUM_EXCLUDED,
  },
  acTypes: [
    { key: "ducted-split", nameEn: "Ducted Split AC", nameAr: "مكيف دكت سبليت", descriptionEn: "Installation of concealed AC units connected to an air duct network that distributes the conditioned air to different rooms and spaces.", descriptionAr: "تركيب وحدات التكييف المخفية المتصلة بشبكة مجاري الهواء لتوزيع الهواء المكيف على الغرف والمساحات المختلفة.", active: true },
    { key: "concealed", nameEn: "Concealed AC", nameAr: "مكيف كونسيلد", descriptionEn: "Installation of AC units concealed inside false ceilings, connected to suitable air outlets.", descriptionAr: "تركيب وحدات التكييف المخفية داخل الأسقف المستعارة مع توصيلها بمخارج الهواء المناسبة.", active: true },
    { key: "semi-central", nameEn: "Semi-Central AC", nameAr: "تكييف شبه مركزي", descriptionEn: "Installation of AC systems that serve large spaces or several zones through concealed units and air distribution networks.", descriptionAr: "تركيب أنظمة التكييف التي تخدم المساحات الكبيرة أو عدة مناطق من خلال الوحدات المخفية وشبكات توزيع الهواء.", active: true },
  ],
  capacities: [
    { key: "3", labelEn: "3 Ton", labelAr: "3 طن", active: true, prices: { standard: 400, complete: 950, premium: 1250 } },
    { key: "4", labelEn: "4 Ton", labelAr: "4 طن", active: true, prices: { standard: 500, complete: 1200, premium: 1500 } },
    { key: "5", labelEn: "5 Ton", labelAr: "5 طن", active: true, prices: { standard: 600, complete: 1450, premium: 1800 } },
    { key: "6", labelEn: "6 Ton", labelAr: "6 طن", active: true, prices: { standard: 700, complete: 1700, premium: 2100 } },
    { key: "7.5", labelEn: "7.5 Ton", labelAr: "7.5 طن", active: true, prices: { standard: 850, complete: 2000, premium: 2500 } },
    { key: "10", labelEn: "10 Ton", labelAr: "10 طن", active: true, prices: { standard: 1100, complete: 2600, premium: 3200 } },
  ],
  packages: [
    {
      key: "standard", nameEn: "Standard", nameAr: "ستاندرد", subtitleEn: "Installation Only", subtitleAr: "تركيب فقط", copperMeters: 0, active: true,
      included: l(
        ["Installation and fixing of the indoor and outdoor unit.", "Use of the copper pipes and connections already on site.", "Connection of the drainage and electrical supply already on site.", "Plenum modification and connection.", "Connecting the unit to the existing duct openings.", "Basic operational test."],
        ["تركيب وتثبيت الوحدة الداخلية والخارجية.", "استخدام مواسير النحاس والتوصيلات الموجودة بالموقع.", "توصيل الصرف والكهرباء المتوفرين بالموقع.", "تعديل الـ Plenum Connection.", "توصيل الوحدة بفتحات الدكت الموجودة.", "اختبار التشغيل الأساسي."],
      ),
      notIncluded: l(["New materials or new copper pipes are not included."], ["لا تشمل الباقة خامات جديدة أو مواسير نحاس جديدة."]),
    },
    {
      key: "complete", nameEn: "Complete", nameAr: "كومبليت", subtitleEn: "Installation with Materials (Up to 3m)", subtitleAr: "تركيب مع الخامات (حتى 3 متر)", copperMeters: 3, active: true,
      included: l(
        ["All Standard services.", "Copper pipes up to 3 metres.", "Copper pipe insulation.", "Interconnecting cable between the indoor and outdoor unit.", "Drain hose and basic connection accessories.", "Plenum modification and connection.", "Leak and vacuum test when the refrigerant circuit is opened or new pipes are installed."],
        ["جميع خدمات Standard.", "مواسير نحاس حتى 3 أمتار.", "عزل مواسير النحاس.", "كابل التوصيل بين الوحدة الداخلية والخارجية.", "خرطوم الصرف وملحقات التوصيل الأساسية.", "تعديل وتوصيل الـ Plenum Connection.", "اختبار التسريب والفاكيوم عند فتح دائرة التبريد أو تركيب مواسير جديدة."],
      ),
      notIncluded: l([], []),
    },
    {
      key: "premium", nameEn: "Premium", nameAr: "بريميوم", subtitleEn: "Installation with Extended Materials (Up to 5m)", subtitleAr: "تركيب مع خامات ممتدة (حتى 5 متر)", copperMeters: 5, active: true,
      included: l(
        ["All Complete services.", "Copper pipes up to 5 metres.", "Copper pipe insulation.", "Basic connection accessories.", "Nitrogen pressure test.", "Vacuum.", "Leak test.", "Final inspection and operational test.", "Plenum modification and connection."],
        ["جميع خدمات Complete.", "مواسير نحاس حتى 5 أمتار.", "عزل مواسير النحاس.", "ملحقات التوصيل الأساسية.", "اختبار ضغط النيتروجين.", "إجراء الفاكيوم.", "اختبار التسريب.", "الفحص النهائي واختبار التشغيل.", "تعديل وتوصيل الـ Plenum Connection."],
      ),
      notIncluded: l([], []),
    },
  ],
  services: [
    { key: "additional-copper", nameEn: "Additional Copper Piping", nameAr: "مواسير نحاس إضافية", unit: "meter", price: null, rfq: false, active: true },
    { key: "additional-drain", nameEn: "Additional Drainage Piping", nameAr: "مواسير صرف إضافية", unit: "meter", price: null, rfq: false, active: true },
    { key: "new-duct", nameEn: "New Duct Fabrication & Installation", nameAr: "تصنيع وتركيب دكت جديد", unit: "lot", price: null, rfq: true, active: true },
    { key: "supply-diffusers", nameEn: "Supply Air Diffusers", nameAr: "مخارج هواء", unit: "unit", price: null, rfq: false, active: true },
    { key: "return-grilles", nameEn: "Return Air Grilles", nameAr: "فتحات هواء راجع", unit: "unit", price: null, rfq: false, active: true },
    { key: "linear-slot", nameEn: "Linear Slot Diffusers", nameAr: "مخارج هواء خطية", unit: "meter", price: null, rfq: false, active: true },
    { key: "flexible-duct", nameEn: "Flexible Duct Installation", nameAr: "تركيب دكت مرن", unit: "meter", price: null, rfq: false, active: true },
    { key: "duct-insulation", nameEn: "Duct Insulation", nameAr: "عزل الدكت", unit: "meter", price: null, rfq: false, active: true },
    { key: "extra-wiring", nameEn: "Additional Electrical Wiring", nameAr: "توصيلات كهربائية إضافية", unit: "meter", price: null, rfq: false, active: true },
    { key: "old-duct-removal", nameEn: "Old Duct Removal", nameAr: "إزالة الدكت القديم", unit: "lot", price: null, rfq: true, active: true },
    { key: "crane", nameEn: "Crane / Lifting Equipment", nameAr: "معدات الرفع", unit: "lot", price: null, rfq: true, active: true },
    { key: "special-supports", nameEn: "Special Supports", nameAr: "قواعد وحوامل خاصة", unit: "unit", price: null, rfq: false, active: true },
    { key: "other", nameEn: "Other Services", nameAr: "خدمات أخرى", unit: "lot", price: null, rfq: true, active: true },
  ],
  exclusions: l(
    ["Supply of the air conditioning unit.", "Fabrication and installation of a completely new duct network.", "Changing duct routes or replacing large parts of the duct.", "New air outlets and grilles.", "Circuit breakers and main supply cables.", "Breaking, gypsum, restoration and painting works.", "Cranes, scaffolding and special lifting equipment.", "Refrigerant gas charging, except after inspection and approval.", "Repair of faults that already exist."],
    ["توريد جهاز التكييف.", "تصنيع وتركيب شبكة دكت جديدة بالكامل.", "تغيير مسارات الدكت أو استبدال أجزاء كبيرة منه.", "مخارج الهواء والـ Grilles الجديدة.", "القواطع وكابلات التغذية الرئيسية.", "أعمال التكسير والجبس والترميم والدهانات.", "الرافعات والسقالات ومعدات الرفع الخاصة.", "شحن غاز التبريد إلا بعد الفحص والموافقة.", "إصلاح الأعطال الموجودة مسبقاً."],
  ),
  disclaimer: {
    en: "All quotations are estimates based on the selected installation package and project information. Final pricing is subject to site inspection, technical assessment and confirmation of the installation scope.",
    ar: "جميع عروض الأسعار تقديرية بناءً على الباقة والبيانات المختارة. يخضع السعر النهائي لمعاينة الموقع والتقييم الفني وتأكيد نطاق أعمال التركيب.",
  },
  propertyTypes: [
    { key: "residential", en: "Residential", ar: "سكني" }, { key: "commercial", en: "Commercial", ar: "تجاري" }, { key: "office", en: "Office", ar: "مكتب" },
    { key: "retail", en: "Retail", ar: "محل تجاري" }, { key: "villa", en: "Villa", ar: "فيلا" }, { key: "other", en: "Other", ar: "أخرى" },
  ],
  emirates: [
    { key: "Ajman", en: "Ajman", ar: "عجمان" }, { key: "Sharjah", en: "Sharjah", ar: "الشارقة" }, { key: "Umm Al Quwain", en: "Umm Al Quwain", ar: "أم القيوين" },
    { key: "Dubai", en: "Dubai", ar: "دبي" }, { key: "Abu Dhabi", en: "Abu Dhabi", ar: "أبوظبي" }, { key: "Al Ain", en: "Al Ain", ar: "العين" }, { key: "Other", en: "Other", ar: "أخرى" },
  ],
  uploads: { maxFiles: 8, maxMb: 8 },
};

// What is stored is checked on the way in and out; anything unreadable falls back to the launch values so the page never breaks.
export function parseConfig(raw: unknown): AcConfig {
  const r = ConfigSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_CONFIG;
}

// What the website may see: only what is switched on. (Prices are public by design: they are shown on the page.)
export function publicConfig(c: AcConfig) {
  return {
    ...c,
    acTypes: c.acTypes.filter((t) => t.active),
    capacities: c.capacities.filter((x) => x.active),
    packages: c.packages.filter((p) => p.active),
    services: c.services.filter((s) => s.active),
  };
}
export type PublicAcConfig = ReturnType<typeof publicConfig>;
