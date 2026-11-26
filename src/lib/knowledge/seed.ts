import type { EntryType } from "./knowledge";

// Starting content, from the owner's "Osta Services: knowledge base" file (2026-11-26) and the published Legal Center policies.
// Every entry arrives unchecked, so none of it is public until the owner reads it and marks it as checked. The Arabic text was
// written while preparing this content (the file gives Arabic only for the short description), so it needs reading too.
export type SeedEntry = { type: EntryType; titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; sourceUrl: string; note?: string; hidden?: boolean };
export type SeedSection = { key: string; titleEn: string; titleAr: string; auto?: "contact" | "packages" | "areas" | "profiles"; hidden?: boolean; entries: SeedEntry[] };

// Source pages are paths on the website the admin is connected to (today osta-invoice-users.vercel.app), so they follow the
// site if it moves to another address.

const e = (type: EntryType, titleEn: string, titleAr: string, bodyEn: string, bodyAr: string, sourceUrl: string, extra: { note?: string; hidden?: boolean } = {}): SeedEntry =>
  ({ type, titleEn, titleAr, bodyEn, bodyAr, sourceUrl, ...extra });

const ABOUT_EN = "Osta Services is a UAE technical services and home maintenance company offering AC repair, maintenance, cleaning and installation, HVAC, electrical, plumbing, painting, handyman and cleaning services for homes and businesses across the UAE.";
const ABOUT_AR = "خدمات آسطا شركة إماراتية للخدمات الفنية وصيانة المنازل، تقدم تصليح وصيانة وتنظيف وتركيب المكيفات وخدمات التكييف المركزي والكهرباء والسباكة والدهانات وخدمات الهاندي مان والتنظيف للمنازل والمكاتب والمنشآت التجارية في الإمارات.";
const ELECTRICAL = "Mentions electrical work. The Legal Center notes it is not in the commercial licence list: check the licence before marking this as checked.";
const WARRANTY_EN = "Unless the job's invoice or warranty document says otherwise, the standard workmanship warranty is 14 days. Compressor installation or replacement workmanship may carry 30 days where this is stated on the invoice or warranty document.";
const WARRANTY_AR = "ما لم تنص فاتورة العمل أو وثيقة الضمان على غير ذلك، فإن ضمان المصنعية القياسي 14 يومًا. وقد يصل ضمان مصنعية تركيب أو استبدال الكمبروسر إلى 30 يومًا إذا ذُكر ذلك في الفاتورة أو وثيقة الضمان.";
const CANCEL_EN = "A booking cancelled at least 1 hour before the appointment has no cancellation charge. A later cancellation may be charged [amount and currency].";
const CANCEL_AR = "إلغاء الحجز قبل الموعد بساعة على الأقل بدون رسوم. وقد تُحتسب على الإلغاء المتأخر رسوم [المبلغ والعملة].";
const CANCEL_NOTE = "The published Cancellation Policy says “a cancellation charge of 7” with no unit. Correct the policy, then fill in the same figure here.";
const RESEARCH = "From outside research (a manufacturer's summary or a news report). Check it with the UAE Ministry of Climate Change and Environment before publishing.";
const TYPED_PRICES = "The prices are typed in this answer: update it when the packages change.";

