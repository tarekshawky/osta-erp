import { STANDARD_PACKAGES, STANDARD_SERVICES, STANDARD_SETTINGS, type PkgSettings } from "./packages";

// The ready-made package sets an admin can load (Website → Maintenance Packages → "Load a ready-made set"), then edit freely.
// "home" is the original annual home packages (no group). The others are groups with their own services, texts and call to action.

export type SeedBullet = { en: string; ar: string };
export type SeedLine = { service: string; en: string; ar: string; shortEn?: string; shortAr?: string };
export type SeedPackage = {
  nameEn: string; nameAr: string; price: number | null; pricePrefixEn?: string; pricePrefixAr?: string; priceTextEn?: string; priceTextAr?: string; maxAcUnits: number | null;
  suitableEn: string; suitableAr: string; badgeEn: string; badgeAr: string; highlighted: boolean; bullets: SeedBullet[]; lines: SeedLine[];
};
export type SeedSet = {
  key: string; label: string;
  group: null | { key: string; nameEn: string; nameAr: string; ctaMode: "subscribe" | "quote" };
  services: { key: string; nameEn: string; nameAr: string; showInComparison: boolean }[];
  packages: SeedPackage[];
  settings: PkgSettings;
};

const b = (en: string, ar: string): SeedBullet => ({ en, ar });
const yes = (service: string): SeedLine => ({ service, en: "Included", ar: "مشمول", shortEn: "✓", shortAr: "✓" });
const val = (service: string, en: string, ar: string, shortEn = en, shortAr = ar): SeedLine => ({ service, en, ar, shortEn, shortAr });
const CUSTOM = { priceTextEn: "Custom Quotation", priceTextAr: "عرض سعر مخصص" };
const NO_SETTINGS = { noteEn: "", noteAr: "", termsEn: "", termsAr: "" };

