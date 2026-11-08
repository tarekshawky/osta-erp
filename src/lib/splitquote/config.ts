import { z } from "zod";

// The Split AC installation quotation calculator: every package, price, material list, extra, condition and text lives in ONE configuration
// document edited in the dashboard. The only prices written here are the figures supplied for the launch (the package prices per capacity);
// the optional extras have NO price until the administrator sets one (until then the customer sees "request for quotation").

export type Bi = { en: string; ar: string };
export type BiList = { en: string[]; ar: string[] };

const bi = z.object({ en: z.string().max(2000), ar: z.string().max(2000) });
const biList = z.object({ en: z.array(z.string().max(400)).max(40), ar: z.array(z.string().max(400)).max(40) });
const money = z.number().min(0).max(1_000_000);

export const EXTRA_UNITS = ["meter", "unit", "lot"] as const;
export type ExtraUnit = (typeof EXTRA_UNITS)[number];
export const EXTRA_UNIT_LABEL: Record<ExtraUnit, Bi & { priceEn: string; priceAr: string }> = {
  meter: { en: "metres", ar: "متر", priceEn: "per metre", priceAr: "بالمتر" },
  unit: { en: "units", ar: "وحدة", priceEn: "per unit", priceAr: "للوحدة" },
  lot: { en: "quantity", ar: "الكمية", priceEn: "per job", priceAr: "للعمل" },
};

export const ConfigSchema = z.object({
  vatPercent: z.number().min(0).max(100),
  validityDays: z.number().int().min(1).max(365),
  capacities: z.array(z.object({ key: z.string().regex(/^[0-9.]{1,5}$/), labelEn: z.string().max(40), labelAr: z.string().max(40), active: z.boolean() })).min(1).max(30),
  packages: z.array(z.object({
    key: z.string().regex(/^[a-z0-9-]{2,30}$/), nameEn: z.string().max(120), nameAr: z.string().max(120), subtitleEn: z.string().max(200), subtitleAr: z.string().max(200),
    descriptionEn: z.string().max(1000), descriptionAr: z.string().max(1000),
    // How much copper pipe is included, as the total route between the indoor and the outdoor unit (0 = none).
    copperMeters: z.number().min(0).max(100),
    // A lucide icon name and / or a picture (a URL from the media library) for the package card.
    icon: z.string().max(40), imageUrl: z.string().max(500), imageAltEn: z.string().max(200), imageAltAr: z.string().max(200), highlighted: z.boolean(),
    materials: biList, services: biList, notIncluded: biList,
    // The price per AC unit, by capacity key.
    prices: z.record(z.string(), money), active: z.boolean(),
  })).min(1).max(12),
  // Optional extras. A price of null (or rfq: true) means "Request for quotation": no price is ever invented.
  extras: z.array(z.object({
    key: z.string().regex(/^[a-z0-9-]{2,40}$/), nameEn: z.string().max(160), nameAr: z.string().max(160), descriptionEn: z.string().max(500), descriptionAr: z.string().max(500),
    unit: z.enum(EXTRA_UNITS), price: money.nullable(), rfq: z.boolean(), active: z.boolean(),
  })).max(40),
  discount: z.object({ enabled: z.boolean(), type: z.enum(["percent", "fixed"]), value: money, labelEn: z.string().max(80), labelAr: z.string().max(80) }),
  conditions: biList, technicalNote: bi, disclaimer: bi, footer: bi,
  propertyTypes: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]{2,30}$/), en: z.string().max(60), ar: z.string().max(60) })).min(1).max(20),
  emirates: z.array(z.object({ key: z.string().max(40), en: z.string().max(60), ar: z.string().max(60) })).min(1).max(20),
});
export type SplitConfig = z.infer<typeof ConfigSchema>;
export type SplitPackage = SplitConfig["packages"][number];
export type SplitExtra = SplitConfig["extras"][number];

const l = (en: string[], ar: string[]): BiList => ({ en, ar });
const CAPS: [string, string, string][] = [["1", "1 Ton", "1 طن"], ["1.5", "1.5 Ton", "1.5 طن"], ["2", "2 Ton", "2 طن"], ["2.5", "2.5 Ton", "2.5 طن"], ["3", "3 Ton", "3 طن"], ["4", "4 Ton", "4 طن"], ["5", "5 Ton", "5 طن"]];
const prices = (v: number[]) => Object.fromEntries(CAPS.map(([k], i) => [k, v[i]]));
const extra = (key: string, nameEn: string, nameAr: string, unit: ExtraUnit) => ({ key, nameEn, nameAr, descriptionEn: "", descriptionAr: "", unit, price: null as number | null, rfq: false, active: true });

