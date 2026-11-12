export const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Al Ain",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Ziina"] as const;

// The admin-only Paid/Unpaid toggle. Refunded/Partially Refunded are a separate
// concern handled by the existing Refund flow, not this control.
export const ADMIN_INVOICE_STATUSES = ["Paid", "Unpaid"] as const;

// How the customer found us, chosen at invoice creation. Drives the Marketing
// dashboard's per-campaign attribution (see src/lib/marketingData.ts) -- "Organic"
// carries no ad spend by definition, so all Marketing Advertising expense is
// attributed to "Meta Ads" for now.
export const LEAD_SOURCES = ["Organic", "Meta Ads"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const SERVICE_TYPES = ["Repair", "Inspection"] as const;

export const CATEGORIES = ["AC", "Plumbing", "Electrical", "General"] as const;
export type Category = (typeof CATEGORIES)[number];

export const SERVICE_CATALOG: Record<Category, string[]> = {
  AC: [
    "AC Cleaning / غسيل مكيف",
    "Gas Refilling / تعبئة غاز",
    "AC Inspection & Diagnosis / فحص وتشخيص مكيف",
    "Minor AC Repair / تصليح مكيف بسيط",
    "Medium AC Repair / تصليح مكيف متوسط",
    "Major AC Repair / تصليح مكيف متقدم",
    "AC Electrical Repair / تصليح كهرباء المكيف",
    "Custom / مخصص",
  ],
  Plumbing: [
    "Pipe Repair / إصلاح أنابيب",
    "Leak Fix / إصلاح تسرب",
    "Drain Cleaning / تنظيف مجاري",
    "Tap Replacement / تبديل صنبور",
    "Water Heater Service / صيانة سخان",
    "Toilet Repair / إصلاح مرحاض",
    "Inspection / فحص عام",
    "Custom / مخصص",
  ],
  Electrical: [
    "Light Fitting / تركيب إضاءة",
    "Socket Repair / إصلاح بريزة",
    "Circuit Breaker / صيانة قاطع",
    "Wiring Fix / إصلاح أسلاك",
    "Fan Installation / تركيب مروحة",
    "Electrical Inspection / فحص كهربائي",
    "DB Board Maintenance / صيانة لوحة",
    "Custom / مخصص",
  ],
  General: [
    "Painting / دهان",
    "Furniture Assembly / تجميع أثاث",
    "Door Fix / إصلاح باب",
    "Window Repair / إصلاح نافذة",
    "Tile Work / أعمال بلاط",
    "Handyman Service / خدمة عامة",
    "Other / أخرى",
    "Custom / مخصص",
  ],
};

export const CUSTOM_SERVICE_VALUE = "Custom / مخصص";

// The fixed warranty every invoice carried before the warranty became a per-invoice choice; still the default length of a certificate and of
// imported historical invoices.
export const WARRANTY_DAYS = 14;

export const COMPANY_INFO = {
  name: "OSTA TECHNICAL SERVICES CO. L.L.C S.O.C",
  email: "info@ostaservices.com",
  trn: "105442240300001",
  license: "1601375",
  website: "www.ostaservices.com",
  phone: "0568676036",
  address: "Ajman, United Arab Emirates",
};

export const TERMS_AND_CONDITIONS = [
  "Paid amounts are non-refundable.",
  "Spare parts warranty belongs to manufacturer.",
  "Company not responsible for misuse.",
  "Free revisit once.",
  "Additional visit AED 50 if issue unrelated.",
  `${WARRANTY_DAYS} Days Warranty.`,
];

export const TERMS_URL = "www.ostaservices.com/terms-and-conditions";