const COMMERCIAL: SeedSet = {
  key: "commercial", label: "Commercial maintenance (4 packages, quotation)",
  group: { key: "commercial-maintenance", nameEn: "Commercial Maintenance", nameAr: "الصيانة التجارية", ctaMode: "quote" },
  services: [
    { key: "ac", nameEn: "AC Inspection", nameAr: "فحص المكيفات", showInComparison: true },
    { key: "plumbing", nameEn: "Plumbing Inspection", nameAr: "فحص السباكة", showInComparison: true },
    { key: "electrical", nameEn: "Electrical Inspection", nameAr: "فحص الكهرباء", showInComparison: true },
    { key: "visits", nameEn: "Preventive Visits", nameAr: "الزيارات الوقائية", showInComparison: true },
    { key: "callouts", nameEn: "Maintenance Callouts", nameAr: "بلاغات الصيانة", showInComparison: true },
    { key: "handyman", nameEn: "Handyman Support", nameAr: "دعم الهاندي مان", showInComparison: true },
    { key: "reports", nameEn: "Maintenance Reports", nameAr: "تقارير الصيانة", showInComparison: true },
    { key: "priority", nameEn: "Priority Service", nameAr: "أولوية الخدمة", showInComparison: true },
    { key: "coordinator", nameEn: "Dedicated Coordinator", nameAr: "مسؤول متابعة مخصص", showInComparison: true },
    { key: "emergency", nameEn: "Emergency Response", nameAr: "الاستجابة للطوارئ", showInComparison: true },
  ],
  packages: [
    {
      nameEn: "Business Essential", nameAr: "باقة الأعمال الأساسية", price: 499, maxAcUnits: null, badgeEn: "", badgeAr: "", highlighted: false,
      suitableEn: "Small shops and offices.", suitableAr: "المحلات الصغيرة والمكاتب.",
      bullets: [b("AC inspection and servicing", "فحص وصيانة المكيفات"), b("Basic plumbing inspection", "فحص السباكة الأساسي"), b("Electrical inspection", "فحص الكهرباء"), b("Minor maintenance requests", "طلبات الصيانة البسيطة"), b("2 scheduled preventive visits annually", "زيارتان وقائيتان سنوياً"), b("Maintenance service report", "تقرير الصيانة")],
      lines: [yes("ac"), yes("plumbing"), yes("electrical"), val("visits", "2 per year", "2 سنوياً", "2", "2"), yes("reports"), val("emergency", "Standard", "عادية")],
    },
    {
      nameEn: "Business Standard", nameAr: "باقة الأعمال القياسية", price: 999, maxAcUnits: null, badgeEn: "", badgeAr: "", highlighted: false,
      suitableEn: "Offices, salons and retail shops.", suitableAr: "المكاتب وصالونات التجميل ومحلات التجزئة.",
      bullets: [b("Includes all Essential services, plus:", "تشمل جميع خدمات الباقة الأساسية، بالإضافة إلى:"), b("2 preventive maintenance visits annually", "زيارتان وقائيتان سنوياً"), b("AC preventive maintenance", "صيانة وقائية للمكيفات"), b("Plumbing and electrical checks", "فحص السباكة والكهرباء"), b("4 maintenance callouts annually", "4 بلاغات صيانة سنوياً"), b("Priority maintenance requests", "أولوية في استقبال طلبات الصيانة"), b("Annual maintenance report", "تقرير سنوي للصيانة")],
      lines: [yes("ac"), yes("plumbing"), yes("electrical"), val("visits", "2 per year", "2 سنوياً", "2", "2"), val("callouts", "4 annually", "4 سنوياً", "4", "4"), yes("reports"), yes("priority"), val("emergency", "Standard", "عادية")],
    },
    {
      nameEn: "Business Plus", nameAr: "باقة الأعمال المتقدمة", price: 1999, maxAcUnits: null, badgeEn: "", badgeAr: "", highlighted: false,
      suitableEn: "Restaurants, clinics and medium-sized businesses.", suitableAr: "المطاعم والعيادات والأعمال المتوسطة.",
      bullets: [b("Includes all Standard services, plus:", "تشمل جميع خدمات الباقة القياسية، بالإضافة إلى:"), b("Quarterly preventive inspections", "فحص وقائي كل 3 أشهر"), b("AC maintenance", "صيانة المكيفات"), b("Plumbing and electrical maintenance inspections", "فحص صيانة السباكة والكهرباء"), b("Handyman support", "خدمات الهاندي مان"), b("6 maintenance callouts annually", "6 بلاغات صيانة سنوياً"), b("Maintenance reports", "تقارير الصيانة"), b("Priority service scheduling", "أولوية جدولة الخدمات")],
      lines: [yes("ac"), yes("plumbing"), yes("electrical"), val("visits", "Quarterly", "كل 3 أشهر", "Quarterly", "ربع سنوي"), val("callouts", "6 annually", "6 سنوياً", "6", "6"), yes("handyman"), yes("reports"), yes("priority"), val("emergency", "Priority", "أولوية")],
    },
    {
      nameEn: "Business Premium", nameAr: "باقة الأعمال المميزة", price: null, ...CUSTOM, maxAcUnits: null, badgeEn: "", badgeAr: "", highlighted: false,
      suitableEn: "Large commercial facilities.", suitableAr: "المنشآت التجارية الكبيرة.",
      bullets: [b("Comprehensive facility maintenance", "صيانة شاملة للمرافق"), b("Scheduled preventive maintenance", "صيانة وقائية مجدولة"), b("AC, plumbing and electrical maintenance", "صيانة التكييف والسباكة والكهرباء"), b("Handyman and general maintenance", "الهاندي مان والصيانة العامة"), b("Priority emergency response", "أولوية الاستجابة للطوارئ"), b("Dedicated account coordination", "مسؤول متابعة مخصص"), b("Detailed maintenance reports", "تقارير صيانة تفصيلية"), b("Customized service schedule", "جدول صيانة مخصص")],
      lines: [yes("ac"), yes("plumbing"), yes("electrical"), val("visits", "Custom", "مخصص"), val("callouts", "Custom", "مخصص"), yes("handyman"), yes("reports"), yes("priority"), yes("coordinator"), val("emergency", "Priority", "أولوية")],
    },
  ],
  settings: {
    headingEn: "Commercial Maintenance Packages", headingAr: "باقات الصيانة التجارية",
    subtitleEn: "Reliable and professional maintenance solutions for offices, shops, restaurants, clinics and commercial facilities. Choose the right maintenance plan to keep your business operating efficiently.",
    subtitleAr: "حلول صيانة احترافية وموثوقة للمكاتب والمحلات والمطاعم والعيادات والمنشآت التجارية. اختر باقة الصيانة المناسبة للحفاظ على كفاءة أعمالك واستمرارية التشغيل.",
    ...NO_SETTINGS,
  },
};

