// Every word on the public jobs pages, in Arabic and English.

export type Lang = "ar" | "en";

const T = {
  siteName: { ar: "خدمات اسطا", en: "Osta Services" },
  jobsTitle: { ar: "الوظائف وفرص العمل", en: "Jobs & Work Opportunities" },
  jobsSubtitle: { ar: "انضم إلى فريق خدمات اسطا. تصفّح الفرص المتاحة وقدّم طلبك مع صور أعمالك.", en: "Join the Osta Services team. Browse the open opportunities and apply with photos of your work." },
  search: { ar: "ابحث بعنوان الوظيفة", en: "Search by job title" },
  allTypes: { ar: "كل الأنواع", en: "All types" }, allCategories: { ar: "كل المهن", en: "All trades" }, allEmirates: { ar: "كل الإمارات", en: "All emirates" }, allProperty: { ar: "كل أنواع العقار", en: "All property types" },
  area: { ar: "المنطقة", en: "Area" }, filter: { ar: "تصفية", en: "Filter" }, reset: { ar: "مسح", en: "Reset" },
  noJobs: { ar: "لا توجد فرص متاحة حالياً", en: "No opportunities right now" },
  noJobsHint: { ar: "تابع هذه الصفحة، نضيف فرصاً جديدة باستمرار.", en: "Check back soon: we add new opportunities regularly." },
  applyNow: { ar: "قدّم الآن", en: "Apply Now" }, details: { ar: "التفاصيل", en: "Details" },
  permanent: { ar: "وظيفة ثابتة", en: "Permanent position" }, daily: { ar: "عمل باليومية", en: "Daily work" },
  workersNeeded: { ar: "العدد المطلوب", en: "Workers needed" }, duration: { ar: "مدة العمل", en: "Duration" },
  dailyWage: { ar: "الأجر اليومي", en: "Daily wage" }, monthlySalary: { ar: "الراتب الشهري", en: "Monthly salary" },
  toBeAgreed: { ar: "يتم الاتفاق", en: "To be agreed" }, perDay: { ar: "درهم / اليوم", en: "AED / day" }, aed: { ar: "درهم", en: "AED" },
  startDate: { ar: "تاريخ البدء", en: "Start date" }, deadline: { ar: "آخر موعد للتقديم", en: "Application deadline" },
  location: { ar: "الموقع", en: "Location" }, propertyType: { ar: "نوع العقار", en: "Property type" }, workingHours: { ar: "ساعات العمل", en: "Working hours" },
  workingDaysWeek: { ar: "أيام العمل في الأسبوع", en: "Working days per week" }, materials: { ar: "المواد", en: "Materials" }, requirements: { ar: "المتطلبات", en: "Requirements" },
  description: { ar: "وصف العمل", en: "About the work" }, other: { ar: "أخرى", en: "Other" },
  onlyArabic: { ar: "هذه الفرصة متوفرة بالعربية فقط.", en: "This opportunity is available in Arabic only." },
  onlyEnglish: { ar: "هذه الفرصة متوفرة بالإنجليزية فقط.", en: "This opportunity is available in English only." },
  back: { ar: "العودة إلى الوظائف", en: "Back to jobs" }, previous: { ar: "السابق", en: "Previous" }, next: { ar: "التالي", en: "Next" }, page: { ar: "صفحة", en: "Page" }, of: { ar: "من", en: "of" },
  previewBanner: { ar: "معاينة: هذه الصفحة لا يراها الزوار ولا تظهر في محركات البحث.", en: "Preview: visitors can't see this page and search engines don't index it." },
  // states
  completedTitle: { ar: "تم الانتهاء من تنفيذ هذا العمل", en: "This Job Has Been Completed" },
  completedBody: {
    ar: "شكرًا لاهتمامك بالعمل مع خدمات اسطا. تم إغلاق هذه الفرصة بعد الانتهاء من تنفيذ العمل المطلوب. تابع صفحة الوظائف لدينا للاطلاع على فرص العمل الجديدة والتقديم عليها.",
    en: "Thank you for your interest in working with Osta Services. This opportunity has been closed because the required work has been completed. Visit our jobs page to explore new opportunities and apply.",
  },
  viewJobs: { ar: "استعرض الوظائف المتاحة", en: "View Available Jobs" },
  closedBody: { ar: "انتهت مهلة التقديم على هذه الفرصة. تابع صفحة الوظائف لمعرفة الفرص الجديدة.", en: "Applications for this opportunity are closed. Check our jobs page for new opportunities." },
  cancelledTitle: { ar: "تم إلغاء هذه الفرصة", en: "This opportunity has been cancelled" },
  cancelledBody: { ar: "تم إلغاء هذه الفرصة. تابع صفحة الوظائف لمعرفة الفرص الجديدة.", en: "This opportunity has been cancelled. Check our jobs page for new opportunities." },
  // form
  formTitle: { ar: "قدّم طلبك", en: "Apply for this job" },
  fullName: { ar: "الاسم الكامل", en: "Full name" }, phone: { ar: "رقم الهاتف", en: "Phone number" }, whatsapp: { ar: "رقم واتساب", en: "WhatsApp number" },
  sameAsPhone: { ar: "نفس رقم الهاتف", en: "Same as phone" }, preferredLang: { ar: "اللغة المفضلة", en: "Preferred language" },
  langAr: { ar: "العربية", en: "Arabic" }, langEn: { ar: "الإنجليزية", en: "English" }, langOther: { ar: "أخرى", en: "Other" }, otherLang: { ar: "اكتب لغتك", en: "Write your language" },
  currentEmirate: { ar: "الإمارة الحالية", en: "Current emirate" }, currentArea: { ar: "المنطقة الحالية", en: "Current area" }, choose: { ar: "اختر", en: "Choose" },
  skills: { ar: "المهارات", en: "Skills" }, otherSkills: { ar: "مهارات أخرى", en: "Other skills" }, experience: { ar: "سنوات الخبرة", en: "Years of experience" },
  photos: { ar: "صور الأعمال", en: "Work photos" }, photosHint: { ar: "صور من أعمالك السابقة (JPG أو PNG أو WebP)", en: "Photos of your previous work (JPG, PNG or WebP)" },
  addPhotos: { ar: "إضافة صور (كاميرا أو معرض)", en: "Add photos (camera or gallery)" }, remove: { ar: "حذف", en: "Remove" }, uploading: { ar: "جارٍ الرفع…", en: "Uploading…" }, uploaded: { ar: "تم الرفع", en: "Uploaded" }, retry: { ar: "إعادة المحاولة", en: "Retry" },
  notes: { ar: "ملاحظات", en: "Notes" }, optional: { ar: "اختياري", en: "optional" },
  consent: { ar: "أوافق على استخدام بياناتي وصوري لغرض تقييم طلب التوظيف فقط وفق سياسة الخصوصية", en: "I agree that my data and photos will be used only to evaluate my job application, per the Privacy Policy" },
  privacyPolicy: { ar: "سياسة الخصوصية", en: "Privacy Policy" },
  submit: { ar: "إرسال الطلب", en: "Submit application" }, sending: { ar: "جارٍ الإرسال…", en: "Sending…" },
  waitUploads: { ar: "انتظر اكتمال رفع الصور", en: "Please wait for the photos to finish uploading" },
  photosBusy: { ar: "جارٍ رفع الصور…", en: "Photos are uploading…" },
  successTitle: { ar: "تم استلام طلبك بنجاح!", en: "Application received!" },
  successBody: {
    ar: "شكرًا لاهتمامك بالعمل مع خدمات اسطا. تم استلام بياناتك وصور أعمالك، وسيتم التواصل معك إذا كنت مناسبًا للفرصة المتاحة. تقديم الطلب لا يضمن القبول أو التوظيف.",
    en: "Thank you for your interest in working with Osta Services. We've received your details and work photos and will contact you if you're a good fit. Submitting an application does not guarantee selection.",
  },
  yourCode: { ar: "رقم طلبك", en: "Your application number" }, otherJobs: { ar: "استعرض وظائف أخرى", en: "View other jobs" },
  duplicate: { ar: "لقد قدّمت على هذه الوظيفة من قبل. سنتواصل معك إذا تم اختيارك.", en: "You've already applied to this job. We'll contact you if you're selected." },
  genericError: { ar: "حدث خطأ. حاول مرة أخرى.", en: "Something went wrong. Please try again." },
  fileTooLarge: { ar: "حجم الصورة أكبر من الحد المسموح", en: "This photo is too large" }, fileType: { ar: "نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP", en: "Unsupported file. Use JPG, PNG or WebP" },
  tooManyPhotos: { ar: "الحد الأقصى لعدد الصور", en: "Maximum number of photos" }, minPhotos: { ar: "أضف صورة واحدة على الأقل", en: "Add at least one photo" },
  language: { ar: "English", en: "العربية" },
} as const;

export type TextKey = keyof typeof T;
export const tx = (lang: Lang, key: TextKey): string => T[key][lang];
export const parseLang = (v: string | null | undefined): Lang | null => (v === "ar" || v === "en" ? v : null);

// ?lang= wins, then the saved choice (cookie), then Accept-Language, then Arabic.
export function pickLang(param: string | undefined, cookie: string | undefined, acceptLanguage: string | null): Lang {
  const fromParam = parseLang(param);
  if (fromParam) return fromParam;
  const fromCookie = parseLang(cookie);
  if (fromCookie) return fromCookie;
  const first = (acceptLanguage ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("en")) return "en";
  return "ar";
}
