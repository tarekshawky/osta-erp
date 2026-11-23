import { TERMS, TERMS_INTRO, TERMS_PARTS } from "./termsClauses";
import { COMPANY_AR, COMPANY_EN, cl, live, part, t, type S, type SeedDoc } from "./helpers";

// ---- 1. Terms & Conditions: the live document, kept clause by clause in both languages ----
const termsSections: S[] = [];
for (const p of TERMS_PARTS) {
  termsSections.push(part(p.headingEn, p.headingAr));
  for (let n = p.from; n <= p.to; n++) termsSections.push(t(n));
}
termsSections.push(part("Contact {{brand_name_en}} UAE", "تواصل مع {{brand_name_ar}} في الإمارات", "Email: {{support_email}}\nPhone and WhatsApp: {{support_phone}}\nWebsite: https://www.ostaservices.com/", "البريد الإلكتروني: {{support_email}}\nالهاتف وواتساب: {{support_phone}}\nالموقع الإلكتروني: https://www.ostaservices.com/"));

const terms: SeedDoc = {
  number: 1, slug: "terms-and-conditions", cat: "A", kind: "POLICY",
  titleEn: "Terms & Conditions", titleAr: "الشروط والأحكام العامة",
  summaryEn: "The general rules for bookings, inspections, quotations, charges, warranties, payments and customer responsibilities.",
  summaryAr: "القواعد العامة للحجز والمعاينة والأسعار والرسوم والضمان والمدفوعات ومسؤوليات العميل.",
  introEn: TERMS_INTRO.en, introAr: TERMS_INTRO.ar,
  sections: termsSections,
  related: ["customer-service-agreement", "booking-policy", "service-warranty", "privacy-policy"],
  seoTitleEn: "Terms & Conditions | OSTA Services UAE", seoTitleAr: "الشروط والأحكام | خدمات أسطا الإمارات",
  seoDescEn: "The general terms for booking and using OSTA Services in the UAE: bookings, quotations, visit charges, warranty, payments and customer responsibilities.",
  seoDescAr: "الشروط العامة لحجز خدمات أسطا واستخدامها في الإمارات: الحجز وعروض الأسعار ورسوم الزيارة والضمان والمدفوعات ومسؤوليات العميل.",
};