const HVAC: SeedSet = {
  key: "hvac", label: "HVAC AMC (4 packages, quotation)",
  group: { key: "hvac-amc", nameEn: "HVAC AMC", nameAr: "عقد صيانة سنوي للتكييف والتهوية", ctaMode: "quote" },
  services: [
    { key: "visits", nameEn: "Scheduled Maintenance Visits", nameAr: "زيارات الصيانة المجدولة", showInComparison: true },
    { key: "report", nameEn: "Condition / Maintenance Report", nameAr: "تقرير الحالة / الصيانة", showInComparison: true },
    { key: "priority", nameEn: "Priority Service", nameAr: "أولوية الخدمة", showInComparison: true },
    { key: "coordinator", nameEn: "Dedicated Coordinator", nameAr: "مسؤول متابعة مخصص", showInComparison: true },
    { key: "register", nameEn: "AC Asset Register", nameAr: "سجل أصول التكييف", showInComparison: true },
  ],
  packages: [
    {
      nameEn: "HVAC Basic", nameAr: "باقة التكييف الأساسية", price: 399, pricePrefixEn: "Starting from", pricePrefixAr: "ابتداءً من", maxAcUnits: 3, badgeEn: "", badgeAr: "", highlighted: false,
      suitableEn: "Up to 3 AC units.", suitableAr: "حتى 3 مكيفات.",
      bullets: [b("2 scheduled maintenance visits annually", "زيارتان صيانة مجدولتان سنوياً"), b("Filter cleaning", "تنظيف الفلاتر"), b("Coil inspection", "فحص الملفات"), b("Drain line inspection", "فحص خط التصريف"), b("Basic performance inspection", "فحص الأداء الأساسي"), b("General condition report", "تقرير الحالة العامة")],
      lines: [val("visits", "2 annually", "2 سنوياً", "2", "2"), yes("report")],
    },
    {
      nameEn: "HVAC Standard", nameAr: "باقة التكييف القياسية", price: 699, pricePrefixEn: "Starting from", pricePrefixAr: "ابتداءً من", maxAcUnits: 5, badgeEn: "", badgeAr: "", highlighted: false,
      suitableEn: "Up to 5 AC units.", suitableAr: "حتى 5 مكيفات.",
      bullets: [b("3 scheduled maintenance visits annually", "3 زيارات صيانة مجدولة سنوياً"), b("Filter and coil cleaning", "تنظيف الفلاتر والملفات"), b("Drain line cleaning", "تنظيف خط التصريف"), b("Thermostat inspection", "فحص الثرموستات"), b("Electrical connection inspection", "فحص التوصيلات الكهربائية"), b("Cooling performance checks", "فحص أداء التبريد"), b("AC maintenance report", "تقرير صيانة المكيفات")],
      lines: [val("visits", "3 annually", "3 سنوياً", "3", "3"), yes("report")],
    },
    {
      nameEn: "HVAC Advanced", nameAr: "باقة التكييف المتقدمة", price: 1499, pricePrefixEn: "Starting from", pricePrefixAr: "ابتداءً من", maxAcUnits: 10, badgeEn: "", badgeAr: "", highlighted: false,
      suitableEn: "Up to 10 AC units.", suitableAr: "حتى 10 مكيفات.",
      bullets: [b("4 scheduled maintenance visits annually", "4 زيارات صيانة مجدولة سنوياً"), b("Comprehensive preventive inspection", "فحص وقائي شامل"), b("Drainage and condensate inspection", "فحص التصريف والتكثيف"), b("Electrical and control inspection", "فحص الكهرباء ووحدات التحكم"), b("Cooling performance checks", "فحص أداء التبريد"), b("Equipment condition report", "تقرير حالة المعدات"), b("Priority repair appointments", "أولوية في مواعيد الإصلاح")],
      lines: [val("visits", "4 annually", "4 سنوياً", "4", "4"), yes("report"), yes("priority")],
    },
    {
      nameEn: "HVAC Premium", nameAr: "باقة التكييف المميزة", price: null, ...CUSTOM, maxAcUnits: null, badgeEn: "", badgeAr: "", highlighted: false,
      suitableEn: "More than 10 AC units and commercial properties.", suitableAr: "أكثر من 10 مكيفات والعقارات التجارية.",
      bullets: [b("Monthly or quarterly maintenance schedules according to contract", "جداول صيانة شهرية أو ربع سنوية بحسب العقد"), b("Detailed AC asset register", "سجل تفصيلي لأصول التكييف"), b("Customized preventive maintenance plan", "خطة صيانة وقائية مخصصة"), b("Equipment condition reports", "تقارير حالة المعدات"), b("Priority emergency response", "أولوية الاستجابة للطوارئ"), b("Dedicated maintenance coordinator", "مسؤول صيانة مخصص"), b("Performance monitoring and maintenance history", "متابعة الأداء وسجل الصيانة")],
      lines: [val("visits", "Custom", "مخصص"), yes("report"), yes("priority"), yes("coordinator"), yes("register")],
    },
  ],
  settings: {
    headingEn: "HVAC Annual Maintenance Contracts", headingAr: "عقود صيانة التكييف والتهوية السنوية",
    subtitleEn: "Professional HVAC preventive maintenance programs designed to improve cooling efficiency, reduce breakdowns and extend equipment life.",
    subtitleAr: "برامج صيانة وقائية احترافية لأنظمة التكييف والتهوية، تهدف إلى تحسين كفاءة التبريد وتقليل الأعطال وإطالة العمر التشغيلي للأجهزة.",
    ...NO_SETTINGS,
  },
};

// The original annual home packages (no group), from the existing standard data.
const HOME: SeedSet = {
  key: "home", label: "Annual home packages (Essential, Silver, Gold, Platinum)", group: null,
  services: STANDARD_SERVICES,
  packages: STANDARD_PACKAGES.map((p) => ({ ...p, bullets: [] })),
  settings: STANDARD_SETTINGS,
};

export const SEED_SETS: SeedSet[] = [HOME, COMMERCIAL, HVAC];
export const seedSet = (key: string) => SEED_SETS.find((s) => s.key === key);
