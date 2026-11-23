import { CATEGORY_A } from "./catA";
import { CATEGORY_B } from "./catB";
import { CATEGORY_C } from "./catC";
import { CATEGORY_D } from "./catD";
import { CATEGORY_E, CATEGORY_F } from "./catEF";
import type { SeedDoc } from "./helpers";

export const SEED_CATEGORIES = [
  { key: "A", slug: "customer-legal-and-booking", nameEn: "Customer Legal & Booking", nameAr: "الشؤون القانونية للعملاء والحجز" },
  { key: "B", slug: "service-and-technical-policies", nameEn: "Service & Technical Policies", nameAr: "سياسات الخدمات والجوانب الفنية" },
  { key: "C", slug: "warranty-quality-and-safety", nameEn: "Warranty, Quality & Safety", nameAr: "الضمان والجودة والسلامة" },
  { key: "D", slug: "digital-platform-and-privacy", nameEn: "Digital Platform & Privacy", nameAr: "المنصة الرقمية والخصوصية" },
  { key: "E", slug: "business-and-corporate", nameEn: "Business & Corporate", nameAr: "الأعمال والشركات" },
  { key: "F", slug: "workforce-and-governance", nameEn: "Workforce & Governance", nameAr: "فريق العمل والحوكمة" },
] as const;

export const SEED_DOCUMENTS: SeedDoc[] = [...CATEGORY_A, ...CATEGORY_B, ...CATEGORY_C, ...CATEGORY_D, ...CATEGORY_E, ...CATEGORY_F];

type SeedField = { key: string; labelEn: string; labelAr: string; hintEn: string; valueEn: string; valueAr: string; confirmed: boolean };
const known = (key: string, labelEn: string, labelAr: string, valueEn: string, valueAr: string, hintEn: string): SeedField => ({ key, labelEn, labelAr, hintEn, valueEn, valueAr, confirmed: true });
const open = (key: string, labelEn: string, labelAr: string, hintEn: string): SeedField => ({ key, labelEn, labelAr, hintEn, valueEn: "", valueAr: "", confirmed: false });

// Facts that are already public (live Terms page, licence) start confirmed; every commercial decision starts empty and unconfirmed,
// and a document that uses one cannot be published until the owner fills it in and confirms it.
export const SEED_FIELDS: SeedField[] = [
  known("company_name_en", "Company name (English)", "اسم الشركة (إنجليزي)", "ostaa Technical Services CO. L.L.C S.O.C", "ostaa Technical Services CO. L.L.C S.O.C", "From the commercial licence."),
  known("company_name_ar", "Company name (Arabic)", "اسم الشركة (عربي)", "شركة أسطا للخدمات الفنية ذ.م.م – ش.ش.و.", "شركة أسطا للخدمات الفنية ذ.م.م – ش.ش.و.", "From the commercial licence."),
  known("brand_name_en", "Brand name (English)", "اسم العلامة (إنجليزي)", "Osta Services", "Osta Services", "As used on the website."),
  known("brand_name_ar", "Brand name (Arabic)", "اسم العلامة (عربي)", "خدمات أسطا", "خدمات أسطا", "As used on the website."),
  known("license_number", "Commercial licence number", "رقم الرخصة التجارية", "1601375", "1601375", "From the commercial licence."),
  known("support_email", "Support email", "بريد الدعم", "info@ostaservices.com", "info@ostaservices.com", "From the live Terms page."),
  known("support_phone", "Support phone / WhatsApp", "هاتف الدعم / واتساب", "+971 56 867 6036", "+971 56 867 6036", "From the live Terms page."),
  known("workmanship_warranty_days", "Standard workmanship warranty", "مدة ضمان التنفيذ القياسية", "14 days", "14 يومًا", "From the live Terms page."),
  known("compressor_warranty_days", "Compressor workmanship warranty", "ضمان تنفيذ الكمبروسر", "30 days", "30 يومًا", "From the live Terms page."),
  open("cancellation_notice_hours", "Free cancellation notice", "مهلة الإلغاء المجاني", "How long before the appointment a customer can cancel for free, e.g. 4 hours."),
  open("late_cancellation_fee", "Late cancellation charge", "رسوم الإلغاء المتأخر", "The charge, or 'no charge'. Must be shown to the customer in advance."),
  open("reschedule_notice_hours", "Free rescheduling notice", "مهلة إعادة الجدولة المجانية", "How long before the appointment it can be moved for free."),
  open("no_show_fee", "No-show charge", "رسوم عدم الحضور", "The charge, or 'no charge'."),
  open("late_arrival_minutes", "Technician late by (minutes)", "تأخر الفني (بالدقائق)", "After how many minutes late the customer may cancel or move for free."),
  open("refund_review_days", "Refund review time", "مدة مراجعة طلب الاسترداد", "e.g. 5 working days."),
  open("refund_payment_days", "Refund payment time", "مدة دفع الاسترداد", "e.g. 14 working days."),
  open("quotation_validity_days", "Quotation validity", "مدة صلاحية عرض السعر", "e.g. 7 days."),
  open("complaint_ack_days", "Complaint acknowledgement time", "مدة تأكيد استلام الشكوى", "e.g. 2 working days."),
  open("complaint_resolution_days", "Complaint answer time", "مدة الرد على الشكوى", "e.g. 10 working days."),
  open("data_retention_period", "Personal data retention period", "مدة الاحتفاظ بالبيانات الشخصية", "Ask a lawyer: e.g. 5 years after the last service."),
  open("data_request_days", "Time to answer data requests", "مدة الرد على طلبات البيانات", "e.g. 30 days."),
  open("cookie_max_months", "Longest cookie lifetime", "أطول مدة لملفات تعريف الارتباط", "e.g. 12 months."),
  open("electrical_scope", "Electrical work OSTA does", "الأعمال الكهربائية التي تنفذها أسطا", "Electrical work is NOT in the commercial licence list. Write only what your licence and permits allow (e.g. power connection of AC units)."),
  open("corporate_credit_days", "Corporate payment period", "مدة سداد الشركات", "e.g. 30 days."),
  open("corporate_late_payment_fee", "Corporate late payment charge", "رسوم تأخر الشركات", "The charge, or 'no charge'."),
  open("supplier_payment_days", "Supplier payment period", "مدة سداد الموردين", "e.g. 30 days."),
];