// ---- 2. Customer Service Agreement ----
const csa: SeedDoc = {
  number: 2, slug: "customer-service-agreement", cat: "A", kind: "POLICY",
  titleEn: "Customer Service Agreement", titleAr: "اتفاقية تقديم الخدمات",
  summaryEn: "The agreement between OSTA and a customer for each confirmed service.",
  summaryAr: "الاتفاق بين أسطا والعميل بشأن كل خدمة مؤكدة.",
  introEn: `This agreement is made between ${COMPANY_EN}, and the customer who books or approves a service. It applies to every confirmed job, together with the quotation or invoice for that job.`,
  introAr: `يُبرم هذا الاتفاق بين ${COMPANY_AR}، والعميل الذي يحجز الخدمة أو يوافق عليها. ويسري على كل عمل مؤكد، إلى جانب عرض السعر أو الفاتورة الخاصة بذلك العمل.`,
  sections: [
    part("Part 1: The Agreement", "الجزء الأول: الاتفاقية"),
    cl("Parties", "الطرفان", "The service provider is {{company_name_en}}, a limited liability company (single owner) licensed in the United Arab Emirates under commercial licence no. {{license_number}}. The customer is the person who books the service or approves the quotation.", "مزوّد الخدمة هو {{company_name_ar}}، شركة ذات مسؤولية محدودة (شخص واحد) مرخّصة في دولة الإمارات العربية المتحدة بموجب الرخصة التجارية رقم {{license_number}}. والعميل هو الشخص الذي يحجز الخدمة أو يوافق على عرض السعر."),
    cl("What forms the agreement", "ما يتكوّن منه الاتفاق", "The agreement consists of this document, the Terms & Conditions, the quotation or invoice for the job, and any written warranty issued for it. If they differ, the quotation or invoice agreed for the specific job prevails for that job, without reducing any right the customer has under law.", "يتكوّن الاتفاق من هذه الوثيقة والشروط والأحكام وعرض السعر أو الفاتورة الخاصة بالعمل وأي ضمان مكتوب صادر عنه. وعند الاختلاف يُعمل بعرض السعر أو الفاتورة المتفق عليها للعمل المحدد، دون الانتقاص من أي حق للعميل بموجب القانون."),
    t(3), t(4),
    cl("Licensed scope", "نطاق الترخيص", "We provide services within the activities of our commercial licence. We may decline or stop work that falls outside our licensed scope, is unsafe or is unlawful.", "نقدّم الخدمات ضمن الأنشطة المرخّصة في رخصتنا التجارية. ويجوز لنا رفض أو إيقاف أي عمل يقع خارج نطاق الترخيص أو يكون غير آمن أو مخالفًا للقانون."),
    part("Part 2: Services, Price and Payment", "الجزء الثاني: الخدمات والسعر والدفع"),
    cl("Confirmed service", "الخدمة المؤكدة", "A service is confirmed when we communicate acceptance of the booking, or when the customer approves a quotation. The confirmed scope, price and appointment are recorded in the booking, quotation or invoice.", "تُعدّ الخدمة مؤكدة عندما نبلغ العميل بقبول الحجز، أو عندما يوافق العميل على عرض السعر. ويُسجَّل النطاق والسعر والموعد المؤكد في الحجز أو عرض السعر أو الفاتورة."),
    t(25),
    t(61), t(62),
    part("Part 3: Responsibilities", "الجزء الثالث: المسؤوليات"),
    t(31), t(32), t(36),
    cl("Our responsibilities", "التزاماتنا", "We will carry out the agreed work with reasonable skill and care, using suitably trained technicians, and will explain any material limitation or additional work before it is carried out.", "ننفّذ العمل المتفق عليه بمهارة وعناية معقولتين، بواسطة فنيين مؤهلين، ونوضح أي قيود جوهرية أو أعمال إضافية قبل تنفيذها."),
    part("Part 4: Warranty, Liability and Disputes", "الجزء الرابع: الضمان والمسؤولية والنزاعات"),
    cl("Warranty", "الضمان", "Completed work is covered by the warranty described in the Service Warranty Policy and in the invoice or warranty document for the job.", "تُغطّى الأعمال المنفّذة بالضمان الموضّح في سياسة ضمان الخدمات وفي الفاتورة أو وثيقة الضمان الخاصة بالعمل."),
    t(76), t(77), t(78),
    t(91), t(93), t(94),
    t(95), t(96),
    cl("Governing law", "القانون الواجب التطبيق", "This agreement is governed by the laws of the United Arab Emirates as applied in the emirate where the service is provided.", "يخضع هذا الاتفاق لقوانين دولة الإمارات العربية المتحدة كما تُطبَّق في الإمارة التي تُقدَّم فيها الخدمة."),
  ],
  related: ["terms-and-conditions", "booking-policy", "service-warranty", "complaints-policy"],
  seoTitleEn: "Customer Service Agreement | OSTA Services UAE", seoTitleAr: "اتفاقية تقديم الخدمات | خدمات أسطا الإمارات",
  seoDescEn: "The service agreement between OSTA Services and its customers: parties, scope, price, responsibilities, warranty and disputes.",
  seoDescAr: "اتفاقية تقديم الخدمات بين خدمات أسطا وعملائها: الأطراف والنطاق والسعر والمسؤوليات والضمان والنزاعات.",
};