// The exclusions the Complete and Premium packages share, in the order of the brief: before and after the refrigerant gas line.
const NOT_A = {
  en: ["New outdoor metal brackets.", "Concrete or special metal bases.", "Main electrical supply cables and circuit breakers.", "Long or complex drainage extensions.", "Wall cutting, drilling, and restoration."],
  ar: ["حوامل معدنية جديدة للوحدة الخارجية.", "قواعد خرسانية أو معدنية خاصة.", "كابلات التغذية الكهربائية الرئيسية والقواطع.", "تمديدات الصرف الطويلة أو المعقدة.", "أعمال الكسر والتخريم وإعادة التشطيب."],
};
const NOT_B = {
  en: ["Existing system repairs or leak repairs.", "Special access equipment, scaffolding, or lifting equipment."],
  ar: ["إصلاح الأنظمة الموجودة أو إصلاح التسريب.", "معدات الوصول الخاصة أو السقالات أو معدات الرفع."],
};
const MATERIALS = (m: number) => l(
  [`Copper pipes up to ${m} metres.`, "Thermal insulation for copper pipes.", "Interconnection cable.", "Drain hose.", "PVC wrapping tape.", "Insulation and finishing tape.", "Copper fittings and flare connections.", "Standard installation fasteners."],
  [`مواسير نحاس حتى ${m} أمتار.`, "عزل حراري لمواسير النحاس.", "كابل التوصيل بين الوحدتين.", "خرطوم الصرف.", "شريط PVC للف المواسير.", "شريط العزل والتشطيب.", "وصلات النحاس وتوصيلات الفلير.", "مثبتات التركيب القياسية."],
);