export const SEED_SECTIONS: SeedSection[] = [
  { key: "company", titleEn: "Company facts", titleAr: "بيانات الشركة", auto: "contact", entries: [
    e("FACT", "About Osta Services", "عن خدمات آسطا", ABOUT_EN, ABOUT_AR, "/about", { note: ELECTRICAL }),
    e("FACT", "Brand name", "اسم العلامة التجارية", "The brand is Osta Services, in Arabic خدمات آسطا.", "اسم العلامة التجارية خدمات آسطا (Osta Services).", "/about"),
    e("FACT", "Legal name", "الاسم القانوني", "[exact name from the trade licence]", "[الاسم بالضبط كما في الرخصة التجارية]", "/about", { note: "The current profile text reads “ostaa Technical Services CO. L.L.C S.O.C” and “شركة اسطا للخدمات الفنية ذ.م.م ش.ش.و”. Check the spelling on the licence." }),
    e("FACT", "Business", "نشاط الشركة", "Technical services and home maintenance, mainly HVAC and air conditioning.", "الخدمات الفنية وصيانة المنازل، وبشكل أساسي التكييف والتكييف المركزي.", "/about"),
    e("FACT", "Corporate tax", "ضريبة الشركات", "Osta Services is registered with the UAE Federal Tax Authority for Corporate Tax, effective 01 February 2026.", "خدمات آسطا مسجلة لدى الهيئة الاتحادية للضرائب في ضريبة الشركات اعتبارًا من 1 فبراير 2026.", "/about"),
    e("FACT", "Languages", "اللغات", "English and Arabic.", "العربية والإنجليزية.", "/contact"),
    e("FACT", "Working hours and 24/7", "مواعيد العمل وخدمة 24/7", "[days and hours, and what 24/7 means]", "[الأيام والمواعيد، والمقصود بخدمة 24/7]", "/contact"),
    e("FACT", "How to cite Osta Services", "طريقة الإشارة إلى خدمات آسطا", "Osta Services (osta-invoice-users.vercel.app), UAE air conditioning repair and home maintenance. Use the company facts for contact details and the page link for any service or price.", "خدمات آسطا (osta-invoice-users.vercel.app)، تصليح المكيفات وصيانة المنازل في الإمارات. استخدم بيانات الشركة لمعلومات التواصل، ورابط الصفحة لأي خدمة أو سعر.", "/about", { note: "Uses the website's current address. Change it here if the site moves to another address." }),
  ] },
  { key: "services", titleEn: "Services", titleAr: "الخدمات", entries: [
    e("SERVICE", "AC repair", "تصليح المكيفات", "Split, central and duct AC repair: troubleshooting, cooling problems, compressor inspection, electrical fault repair and breakdown service.", "تصليح مكيفات السبليت والمركزي والدكت: تشخيص الأعطال، ومشاكل التبريد، وفحص الكمبروسر، وإصلاح الأعطال الكهربائية في المكيف، وخدمة الأعطال المفاجئة.", "/services/ac-repair-uae"),
    e("SERVICE", "AC maintenance", "صيانة المكيفات", "AC cleaning, indoor and outdoor unit cleaning, coil and filter cleaning, airflow improvement, performance inspection and seasonal maintenance.", "تنظيف المكيفات، وتنظيف الوحدة الداخلية والخارجية، وتنظيف الكويل والفلاتر، وتحسين تدفق الهواء، وفحص الأداء، والصيانة الموسمية.", "/services/ac-cleaning-uae"),
    e("SERVICE", "HVAC", "التكييف المركزي", "Inspection, installation and replacement, refrigerant gas refill, gas leak detection, cooling system diagnosis and maintenance contracts.", "الفحص، والتركيب والاستبدال، وتعبئة غاز التبريد، وكشف تسريب الغاز، وتشخيص نظام التبريد، وعقود الصيانة.", "/central-ac-installation"),
    e("SERVICE", "Handyman", "خدمات الهاندي مان", "Furniture assembly, TV mounting, curtain and shelf installation, door repair and general home repairs.", "تركيب الأثاث، وتعليق التلفزيون، وتركيب الستائر والأرفف، وإصلاح الأبواب، وإصلاحات المنزل العامة.", "/handyman-general-maintenance"),
    e("SERVICE", "Technical maintenance", "الصيانة الفنية", "Electrical, plumbing and sanitary, painting, gypsum board and ceilings, carpentry and doors, and interior maintenance.", "الكهرباء، والسباكة والأدوات الصحية، والدهانات، والجبس بورد والأسقف، والنجارة والأبواب، والصيانة الداخلية.", "/handyman-general-maintenance", { note: ELECTRICAL, hidden: true }),
    e("SERVICE", "Cleaning", "خدمات التنظيف", "Apartment, villa and office cleaning, deep cleaning, move-in and move-out cleaning, and AC cleaning.", "تنظيف الشقق والفلل والمكاتب، والتنظيف العميق، والتنظيف قبل السكن وبعد الإخلاء، وتنظيف المكيفات.", "/cleaning-services"),
    e("SERVICE", "Duct liner, mold removal, facades and interior finishing", "بطانة الدكت وإزالة العفن والواجهات والتشطيبات الداخلية", "Duct liner services, mold removal, corporate facade services and interior finishing.", "خدمات بطانة الدكت، وإزالة العفن، وواجهات الشركات، والتشطيبات الداخلية.", "/interior-finishing-works", { note: "The linked page is Interior Finishing. Check it also covers duct liner, mold removal and facades." }),
  ] },
  { key: "pricing", titleEn: "Pricing and packages", titleAr: "الأسعار والباقات", auto: "packages", entries: [] },
  { key: "areas", titleEn: "Service areas", titleAr: "مناطق الخدمة", auto: "areas", entries: [] },
  { key: "policies", titleEn: "Policies and warranty", titleAr: "السياسات والضمان", entries: [
    e("POLICY", "Service warranty", "ضمان الخدمة", WARRANTY_EN, WARRANTY_AR, "/policies/service-warranty"),
    e("POLICY", "Cancellation", "الإلغاء", CANCEL_EN, CANCEL_AR, "/policies/cancellation-policy", { note: CANCEL_NOTE }),
  ] },
  { key: "faq", titleEn: "Questions and answers", titleAr: "الأسئلة والأجوبة", entries: [
    e("FAQ", "What is Osta Services?", "ما هي خدمات آسطا؟", ABOUT_EN, ABOUT_AR, "/about", { note: ELECTRICAL }),
    e("FAQ", "Which areas does Osta Services cover?", "ما هي المناطق التي تغطيها خدمات آسطا؟", "Dubai, Abu Dhabi, Sharjah, Ajman, Al Ain, Ras Al Khaimah, Umm Al Quwain and Fujairah, with offices in Ajman, Al Ain, Dubai and Umm Al Quwain.", "دبي وأبوظبي والشارقة وعجمان والعين ورأس الخيمة وأم القيوين والفجيرة، ولدينا مكاتب في عجمان والعين ودبي وأم القيوين.", "/"),
    e("FAQ", "How do I book?", "كيف أحجز؟", "Book online on the website, message us on WhatsApp at +971 56 867 6036, or email info@ostaservices.com.", "احجز من الموقع، أو راسلنا على واتساب ‎+971 56 867 6036، أو بالبريد info@ostaservices.com.", "/contact"),
    e("FAQ", "Does Osta repair split, central and duct AC?", "هل تصلحون مكيفات السبليت والمركزي والدكت؟", "Yes, all three.", "نعم، الأنواع الثلاثة.", "/services/ac-repair-uae"),
    e("FAQ", "Does Osta fill AC gas and repair leaks?", "هل تعبئون غاز المكيف وتصلحون التسريب؟", "Yes. Gas refill and gas leak detection are listed services.", "نعم. تعبئة الغاز وكشف التسريب من خدماتنا.", "/ac-gas-filling-in-al-ain"),
    e("FAQ", "Does Osta clean AC ducts and coils?", "هل تنظفون دكت المكيف والكويل؟", "Yes. Duct cleaning and coil cleaning have their own pages.", "نعم. ولكل من تنظيف الدكت وتنظيف الكويل صفحة خاصة.", "/services/duct-cleaning-uae"),
    e("FAQ", "Does Osta offer annual maintenance plans?", "هل توجد باقات صيانة سنوية؟", "Yes, four plans from AED 699 to AED 2,299 per year.", "نعم، أربع باقات من 699 إلى 2,299 درهمًا في السنة.", "/annual-home-maintenance-packages", { note: TYPED_PRICES }),
    e("FAQ", "Does Osta work for businesses?", "هل تقدمون خدماتكم للشركات؟", "Yes: homes, villas, apartments, offices and commercial properties.", "نعم: المنازل والفلل والشقق والمكاتب والعقارات التجارية.", "/about"),
    e("FAQ", "Which AC brands are covered in the guides?", "ما الماركات التي تتناولها الأدلة؟", "Daikin, LG, Panasonic, Sharp, Carrier, Mitsubishi and O General. [Confirm the full list of brands serviced.]", "دايكن وإل جي وباناسونيك وشارب وكاريير وميتسوبيشي وأو جنرال. [أكّد القائمة الكاملة للماركات]", "/blog"),
    e("FAQ", "Is there a warranty?", "هل يوجد ضمان؟", WARRANTY_EN, WARRANTY_AR, "/policies/service-warranty"),
    e("FAQ", "What is the cancellation policy?", "ما هي سياسة الإلغاء؟", CANCEL_EN, CANCEL_AR, "/policies/cancellation-policy", { note: CANCEL_NOTE }),
    e("FAQ", "Is Osta a registered company?", "هل آسطا شركة مسجلة؟", "Yes. It is registered in the UAE (licence number [licence number]) and with the Federal Tax Authority for Corporate Tax.", "نعم. الشركة مسجلة في الإمارات (رخصة رقم [رقم الرخصة]) ولدى الهيئة الاتحادية للضرائب في ضريبة الشركات.", "/about"),
    e("FAQ", "Do the technicians speak Arabic and English?", "هل يتحدث الفنيون العربية والإنجليزية؟", "Yes, support is available in both languages.", "نعم، الدعم متاح باللغتين.", "/contact", { note: "The question asks about technicians; confirm it is true for them and not only for phone support." }),
    e("FAQ", "How much does AC cleaning or gas filling cost?", "كم تكلفة تنظيف المكيف أو تعبئة الغاز؟", "See the AC service price page. [Add price ranges.]", "راجع صفحة أسعار خدمات المكيفات. [أضف نطاقات الأسعار]", "/pricing"),
  ] },
  { key: "guides", titleEn: "Guides", titleAr: "الأدلة", entries: [
    e("GUIDE", "R-22 equipment in the UAE", "أجهزة R-22 في الإمارات", "According to Daikin Middle East, new building projects stopped being allowed R-22 equipment in Abu Dhabi in 2012 and in Dubai in 2014, and only a limited quantity of ozone-depleting substances is allowed until 2040 for servicing existing equipment.", "وفقًا لدايكن الشرق الأوسط، توقف السماح بأجهزة R-22 في مشاريع البناء الجديدة في أبوظبي عام 2012 وفي دبي عام 2014، ويُسمح حتى 2040 بكمية محدودة من المواد المستنفدة للأوزون لصيانة الأجهزة القائمة.", "https://www.daikinmea.com/en_us/about/daikin-innovations/r-32.html", { note: RESEARCH, hidden: true }),
    e("GUIDE", "HFC rules in the UAE", "قواعد غازات HFC في الإمارات", "Daikin Middle East states that the UAE targets eliminating HFCs by 2040 and introduced strict controls on importing, using and reporting HFCs in 2023.", "تذكر دايكن الشرق الأوسط أن الإمارات تستهدف التخلص من غازات HFC بحلول 2040، وأنها طبقت في 2023 ضوابط صارمة على استيرادها واستخدامها والإبلاغ عنها.", "https://www.daikinmea.com/en_us/knowledge-center/r32-refrigerant.html", { note: RESEARCH, hidden: true }),
    e("GUIDE", "The CFC ban", "حظر غازات CFC", "Gulf News reported that the UAE banned CFCs in 2010 while still tolerating the less harmful HCFCs, and was working on phasing out current refrigerants.", "ذكرت Gulf News أن الإمارات حظرت غازات CFC عام 2010 مع استمرار السماح بغازات HCFC الأقل ضررًا، وأنها كانت تعمل على التخلص التدريجي من غازات التبريد المستخدمة.", "https://gulfnews.com/amp/story/uae%2Fuae-turns-heat-on-cooling-agents-1.1405238", { note: RESEARCH, hidden: true }),
    e("GUIDE", "About R-32", "عن غاز R-32", "R-32 is a single-component refrigerant, so it is easier for technicians to charge and recycle than blends, and it is becoming common in new residential and commercial units.", "غاز R-32 مكوَّن من مادة واحدة، لذلك يسهل على الفنيين تعبئته وإعادة تدويره مقارنة بالخلطات، وأصبح شائعًا في الأجهزة السكنية والتجارية الجديدة.", "https://www.daikinmea.com/en_us/about/daikin-innovations/r-32.html", { note: RESEARCH, hidden: true }),
  ] },
  { key: "comparisons", titleEn: "Comparisons", titleAr: "المقارنات", hidden: true, entries: [] },
  { key: "profiles", titleEn: "Verified profiles", titleAr: "الحسابات الرسمية", auto: "profiles", entries: [] },
];