// ---- 3. Booking & Appointment Policy ----
const booking: SeedDoc = {
  number: 3, slug: "booking-policy", cat: "A", kind: "POLICY",
  titleEn: "Booking & Appointment Policy", titleAr: "سياسة الحجز والمواعيد",
  summaryEn: "How to book, when a booking is confirmed, and how appointments work.",
  summaryAr: "كيفية الحجز ومتى يُعدّ الحجز مؤكدًا وكيف تعمل المواعيد.",
  introEn: "This policy explains how bookings and appointments work for services provided by {{brand_name_en}}. Booking terms that change an appointment are in the Cancellation Policy and the Rescheduling & No-Show Policy.",
  introAr: "توضّح هذه السياسة كيفية عمل الحجوزات والمواعيد للخدمات التي تقدمها {{brand_name_ar}}. وتجد شروط إلغاء الموعد وتغييره في سياسة الإلغاء وسياسة إعادة الجدولة وعدم الحضور.",
  sections: [
    part("Part 1: Making a Booking", "الجزء الأول: إجراء الحجز"),
    t(11), t(12), t(13),
    cl("Time slots held while you book", "حجز الموعد مؤقتًا أثناء إتمام الطلب", "When you choose a time online, the slot may be held for a short time while you complete the booking. If the booking is not completed, the slot is released and may be offered to others.", "عند اختيارك موعدًا عبر الموقع، قد يُحجز الموعد لفترة قصيرة أثناء إتمامك للطلب. وإذا لم يكتمل الحجز يُفرج عن الموعد وقد يُعرض على عملاء آخرين."),
    t(8),
    part("Part 2: The Appointment", "الجزء الثاني: الموعد"),
    t(14), t(15), t(19), t(20),
    t(18),
    cl("Contacting us about a booking", "التواصل بشأن الحجز", "To ask about, confirm or change a booking, contact us on {{support_phone}} (phone or WhatsApp) or at {{support_email}}, quoting your booking reference.", "للاستفسار عن حجز أو تأكيده أو تغييره، تواصل معنا على الرقم {{support_phone}} (هاتف أو واتساب) أو عبر {{support_email}} مع ذكر رقم الحجز."),
  ],
  related: ["cancellation-policy", "rescheduling-policy", "pricing-policy", "terms-and-conditions"],
  seoTitleEn: "Booking & Appointment Policy | OSTA Services UAE", seoTitleAr: "سياسة الحجز والمواعيد | خدمات أسطا الإمارات",
  seoDescEn: "How booking works at OSTA Services: confirmation, accurate location, appointment windows, same-day requests and access.",
  seoDescAr: "كيف يعمل الحجز لدى خدمات أسطا: التأكيد وتحديد الموقع بدقة ونوافذ المواعيد والطلبات العاجلة والوصول إلى العقار.",
};