export const DEFAULT_CONFIG: SplitConfig = {
  vatPercent: 5,
  validityDays: 14,
  capacities: CAPS.map(([key, labelEn, labelAr]) => ({ key, labelEn, labelAr, active: true })),
  packages: [
    {
      key: "standard", nameEn: "Standard Installation – Labour Only", nameAr: "التركيب الأساسي – دون خامات", subtitleEn: "Labour only, using the materials already on site", subtitleAr: "عمالة فقط باستخدام الخامات الموجودة بالموقع",
      descriptionEn: "Installation of the indoor and outdoor units, connected to the copper pipes, cables and drain hose that are already in place.", descriptionAr: "تركيب الوحدة الداخلية والخارجية وتوصيلهما بمواسير النحاس والكابلات وخرطوم الصرف الموجودة بالفعل.",
      copperMeters: 0, icon: "Wrench", imageUrl: "", imageAltEn: "", imageAltAr: "", highlighted: false, prices: prices([150, 175, 200, 225, 250, 300, 350]), active: true,
      materials: l([], []),
      services: l(
        ["Indoor unit installation.", "Outdoor unit installation.", "Connecting existing copper pipes.", "Connecting existing electrical and communication cables.", "Connecting existing drain hose.", "Connecting the indoor and outdoor units.", "Operational and cooling test."],
        ["تركيب الوحدة الداخلية.", "تركيب الوحدة الخارجية.", "توصيل مواسير النحاس الموجودة.", "توصيل الكابلات الكهربائية وكابلات الاتصال الموجودة.", "توصيل خرطوم الصرف الموجود.", "توصيل الوحدة الداخلية بالخارجية.", "اختبار التشغيل والتبريد."],
      ),
      notIncluded: l(
        ["New copper pipes.", "New copper pipe insulation.", "New electrical or communication cables.", "New drain hoses.", "New outdoor unit brackets.", "Rubber anti-vibration pads.", "New PVC drainage pipes.", "Wall drilling, cutting, or civil works.", "Refrigerant gas charging.", "Additional repairs or materials."],
        ["مواسير نحاس جديدة.", "عزل جديد لمواسير النحاس.", "كابلات كهربائية أو كابلات اتصال جديدة.", "خراطيم صرف جديدة.", "حوامل جديدة للوحدة الخارجية.", "قواعد مطاطية مانعة للاهتزاز.", "مواسير صرف PVC جديدة.", "تخريم أو كسر الجدران أو أعمال مدنية.", "شحن غاز التبريد.", "أي إصلاحات أو خامات إضافية."],
      ),
    },
    {
      key: "complete", nameEn: "Complete Installation – Materials up to 3m", nameAr: "التركيب الشامل – بخامات حتى 3 متر", subtitleEn: "Materials and copper piping up to 3 metres", subtitleAr: "خامات ومواسير نحاس حتى 3 أمتار",
      descriptionEn: "Installation with new installation materials and copper piping up to 3 metres, including leak testing and vacuuming.", descriptionAr: "تركيب بخامات جديدة ومواسير نحاس حتى 3 أمتار، مع اختبار التسريب وعمل الفاكيوم.",
      copperMeters: 3, icon: "Package", imageUrl: "", imageAltEn: "", imageAltAr: "", highlighted: false, prices: prices([450, 500, 550, 650, 750, 900, 1100]), active: true,
      materials: MATERIALS(3),
      services: l(
        ["Indoor and outdoor unit installation.", "Copper pipe connections.", "Electrical and drainage connections.", "Leak testing.", "Vacuuming the refrigerant circuit before operation.", "Operational and cooling test."],
        ["تركيب الوحدة الداخلية والخارجية.", "توصيلات مواسير النحاس.", "التوصيلات الكهربائية وتوصيلات الصرف.", "اختبار التسريب.", "عمل فاكيوم لدائرة التبريد قبل التشغيل.", "اختبار التشغيل والتبريد."],
      ),
      notIncluded: l(
        ["Copper pipes exceeding 3 metres.", "Additional piping or cable extensions beyond the package allowance.", ...NOT_A.en, "Refrigerant gas charging.", ...NOT_B.en, "Any materials or work not specifically listed as included."],
        ["مواسير نحاس تزيد عن 3 أمتار.", "تمديدات مواسير أو كابلات إضافية تتجاوز حد الباقة.", ...NOT_A.ar, "شحن غاز التبريد.", ...NOT_B.ar, "أي خامات أو أعمال غير مذكورة صراحةً ضمن المشمول."],
      ),
    },
    {
      key: "premium", nameEn: "Premium Installation – Materials up to 5m", nameAr: "التركيب المميز – بخامات حتى 5 متر", subtitleEn: "Materials and copper piping up to 5 metres, with nitrogen pressure test", subtitleAr: "خامات ومواسير نحاس حتى 5 أمتار مع اختبار ضغط النيتروجين",
      descriptionEn: "Installation with materials and copper piping up to 5 metres, nitrogen pressure testing, leak testing and vacuuming with a vacuum pump.", descriptionAr: "تركيب بخامات ومواسير نحاس حتى 5 أمتار مع اختبار ضغط النيتروجين واختبار التسريب والفاكيوم بمضخة تفريغ.",
      copperMeters: 5, icon: "BadgeCheck", imageUrl: "", imageAltEn: "", imageAltAr: "", highlighted: true, prices: prices([600, 650, 700, 800, 950, 1150, 1400]), active: true,
      materials: MATERIALS(5),
      services: l(
        ["Indoor and outdoor unit installation.", "Copper pipe installation and connections.", "Electrical and drainage connections.", "Nitrogen pressure testing.", "Leak testing.", "Vacuuming using a vacuum pump.", "Operational and cooling test."],
        ["تركيب الوحدة الداخلية والخارجية.", "تركيب وتوصيل مواسير النحاس.", "التوصيلات الكهربائية وتوصيلات الصرف.", "اختبار ضغط النيتروجين.", "اختبار التسريب.", "عمل الفاكيوم باستخدام مضخة تفريغ.", "اختبار التشغيل والتبريد."],
      ),
      notIncluded: l(
        ["Copper pipes exceeding 5 metres.", ...NOT_A.en, "Refrigerant gas charging unless separately quoted.", ...NOT_B.en, "Any materials or services not specifically listed as included."],
        ["مواسير نحاس تزيد عن 5 أمتار.", ...NOT_A.ar, "شحن غاز التبريد ما لم يُسعَّر بشكل منفصل.", ...NOT_B.ar, "أي خامات أو خدمات غير مذكورة صراحةً ضمن المشمول."],
      ),
    },
  ],
  extras: [
    extra("additional-copper", "Additional copper piping (per metre)", "مواسير نحاس إضافية (بالمتر)", "meter"),
    extra("outdoor-brackets", "Outdoor unit wall brackets", "حوامل حائط للوحدة الخارجية", "unit"),
    extra("anti-vibration-pads", "Rubber anti-vibration pads", "قواعد مطاطية مانعة للاهتزاز", "unit"),
    extra("additional-drainage", "Additional drainage piping", "مواسير صرف إضافية", "meter"),
    extra("electrical-extension", "Main electrical cable extension", "تمديد كابل كهربائي رئيسي", "meter"),
    extra("drilling-access", "Wall drilling or special access work", "تخريم الجدران أو أعمال وصول خاصة", "lot"),
    extra("gas-charging", "Refrigerant gas charging", "شحن غاز التبريد", "unit"),
    extra("other", "Other custom services", "خدمات أخرى مخصصة", "lot"),
  ],
  discount: { enabled: false, type: "percent", value: 0, labelEn: "Discount", labelAr: "خصم" },
  conditions: l(
    [
      "All prices are per AC unit and depend on the selected AC capacity.",
      "Copper pipe allowance means the total piping route between the indoor and outdoor units, not the allowance for each individual pipe.",
      "Copper pipe size, cable specifications, and installation materials must comply with the AC manufacturer's requirements.",
      "Additional copper piping beyond the selected package allowance will be quoted separately.",
      "The quoted prices assume the installation location is accessible and ready for installation.",
      "Civil works, major electrical works, and special mounting requirements are excluded unless specifically quoted.",
      "Refrigerant gas charging is not automatically included.",
      "Any additional work or materials must be approved by the customer before execution.",
    ],
    [
      "جميع الأسعار لكل وحدة تكييف وتعتمد على سعة المكيف المختارة.",
      "حد مواسير النحاس يعني إجمالي مسار المواسير بين الوحدة الداخلية والخارجية، وليس الحد لكل ماسورة على حدة.",
      "يجب أن تتوافق مقاسات مواسير النحاس ومواصفات الكابلات وخامات التركيب مع متطلبات الشركة المصنعة للمكيف.",
      "يتم تسعير مواسير النحاس الإضافية التي تتجاوز حد الباقة المختارة بشكل منفصل.",
      "الأسعار المعروضة تفترض أن موقع التركيب متاح وجاهز للتركيب.",
      "الأعمال المدنية والأعمال الكهربائية الكبيرة ومتطلبات التثبيت الخاصة مستبعدة ما لم يتم تسعيرها بشكل محدد.",
      "شحن غاز التبريد غير مشمول تلقائياً.",
      "يجب موافقة العميل على أي أعمال أو خامات إضافية قبل التنفيذ.",
    ],
  ),
  technicalNote: {
    en: "Important technical note: Leak testing and vacuuming should be performed whenever the refrigerant circuit is opened or new piping is installed, regardless of package selection.",
    ar: "ملاحظة فنية مهمة: يجب إجراء اختبار التسريب والفاكيوم كلما تم فتح دائرة التبريد أو تركيب مواسير جديدة، بغض النظر عن الباقة المختارة.",
  },
  disclaimer: {
    en: "All quotations are estimates based on the selected package and the information provided. Final pricing is subject to site inspection and confirmation of the installation scope.",
    ar: "جميع عروض الأسعار تقديرية بناءً على الباقة المختارة والبيانات المقدمة. يخضع السعر النهائي لمعاينة الموقع وتأكيد نطاق أعمال التركيب.",
  },
  footer: { en: "Thank you for choosing Osta Services. Professional AC Installation & Home Maintenance Services in UAE.", ar: "شكراً لاختياركم خدمات اسطا. خدمات احترافية لتركيب المكيفات وصيانة المنازل في الإمارات." },
  propertyTypes: [{ key: "apartment", en: "Apartment", ar: "شقة" }, { key: "villa", en: "Villa", ar: "فيلا" }, { key: "office", en: "Office", ar: "مكتب" }, { key: "commercial", en: "Commercial", ar: "تجاري" }],
  emirates: [
    { key: "Ajman", en: "Ajman", ar: "عجمان" }, { key: "Sharjah", en: "Sharjah", ar: "الشارقة" }, { key: "Umm Al Quwain", en: "Umm Al Quwain", ar: "أم القيوين" },
    { key: "Dubai", en: "Dubai", ar: "دبي" }, { key: "Abu Dhabi", en: "Abu Dhabi", ar: "أبوظبي" }, { key: "Al Ain", en: "Al Ain", ar: "العين" }, { key: "Other", en: "Other", ar: "أخرى" },
  ],
};

export function parseConfig(raw: unknown): SplitConfig {
  const r = ConfigSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_CONFIG;
}

// What the website may see: only what is switched on.
export function publicConfig(c: SplitConfig) {
  return { ...c, capacities: c.capacities.filter((x) => x.active), packages: c.packages.filter((p) => p.active), extras: c.extras.filter((s) => s.active) };
}
export type PublicSplitConfig = ReturnType<typeof publicConfig>;
