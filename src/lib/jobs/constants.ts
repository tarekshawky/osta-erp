// Labels, option lists and status rules for the Jobs & Workforce module. Pure data: the admin screens, the public pages,
// the WhatsApp text and the tests all read from here.

export const JOB_TYPES = ["PERMANENT", "DAILY"] as const;
export type JobTypeKey = (typeof JOB_TYPES)[number];
export const JOB_TYPE_LABEL: Record<JobTypeKey, { en: string; ar: string }> = {
  PERMANENT: { en: "Permanent job", ar: "وظيفة ثابتة" },
  DAILY: { en: "Daily work", ar: "عمل باليومية" },
};

export const JOB_STATUSES = ["DRAFT", "PUBLISHED", "APPLICATIONS_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type JobStatusKey = (typeof JOB_STATUSES)[number];
export const JOB_STATUS_LABEL: Record<JobStatusKey, string> = {
  DRAFT: "Draft", PUBLISHED: "Published", APPLICATIONS_CLOSED: "Applications closed", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled",
};
// One colour per status, used by every badge in the module.
export const JOB_STATUS_STYLE: Record<JobStatusKey, string> = {
  DRAFT: "bg-slate-100 text-slate-600", PUBLISHED: "bg-emerald-50 text-emerald-700", APPLICATIONS_CLOSED: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700", COMPLETED: "bg-violet-50 text-violet-700", CANCELLED: "bg-red-50 text-red-600",
};

export const APPLICATION_STATUSES = ["NEW", "UNDER_REVIEW", "SHORTLISTED", "CONTACTED", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const;
export type ApplicationStatusKey = (typeof APPLICATION_STATUSES)[number];
export const APPLICATION_STATUS_LABEL: Record<ApplicationStatusKey, string> = {
  NEW: "New", UNDER_REVIEW: "Under review", SHORTLISTED: "Shortlisted", CONTACTED: "Contacted", ACCEPTED: "Accepted", REJECTED: "Rejected", WITHDRAWN: "Withdrawn",
};
export const APPLICATION_STATUS_STYLE: Record<ApplicationStatusKey, string> = {
  NEW: "bg-blue-50 text-blue-700", UNDER_REVIEW: "bg-amber-50 text-amber-700", SHORTLISTED: "bg-indigo-50 text-indigo-700", CONTACTED: "bg-cyan-50 text-cyan-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-red-50 text-red-600", WITHDRAWN: "bg-slate-100 text-slate-500",
};

export const EMIRATES = ["ABU_DHABI", "DUBAI", "SHARJAH", "AJMAN", "UMM_AL_QUWAIN", "RAS_AL_KHAIMAH", "FUJAIRAH"] as const;
export type EmirateKey = (typeof EMIRATES)[number];
export const EMIRATE_LABEL: Record<EmirateKey, { en: string; ar: string; slug: string }> = {
  ABU_DHABI: { en: "Abu Dhabi", ar: "أبوظبي", slug: "abu-dhabi" },
  DUBAI: { en: "Dubai", ar: "دبي", slug: "dubai" },
  SHARJAH: { en: "Sharjah", ar: "الشارقة", slug: "sharjah" },
  AJMAN: { en: "Ajman", ar: "عجمان", slug: "ajman" },
  UMM_AL_QUWAIN: { en: "Umm Al Quwain", ar: "أم القيوين", slug: "umm-al-quwain" },
  RAS_AL_KHAIMAH: { en: "Ras Al Khaimah", ar: "رأس الخيمة", slug: "ras-al-khaimah" },
  FUJAIRAH: { en: "Fujairah", ar: "الفجيرة", slug: "fujairah" },
};

export const PROPERTY_TYPES = ["VILLA", "APARTMENT", "FACTORY", "WAREHOUSE", "OFFICE", "COMMERCIAL", "OTHER"] as const;
export type PropertyTypeKey = (typeof PROPERTY_TYPES)[number];
export const PROPERTY_LABEL: Record<PropertyTypeKey, { en: string; ar: string }> = {
  VILLA: { en: "Villa", ar: "فيلا" }, APARTMENT: { en: "Apartment", ar: "شقة" }, FACTORY: { en: "Factory", ar: "مصنع" }, WAREHOUSE: { en: "Warehouse", ar: "مخزن" },
  OFFICE: { en: "Office", ar: "مكتب" }, COMMERCIAL: { en: "Commercial property", ar: "عقار تجاري" }, OTHER: { en: "Other", ar: "أخرى" },
};

export const MATERIALS_BY = ["OSTA", "WORKER", "TO_BE_AGREED"] as const;
export type MaterialsByKey = (typeof MATERIALS_BY)[number];
export const MATERIALS_LABEL: Record<MaterialsByKey, { en: string; ar: string }> = {
  OSTA: { en: "Osta Services", ar: "خدمات اسطا" }, WORKER: { en: "The worker", ar: "العامل" }, TO_BE_AGREED: { en: "To be agreed", ar: "يتم الاتفاق" },
};

// Default job categories and applicant skills (seeded; editable in Settings).
export const DEFAULT_CATEGORIES: { key: string; nameEn: string; nameAr: string }[] = [
  { key: "painting", nameEn: "Painting", nameAr: "دهانات" },
  { key: "ac-refrigeration", nameEn: "AC & Refrigeration", nameAr: "تكييف وتبريد" },
  { key: "plumbing", nameEn: "Plumbing", nameAr: "سباكة" },
  { key: "electrical", nameEn: "Electrical", nameAr: "كهرباء" },
  { key: "carpentry", nameEn: "Carpentry", nameAr: "نجارة" },
  { key: "gypsum", nameEn: "Gypsum", nameAr: "جبس" },
  { key: "tiling", nameEn: "Tiling", nameAr: "تركيب بلاط" },
  { key: "waterproofing", nameEn: "Waterproofing", nameAr: "عزل" },
  { key: "general-maintenance", nameEn: "General Maintenance", nameAr: "صيانة عامة" },
  { key: "helper", nameEn: "Helper", nameAr: "مساعد فني" },
  { key: "supervisor", nameEn: "Supervisor", nameAr: "مشرف عمال" },
  { key: "other", nameEn: "Other", nameAr: "أخرى" },
];
// The word used in the public URL and the share text for each category ("painter-ajman-123").
export const CATEGORY_SLUG_WORD: Record<string, string> = {
  painting: "painter", "ac-refrigeration": "ac-technician", plumbing: "plumber", electrical: "electrician", carpentry: "carpenter", gypsum: "gypsum-worker",
  tiling: "tiler", waterproofing: "waterproofing", "general-maintenance": "maintenance", helper: "helper", supervisor: "supervisor", other: "worker",
};
// The trade as it reads in an ad: "مطلوب {المهنة}".
export const CATEGORY_TRADE: Record<string, { en: string; ar: string }> = {
  painting: { en: "Painter", ar: "دهان" }, "ac-refrigeration": { en: "AC & Refrigeration Technician", ar: "فني تكييف وتبريد" }, plumbing: { en: "Plumber", ar: "سباك" },
  electrical: { en: "Electrician", ar: "كهربائي" }, carpentry: { en: "Carpenter", ar: "نجار" }, gypsum: { en: "Gypsum Worker", ar: "فني جبس" }, tiling: { en: "Tiler", ar: "فني تركيب بلاط" },
  waterproofing: { en: "Waterproofing Technician", ar: "فني عزل" }, "general-maintenance": { en: "General Maintenance Technician", ar: "فني صيانة عامة" },
  helper: { en: "Technician Helper", ar: "مساعد فني" }, supervisor: { en: "Workers Supervisor", ar: "مشرف عمال" }, other: { en: "Worker", ar: "عامل" },
};

export const DEFAULT_SKILLS: { key: string; labelEn: string; labelAr: string; active: boolean }[] = [
  { key: "painting", labelEn: "Painting", labelAr: "دهانات", active: true },
  { key: "ac-refrigeration", labelEn: "AC & Refrigeration", labelAr: "تكييف وتبريد", active: true },
  { key: "plumbing", labelEn: "Plumbing", labelAr: "سباكة", active: true },
  { key: "electrical", labelEn: "Electrical", labelAr: "كهرباء", active: true },
  { key: "carpentry", labelEn: "Carpentry", labelAr: "نجارة", active: true },
  { key: "gypsum", labelEn: "Gypsum", labelAr: "جبس", active: true },
  { key: "tiling", labelEn: "Tiling", labelAr: "تركيب بلاط", active: true },
  { key: "waterproofing", labelEn: "Waterproofing", labelAr: "عزل", active: true },
  { key: "general-maintenance", labelEn: "General Maintenance", labelAr: "صيانة عامة", active: true },
  { key: "other", labelEn: "Other", labelAr: "أخرى", active: true },
];

export const PAINT_FINISH_OPTIONS = [
  { value: "economy", labelEn: "Economy", labelAr: "اقتصادي" },
  { value: "luxury", labelEn: "Luxury", labelAr: "لوكس" },
  { value: "super-luxury", labelEn: "Super Luxury", labelAr: "سوبر لوكس" },
  { value: "other", labelEn: "Other", labelAr: "أخرى" },
];

// Where a job may go from each status (every change needs a confirmation and is logged).
export const STATUS_TRANSITIONS: Record<JobStatusKey, JobStatusKey[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["DRAFT", "APPLICATIONS_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  APPLICATIONS_CLOSED: ["PUBLISHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["APPLICATIONS_CLOSED", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["DRAFT"],
};

export const DUBAI_TZ = "Asia/Dubai";