// ---- 4. Cancellation Policy ----
const cancellation: SeedDoc = {
  number: 4, slug: "cancellation-policy", cat: "A", kind: "POLICY",
  titleEn: "Cancellation Policy", titleAr: "سياسة إلغاء الحجوزات",
  summaryEn: "How to cancel a booking and when a cancellation charge may apply.",
  summaryAr: "كيفية إلغاء الحجز ومتى قد تُطبَّق رسوم إلغاء.",
  introEn: "This policy explains how a customer can cancel a booking with {{brand_name_en}}, and what happens when we need to cancel. It does not reduce any right a customer has under UAE law.",
  introAr: "توضّح هذه السياسة كيف يمكن للعميل إلغاء حجزه لدى {{brand_name_ar}}، وما يحدث عندما نضطر نحن إلى الإلغاء. ولا تنتقص من أي حق للعميل بموجب القانون الإماراتي.",
  sections: [
    part("Part 1: Cancelling a Booking", "الجزء الأول: إلغاء الحجز"),
    cl("How to cancel", "كيفية الإلغاء", "Ask us to cancel through our official channels: phone or WhatsApp on {{support_phone}}, email at {{support_email}}, or the contact details in your booking confirmation. Please quote your booking reference.", "اطلب الإلغاء عبر قنواتنا الرسمية: الهاتف أو واتساب على {{support_phone}}، أو البريد الإلكتروني {{support_email}}، أو بيانات التواصل في تأكيد الحجز. يُرجى ذكر رقم الحجز."),
    cl("Cancelling in good time", "الإلغاء في وقت مناسب", "A booking cancelled at least {{cancellation_notice_hours}} before the appointment is cancelled without a cancellation charge.", "يُلغى الحجز دون رسوم إلغاء إذا طُلب الإلغاء قبل الموعد بمدة لا تقل عن {{cancellation_notice_hours}}."),
    cl("Late cancellation", "الإلغاء المتأخر", "If a booking is cancelled later than that, a cancellation charge of {{late_cancellation_fee}} may apply. The charge is only applied if it was disclosed to the customer in advance, accepted where required, and permitted by law.", "إذا طُلب الإلغاء بعد ذلك الوقت، قد تُطبَّق رسوم إلغاء قدرها {{late_cancellation_fee}}. ولا تُطبَّق الرسوم إلا إذا أُفصح عنها للعميل مسبقًا ووافق عليها عند اللزوم وكان القانون يسمح بها."),
    t(17),
    t(18),
    part("Part 2: Cancellation by OSTA", "الجزء الثاني: الإلغاء من جانب أسطا"),
    cl("When we may cancel", "متى قد نلغي الموعد", "We may cancel or move an appointment if it is unsafe, if the technician is not available, if the property cannot be reached, or because of events beyond our reasonable control. We will tell the customer as early as possible and offer a new appointment.", "قد نلغي الموعد أو نغيّره إذا كان العمل غير آمن أو إذا لم يتوفر الفني أو تعذّر الوصول إلى العقار أو بسبب ظروف خارجة عن سيطرتنا المعقولة. وسنبلغ العميل في أقرب وقت ونعرض عليه موعدًا جديدًا."),
    cl("Payments when we cancel", "الدفعات عند إلغائنا", "If we cancel and the customer does not want a new appointment, any amount paid in advance for the cancelled service is handled under the Refund & Compensation Policy.", "إذا ألغينا الموعد ولم يرغب العميل في موعد جديد، فتُعالج أي مبالغ دُفعت مقدمًا للخدمة الملغاة وفق سياسة الاسترداد والتعويضات."),
    part("Part 3: Packages and Contracts", "الجزء الثالث: الباقات والعقود"),
    t(29),
    cl("Your legal rights", "حقوقك القانونية", "Nothing in this policy removes a right to cancel, to a refund or to any other remedy that the customer has under applicable UAE law.", "لا تُسقط هذه السياسة أي حق في الإلغاء أو الاسترداد أو أي تعويض آخر يكفله القانون الإماراتي المعمول به للعميل."),
  ],
  related: ["booking-policy", "rescheduling-policy", "refund-policy", "terms-and-conditions"],
  seoTitleEn: "Cancellation Policy | OSTA Services UAE", seoTitleAr: "سياسة إلغاء الحجوزات | خدمات أسطا الإمارات",
  seoDescEn: "How to cancel an OSTA Services booking, when a cancellation charge may apply and what happens if we cancel.",
  seoDescAr: "كيفية إلغاء حجز خدمات أسطا ومتى قد تُطبَّق رسوم إلغاء وماذا يحدث إذا ألغينا نحن الموعد.",
};

// ---- 5. Rescheduling & No-Show Policy ----
const rescheduling: SeedDoc = {
  number: 5, slug: "rescheduling-policy", cat: "A", kind: "POLICY",
  titleEn: "Rescheduling & No-Show Policy", titleAr: "سياسة إعادة الجدولة وعدم الحضور",
  summaryEn: "Changing an appointment, and what happens when nobody is available at the property.",
  summaryAr: "تغيير الموعد، وما يحدث عندما لا يتواجد أحد في العقار.",
  introEn: "This policy covers moving an appointment to another time, and what happens when the technician arrives and cannot start the work.",
  introAr: "تغطي هذه السياسة نقل الموعد إلى وقت آخر، وما يحدث عندما يصل الفني ولا يتمكن من بدء العمل.",
  sections: [
    part("Part 1: Rescheduling", "الجزء الأول: إعادة الجدولة"),
    t(16),
    cl("Free rescheduling", "إعادة الجدولة دون رسوم", "An appointment can be moved free of charge if we are asked at least {{reschedule_notice_hours}} before it. A new time depends on technician availability.", "يمكن نقل الموعد دون رسوم إذا طُلب ذلك قبله بمدة لا تقل عن {{reschedule_notice_hours}}، ويعتمد الموعد الجديد على توافر الفنيين."),
    t(14),
    part("Part 2: When Nobody Is Available", "الجزء الثاني: عند عدم تواجد أحد"),
    t(15),
    cl("What counts as a no-show", "ما يُعدّ عدم حضور", "A no-show is when the technician arrives at the agreed time and cannot start because nobody is available, access is not provided, or the access details are wrong, and the customer cannot be reached after reasonable attempts.", "يُعدّ عدم حضور أن يصل الفني في الموعد المتفق عليه ولا يستطيع البدء بسبب عدم تواجد أحد أو عدم تمكينه من الدخول أو خطأ بيانات الوصول، وتعذّر الاتصال بالعميل بعد محاولات معقولة."),
    t(18),
    cl("No-show charge", "رسوم عدم الحضور", "A no-show charge of {{no_show_fee}} may apply only if it was disclosed to the customer in advance, accepted where required, and permitted by law.", "قد تُطبَّق رسوم عدم حضور قدرها {{no_show_fee}} فقط إذا أُفصح عنها للعميل مسبقًا ووافق عليها عند اللزوم وكان القانون يسمح بها."),
    part("Part 3: If We Are Late", "الجزء الثالث: عند تأخرنا"),
    cl("Late arrival of the technician", "تأخر وصول الفني", "If the technician is going to be late, we will tell the customer as soon as we can. If the delay is longer than {{late_arrival_minutes}} minutes, the customer may choose to wait, move the appointment or cancel, without any rescheduling, cancellation or no-show charge.", "إذا تأخر الفني، سنبلغ العميل بذلك في أقرب وقت. وإذا زاد التأخير على {{late_arrival_minutes}} دقيقة، يحق للعميل أن ينتظر أو يغيّر الموعد أو يلغيه دون أي رسوم إعادة جدولة أو إلغاء أو عدم حضور."),
  ],
  related: ["booking-policy", "cancellation-policy", "terms-and-conditions"],
  seoTitleEn: "Rescheduling & No-Show Policy | OSTA Services UAE", seoTitleAr: "سياسة إعادة الجدولة وعدم الحضور | خدمات أسطا الإمارات",
  seoDescEn: "How to move an OSTA Services appointment, what counts as a no-show, and what happens if the technician is late.",
  seoDescAr: "كيفية تغيير موعد خدمات أسطا وما يُعدّ عدم حضور وماذا يحدث إذا تأخر الفني.",
};

// ---- 6. Refund & Compensation Policy ----
const refund: SeedDoc = {
  number: 6, slug: "refund-policy", cat: "A", kind: "POLICY",
  titleEn: "Refund & Compensation Policy", titleAr: "سياسة الاسترداد والتعويضات",
  summaryEn: "How refund and compensation requests are handled.",
  summaryAr: "كيفية التعامل مع طلبات الاسترداد والتعويض.",
  introEn: "This policy explains how {{brand_name_en}} handles refund and compensation requests. It does not remove any refund, repair, replacement or other remedy the customer is entitled to under UAE law.",
  introAr: "توضّح هذه السياسة كيف تتعامل {{brand_name_ar}} مع طلبات الاسترداد والتعويض. ولا تُسقط أي حق في الاسترداد أو الإصلاح أو الاستبدال أو غيرها من وسائل الانتصاف التي يكفلها القانون الإماراتي للعميل.",
  sections: [
    part("Part 1: Refunds", "الجزء الأول: الاسترداد"),
    t(66), t(67),
    cl("How to ask for a refund", "كيفية طلب الاسترداد", "Send the request to {{support_email}} or {{support_phone}} with the invoice number, the booking reference and the reason. We may ask for photographs or other supporting information.", "أرسل الطلب إلى {{support_email}} أو {{support_phone}} مع رقم الفاتورة ورقم الحجز وسبب الطلب. وقد نطلب صورًا أو معلومات داعمة أخرى."),
    cl("Our response", "ردّنا على الطلب", "We will review the request and reply within {{refund_review_days}}. If a refund is approved, we will pay it within {{refund_payment_days}} of the decision, to the original payment method where possible.", "سنراجع الطلب ونرد خلال {{refund_review_days}}. وإذا اعتُمد الاسترداد فسندفعه خلال {{refund_payment_days}} من القرار، وإلى وسيلة الدفع الأصلية متى أمكن."),
    t(64),
    t(68), t(69),
    part("Part 2: Compensation", "الجزء الثاني: التعويض"),
    t(76), t(77),
    cl("Claiming for damage", "المطالبة عن الأضرار", "A customer who believes work caused damage should tell us as soon as possible, with photographs and a description, so we can inspect and respond. Delay may make it harder to establish what happened.", "على العميل الذي يعتقد أن العمل تسبب بضرر أن يبلغنا بأسرع وقت مع الصور والوصف لنتمكن من المعاينة والرد. وقد يصعّب التأخير إثبات ما حدث."),
  ],
  related: ["cancellation-policy", "service-warranty", "complaints-policy", "terms-and-conditions"],
  seoTitleEn: "Refund & Compensation Policy | OSTA Services UAE", seoTitleAr: "سياسة الاسترداد والتعويضات | خدمات أسطا الإمارات",
  seoDescEn: "How OSTA Services handles refund and compensation requests: how to ask, how we respond and what rights always apply.",
  seoDescAr: "كيف تتعامل خدمات أسطا مع طلبات الاسترداد والتعويض: كيفية الطلب وكيف نرد والحقوق التي تسري دائمًا.",
};

// ---- 7. Pricing, Quotations & Estimates Policy ----
const pricing: SeedDoc = {
  number: 7, slug: "pricing-policy", cat: "A", kind: "POLICY",
  titleEn: "Pricing, Quotations & Estimates Policy", titleAr: "سياسة الأسعار وعروض الأسعار",
  summaryEn: "How prices, visit charges, quotations and extra work are set and approved.",
  summaryAr: "كيف تُحدَّد الأسعار ورسوم الزيارة وعروض الأسعار والأعمال الإضافية وتُعتمد.",
  introEn: "This policy explains how {{brand_name_en}} prices its services, when a visit charge applies, and how quotations and extra work are approved before they are charged.",
  introAr: "توضّح هذه السياسة كيف تسعّر {{brand_name_ar}} خدماتها ومتى تُطبَّق رسوم الزيارة وكيف تُعتمد عروض الأسعار والأعمال الإضافية قبل احتسابها.",
  sections: [
    part("Part 1: Prices and Quotations", "الجزء الأول: الأسعار وعروض الأسعار"),
    t(21), t(22), t(23), t(24),
    cl("Currency and taxes", "العملة والضرائب", "Prices are in UAE dirhams (AED). Whether value-added tax applies, and how it is shown, is stated in the quotation or invoice.", "الأسعار بالدرهم الإماراتي. ويُبيَّن في عرض السعر أو الفاتورة ما إذا كانت ضريبة القيمة المضافة تنطبق وكيف تظهر."),
    cl("How long a quotation is valid", "مدة صلاحية عرض السعر", "A quotation is valid for {{quotation_validity_days}} from its date unless it says otherwise. After that the price, availability and materials may change.", "يكون عرض السعر ساريًا لمدة {{quotation_validity_days}} من تاريخه ما لم يُذكر خلاف ذلك. وبعدها قد تتغير الأسعار والتوافر والمواد."),
    part("Part 2: Extra Work, Parts and Offers", "الجزء الثاني: الأعمال الإضافية والقطع والعروض"),
    t(25), t(26), t(27), t(28), t(29),
    part("Part 3: Questions About a Price", "الجزء الثالث: الاستفسار عن السعر"),
    t(30),
  ],
  related: ["booking-policy", "refund-policy", "terms-and-conditions", "corporate-payment-terms"],
  seoTitleEn: "Pricing, Quotations & Estimates Policy | OSTA Services UAE", seoTitleAr: "سياسة الأسعار وعروض الأسعار | خدمات أسطا الإمارات",
  seoDescEn: "How OSTA Services prices work: visit charge, quotations before repair, extra work approval, parts and promotional offers.",
  seoDescAr: "كيف تُحدَّد أسعار خدمات أسطا: رسوم الزيارة وعروض الأسعار قبل التصليح واعتماد الأعمال الإضافية والقطع والعروض الترويجية.",
};

// ---- 8. Customer Rights & Responsibilities ----
const rights: SeedDoc = {
  number: 8, slug: "customer-rights", cat: "A", kind: "POLICY",
  titleEn: "Customer Rights & Responsibilities", titleAr: "حقوق ومسؤوليات العملاء",
  summaryEn: "What customers can expect from OSTA, and what OSTA needs from customers.",
  summaryAr: "ما يمكن للعملاء توقعه من أسطا، وما تحتاجه أسطا من العملاء.",
  introEn: "This page sets out in plain words what you can expect from {{brand_name_en}} and what we need from you so the work can be done safely and well.",
  introAr: "توضّح هذه الصفحة بلغة بسيطة ما يمكنك توقعه من {{brand_name_ar}} وما نحتاجه منك ليتم العمل بأمان وجودة.",
  sections: [
    part("Part 1: Your Rights", "الجزء الأول: حقوقك"),
    cl("Clear information", "المعلومات الواضحة", "You have the right to clear information about the service, the price, any visit charge, the warranty and the policies that apply, before you approve the work.", "يحق لك الحصول على معلومات واضحة عن الخدمة والسعر وأي رسوم زيارة والضمان والسياسات المطبقة قبل أن توافق على العمل."),
    cl("A record of the job", "سجل للعمل", "You have the right to a quotation, invoice or other written record of what was agreed and what was done.", "يحق لك الحصول على عرض سعر أو فاتورة أو سجل مكتوب لما تم الاتفاق عليه وما تم تنفيذه."),
    cl("Safe, careful work", "عمل آمن وبعناية", "You have the right to work carried out with reasonable skill and care, by technicians who respect your home and your belongings.", "يحق لك الحصول على عمل منفّذ بمهارة وعناية معقولتين من فنيين يحترمون منزلك وممتلكاتك."),
    cl("Privacy", "الخصوصية", "You have the right to have your personal data handled as described in our Privacy Policy and Personal Data Protection Policy.", "يحق لك أن تُعالَج بياناتك الشخصية وفق ما هو موضّح في سياسة الخصوصية وسياسة حماية البيانات الشخصية."),
    cl("To complain", "تقديم الشكوى", "You have the right to complain and to have your complaint looked at, as described in our Complaints & Dispute Resolution Policy.", "يحق لك تقديم شكوى والنظر فيها وفق ما هو موضّح في سياسة الشكاوى وتسوية النزاعات."),
    t(40), t(60), t(93),
    part("Part 2: Your Responsibilities", "الجزء الثاني: مسؤولياتك"),
    t(31), t(32), t(33), t(34), t(36), t(37), t(15),
  ],
  related: ["terms-and-conditions", "complaints-policy", "privacy-policy", "health-and-safety"],
  seoTitleEn: "Customer Rights & Responsibilities | OSTA Services UAE", seoTitleAr: "حقوق ومسؤوليات العملاء | خدمات أسطا الإمارات",
  seoDescEn: "Your rights as an OSTA Services customer and what we need from you so work can be done safely and well.",
  seoDescAr: "حقوقك كعميل لدى خدمات أسطا وما نحتاجه منك ليتم العمل بأمان وجودة.",
};

export const CATEGORY_A: SeedDoc[] = [terms, csa, booking, cancellation, rescheduling, refund, pricing, rights];
void TERMS; void live;
