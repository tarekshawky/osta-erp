// The Maintenance Service Agreement's fixed content: the company's details, the customer's acceptance statements and the standard
// Terms & Conditions. The terms are only the STARTING point: the admin edits and versions them (Contracts -> Terms), and every
// agreement stores the exact text its customer accepted, so a later edit never changes an old agreement.

export const COMPANY = {
  name: "Ostaa Technical Services Co. L.L.C S.O.C.",
  brand: "OSTA Services",
  website: "www.ostaservices.com",
  websiteUrl: "https://www.ostaservices.com",
  phone: "0568676036",
  currency: "AED",
  // Every agreement runs for this long from the day it is activated, unless the contract says otherwise.
  durationMonths: 12,
} as const;

export type Bi = { en: string; ar: string };

// The five statements the customer must tick before the request can be sent.
export const AGREEMENT_CHECKS: Bi[] = [
  { en: "I confirm that all customer and property information provided is accurate.", ar: "أقر بأن جميع بياناتي وبيانات العقار التي أدخلتها صحيحة." },
  { en: "I have reviewed and agree to the selected package, service scope, quantities, property location and pricing.", ar: "أوافق على الباقة والخدمات والكميات والموقع والأسعار الموضحة في الاتفاقية." },
  { en: "I have read and accepted the Terms & Conditions and Maintenance Service Agreement.", ar: "أقر بأنني قرأت الشروط والأحكام ووافقت عليها." },
  { en: "I understand that services and quantities outside the agreed package will be charged separately.", ar: "أوافق على أن أي خدمات أو أعمال أو كميات إضافية خارج نطاق الباقة يتم احتسابها برسوم منفصلة." },
  { en: "I understand that the package is assigned to the registered property and cannot be transferred to another property or location without OSTA's written approval.", ar: "أفهم أن الباقة مخصصة للعقار والموقع المسجلين في الاتفاقية ولا يجوز نقلها إلى عقار أو موقع آخر دون موافقة كتابية مسبقة من شركة OSTA." },
];

export type Clause = { key: string; titleEn: string; titleAr: string; bodyEn: string; bodyAr: string };

// A clause body is plain text: paragraphs are separated by a blank line, and a line that starts with "- " is a bullet.
export const DEFAULT_CLAUSES: Clause[] = [
  {
    key: "scope", titleEn: "Agreement Scope", titleAr: "نطاق الاتفاقية",
    bodyEn: "The services provided by the Company are limited to the services, quantities, visits and works expressly specified in the approved package and agreement.\n\nAny service not mentioned in the agreement is outside the scope of the contract and is not automatically included.",
    bodyAr: "تقتصر الخدمات التي تقدمها الشركة على الخدمات والكميات والزيارات والأعمال المحددة صراحةً في الباقة والاتفاقية المعتمدة.\n\nأي خدمة غير مذكورة في الاتفاقية تعتبر خارج نطاق العقد ولا تكون مشمولة تلقائياً.",
  },
  {
    key: "registered-property", titleEn: "Registered Property Only", titleAr: "العقار المسجل فقط",
    bodyEn: "The agreement is linked to the property and address specified in the request details.\n\nThe package may not be used for another property, or transferred to another location, branch or residential unit.\n\nThe agreement may not be transferred or assigned to another party without the prior written approval of OSTA Services.\n\nAny request to change the service location is subject to the Company's approval and may require additional fees or a new agreement.",
    bodyAr: "الاتفاقية مرتبطة بالعقار والعنوان المحددين في بيانات الطلب.\n\nلا يجوز استخدام الباقة في عقار آخر أو نقلها إلى موقع آخر أو فرع آخر أو وحدة سكنية أخرى.\n\nلا يجوز نقل الاتفاقية أو التنازل عنها لطرف آخر دون موافقة كتابية مسبقة من OSTA Services.\n\nأي طلب لتغيير موقع الخدمة يخضع لموافقة الشركة وقد يتطلب رسوماً إضافية أو اتفاقية جديدة.",
  },
  {
    key: "non-refundable", titleEn: "Non-Refundable Policy", titleAr: "سياسة عدم استرداد المبالغ",
    bodyEn: "After the agreement is activated and the services begin, the Customer may not claim a refund for services that have been provided, reserved, or for which resources have been allocated. Any refund or cancellation is subject to the mandatory rights provided under the laws in force in the United Arab Emirates.\n\nThe Customer's non-use of the visits or services included in the package does not entitle the Customer to compensation or an automatic refund, provided the Company has made the service available for execution in accordance with the agreement.\n\nAny exception or financial settlement requires the Company's written approval, subject to the law.",
    bodyAr: "بعد تفعيل الاتفاقية وبدء تقديم الخدمات، لا يجوز للعميل المطالبة باسترداد قيمة الخدمات التي تم تقديمها أو حجزها أو تخصيص موارد لها، ويخضع أي استرداد أو إلغاء للحقوق الإلزامية المقررة بموجب القوانين المعمول بها في دولة الإمارات العربية المتحدة.\n\nلا يترتب على عدم استخدام العميل للزيارات أو الخدمات المشمولة في الباقة استحقاق تعويض أو استرداد تلقائي، متى كانت الشركة قد أتاحت تنفيذ الخدمة وفقاً للاتفاقية.\n\nأي استثناء أو تسوية مالية يكون بموافقة كتابية من الشركة، مع مراعاة القانون.",
  },
  {
    key: "additional-work", titleEn: "Additional Work & Out-of-Scope Services", titleAr: "الأعمال الإضافية",
    bodyEn: "Any works, services, visits or quantities exceeding what is specified in the agreement are not included in the package price.\n\nThese include, without limitation:\n- Additional AC units beyond the agreed number.\n- Additional visits.\n- Additional working hours.\n- Repairs that are not included.\n- Installation or replacement works.\n- Extensions or modifications.\n- Additional plumbing or electrical works.\n- Cleaning or services not listed in the package.\n\nA separate quotation is provided to the Customer, and additional works are carried out only after the Customer approves the price.",
    bodyAr: "أي أعمال أو خدمات أو زيارات أو كميات تتجاوز ما هو محدد في الاتفاقية لا تدخل ضمن قيمة الباقة.\n\nوتشمل على سبيل المثال لا الحصر:\n- وحدات تكييف إضافية عن العدد المتفق عليه.\n- زيارات إضافية.\n- ساعات عمل إضافية.\n- إصلاحات غير مشمولة.\n- أعمال تركيب أو استبدال.\n- تمديدات أو تعديلات.\n- أعمال سباكة أو كهرباء إضافية.\n- تنظيف أو خدمات غير مدرجة في الباقة.\n\nيتم تقديم عرض سعر منفصل للعميل، ولا يتم تنفيذ الأعمال الإضافية إلا بعد موافقته على السعر.",
  },
  {
    key: "spare-parts", titleEn: "Spare Parts & Consumables", titleAr: "قطع الغيار والمواد",
    bodyEn: "The package price does not include spare parts, appliances, compressors, refrigerant gas, consumables, replacement equipment or replacement works, unless expressly stated in the package details.\n\nAny spare parts or materials required are priced separately after the Customer's approval.",
    bodyAr: "لا تشمل قيمة الباقة قطع الغيار أو الأجهزة أو الكمبروسرات أو غاز التبريد أو المواد الاستهلاكية أو المعدات البديلة أو أعمال الاستبدال، إلا إذا تم ذكرها صراحةً في تفاصيل الباقة.\n\nأي قطع غيار أو مواد مطلوبة يتم تسعيرها بشكل منفصل بعد موافقة العميل.",
  },
  {
    key: "limitations", titleEn: "Service Limitations", titleAr: "حدود الخدمة",
    bodyEn: "The agreement does not provide unlimited repairs, unlimited visits or free spare parts.\n\nEach service is subject to the limits, quantities, number of visits and working hours stated in the agreement.\n\nThe Company is entitled to request the Customer's approval for any additional works exceeding these limits.",
    bodyAr: "لا تعني الاتفاقية توفير إصلاحات غير محدودة أو زيارات غير محدودة أو قطع غيار مجانية.\n\nكل خدمة تخضع للحدود والكميات وعدد الزيارات وساعات العمل الموضحة في الاتفاقية.\n\nيحق للشركة طلب موافقة العميل على أي أعمال إضافية تتجاوز هذه الحدود.",
  },
  {
    key: "appointments", titleEn: "Appointment & Access", titleAr: "المواعيد وإتاحة الدخول",
    bodyEn: "The Customer must give the technicians access to the property at the agreed appointment.\n\nIf the service cannot be carried out because the Customer is absent, access is not provided or the site is not ready, the visit may be treated as used or rescheduled in accordance with the appointment policy stated in the agreement, provided that the Customer has been informed of the terms in advance.",
    bodyAr: "يلتزم العميل بتوفير إمكانية دخول الفنيين إلى العقار في الموعد المتفق عليه.\n\nإذا تعذر تنفيذ الخدمة بسبب عدم وجود العميل أو عدم إتاحة الدخول أو عدم جاهزية الموقع، يجوز اعتبار الزيارة مستهلكة أو إعادة جدولتها وفق سياسة المواعيد الموضحة في الاتفاقية، بشرط إبلاغ العميل بالشروط مسبقاً.",
  },
  {
    key: "customer-responsibilities", titleEn: "Customer Responsibilities", titleAr: "مسؤوليات العميل",
    bodyEn: "The Customer undertakes to:\n- Provide accurate information about the property and the existing systems.\n- Inform the Company of any faults, hazards or special conditions.\n- Provide safe access to the equipment and work locations.\n- Not conceal previous faults or unapproved modifications that affect the service.\n- Approve quotations for additional works before they are carried out.\n- Pay the amounts due in accordance with the agreement.",
    bodyAr: "يلتزم العميل بما يلي:\n- تقديم معلومات صحيحة عن العقار والأنظمة الموجودة.\n- إبلاغ الشركة بأي أعطال أو مخاطر أو ظروف خاصة.\n- توفير الوصول الآمن إلى الأجهزة ومواقع العمل.\n- عدم إخفاء أعطال سابقة أو تعديلات غير معتمدة تؤثر على الخدمة.\n- اعتماد عروض الأسعار للأعمال الإضافية قبل تنفيذها.\n- سداد المبالغ المستحقة وفقاً للاتفاقية.",
  },
  {
    key: "pre-existing", titleEn: "Pre-existing Conditions", titleAr: "الأعطال السابقة",
    bodyEn: "The Company is not responsible for faults that existed before the start of the agreement, hidden defects, damage resulting from previous works or interference by other parties, unless the damage results from a proven breach by the Company while carrying out its services.\n\nPre-existing conditions are documented in the inspection report where necessary.",
    bodyAr: "لا تتحمل الشركة مسؤولية الأعطال الموجودة قبل بدء الاتفاقية أو العيوب المخفية أو التلف الناتج عن أعمال سابقة أو تدخل أطراف أخرى، إلا إذا كان الضرر ناتجاً عن إخلال مثبت من الشركة أثناء تنفيذ خدماتها.\n\nويتم توثيق الحالات السابقة عند الحاجة في تقرير الفحص.",
  },
  {
    key: "third-party-equipment", titleEn: "Third-Party Equipment & Existing Defects", titleAr: "المعدات والعيوب القائمة",
    bodyEn: "The Company does not guarantee the lifespan of existing appliances, equipment or systems, and is not responsible for faults resulting from the end of their service life, misuse, manufacturing defects, poor design or non-compliant previous installations, unless the damage results from a proven error by the Company.",
    bodyAr: "لا تضمن الشركة عمر الأجهزة أو المعدات أو الأنظمة القائمة ولا تتحمل مسؤولية الأعطال الناتجة عن انتهاء العمر الافتراضي أو سوء الاستخدام أو عيوب التصنيع أو ضعف التصميم أو عدم مطابقة التركيبات السابقة، ما لم يكن الضرر ناتجاً عن خطأ مثبت من الشركة.",
  },
  {
    key: "warranty", titleEn: "Warranty", titleAr: "الضمان",
    bodyEn: "Any warranty on works carried out is according to the warranty period and scope stated in the agreement or the related work invoice.\n\nThe warranty does not cover faults resulting from misuse, tampering, interference by another party, electrical fluctuations or external conditions, unless the law or the agreement provides otherwise.",
    bodyAr: "أي ضمان على الأعمال المنفذة يكون وفق مدة ونطاق الضمان المحددين في الاتفاقية أو فاتورة العمل ذات الصلة.\n\nلا يشمل الضمان الأعطال الناتجة عن سوء الاستخدام أو العبث أو تدخل طرف آخر أو التقلبات الكهربائية أو الظروف الخارجية، ما لم ينص القانون أو الاتفاق على خلاف ذلك.",
  },
  {
    key: "emergency", titleEn: "Emergency Services", titleAr: "خدمات الطوارئ",
    bodyEn: "Receiving emergency reports or giving response priority does not mean immediate arrival is guaranteed in all circumstances.\n\nResponse times are subject to the agreed package, the area, technician availability and access conditions, and any specific SLA must be clearly stated in the agreement.",
    bodyAr: "استقبال بلاغات الطوارئ أو أولوية الاستجابة لا يعني ضمان الوصول الفوري في جميع الظروف.\n\nتخضع أوقات الاستجابة للباقة المتفق عليها والمنطقة وتوفر الفنيين وظروف الوصول، وأي SLA محدد يجب أن يذكر بوضوح في الاتفاقية.",
  },
  {
    key: "exclusions", titleEn: "Service Exclusions", titleAr: "الأعمال المستثناة",
    bodyEn: "The agreement does not include construction works, structural modifications, demolition, rebuilding, full renovation or replacement of main systems, unless agreed in writing with a separate quotation.",
    bodyAr: "لا تشمل الاتفاقية أعمال الإنشاءات والتعديلات الهيكلية والتكسير وإعادة البناء والتجديد الكامل أو استبدال الأنظمة الرئيسية، ما لم يتم الاتفاق عليها كتابياً وبعرض سعر منفصل.",
  },
  {
    key: "suspension", titleEn: "Suspension for Non-Payment", titleAr: "تعليق الخدمة لعدم السداد",
    bodyEn: "If amounts due are not paid, the Company may suspend services not yet carried out, after notifying the Customer and allowing a reasonable period in accordance with the agreement and applicable law.",
    bodyAr: "في حال عدم سداد المبالغ المستحقة، يجوز للشركة تعليق الخدمات غير المنفذة بعد إخطار العميل ومنحه المهلة المناسبة وفقاً للاتفاقية والقانون المعمول به.",
  },
  {
    key: "duration", titleEn: "Contract Duration & Expiry", titleAr: "مدة الاتفاقية وانتهاؤها",
    bodyEn: "The agreement term is 12 months from the activation date, unless a different term is specified in the contract.\n\nThe included services end when the agreement term ends, and the agreement does not renew automatically except with the approval of both parties under a clear renewal mechanism.",
    bodyAr: "تكون مدة الاتفاقية 12 شهراً من تاريخ التفعيل، ما لم يتم تحديد مدة مختلفة في العقد.\n\nتنتهي الخدمات المشمولة بانتهاء مدة الاتفاقية، ولا يتم التجديد تلقائياً إلا بموافقة الطرفين وفق آلية تجديد واضحة.",
  },
  {
    key: "liability", titleEn: "Liability", titleAr: "المسؤولية",
    bodyEn: "The Company is liable for proven direct damages resulting from its breach of its obligations or from the error of its employees while carrying out the work, in accordance with applicable law.\n\nNo provision of the agreement shall be interpreted as exempting the Company from liability that the law does not permit to be excluded or limited.",
    bodyAr: "تتحمل الشركة مسؤولية الأضرار المباشرة المثبتة الناتجة عن إخلالها بالتزاماتها أو خطأ موظفيها أثناء تنفيذ العمل، وفقاً للقانون المعمول به.\n\nلا يجوز تفسير أي بند في الاتفاقية على أنه إعفاء للشركة من مسؤولية لا يسمح القانون باستبعادها أو الحد منها.",
  },
  {
    key: "governing-law", titleEn: "Governing Law & Disputes", titleAr: "القانون وتسوية النزاعات",
    bodyEn: "The agreement is governed by the laws in force in the United Arab Emirates.\n\nThe parties shall first seek to settle any dispute amicably, and if that is not possible, the competent judicial authorities shall be approached in accordance with the applicable legal rules.",
    bodyAr: "تخضع الاتفاقية للقوانين المعمول بها في دولة الإمارات العربية المتحدة.\n\nيسعى الطرفان أولاً إلى تسوية أي نزاع ودياً، وفي حال تعذر ذلك يتم اللجوء إلى الجهات القضائية المختصة وفقاً للقواعد القانونية المعمول بها.",
  },
  {
    key: "electronic-acceptance", titleEn: "Electronic Acceptance", titleAr: "الموافقة الإلكترونية",
    bodyEn: "The Customer's electronic acceptance of the agreement and the terms and conditions, after being given the opportunity to review them, constitutes an electronic record of the Customer's approval of the request, the scope of services and the prices.\n\nThe record of acceptance, its date and time, the agreement number and the accepted terms version are retained.\n\nThis acceptance does not replace any signature or notarisation requirements that the law makes mandatory.",
    bodyAr: "تعد موافقة العميل الإلكترونية على الاتفاقية والشروط والأحكام، بعد إتاحة الاطلاع عليها، سجلاً إلكترونياً لموافقته على الطلب ونطاق الخدمات والأسعار.\n\nيتم الاحتفاظ بسجل الموافقة وتاريخها ووقت إتمامها ورقم الاتفاقية وإصدار الشروط المقبول.\n\nولا تحل هذه الموافقة محل أي متطلبات توقيع أو توثيق إلزامية يفرضها القانون.",
  },
];

// Who does what, drawn from the clauses above (the "Responsibilities" table of the PDF).
export const RESPONSIBILITIES: { party: "customer" | "company"; en: string; ar: string }[] = [
  { party: "customer", en: "Provide accurate information about the property and its systems.", ar: "تقديم معلومات صحيحة عن العقار وأنظمته." },
  { party: "customer", en: "Inform OSTA of any faults, hazards or special conditions.", ar: "إبلاغ OSTA بأي أعطال أو مخاطر أو ظروف خاصة." },
  { party: "customer", en: "Give technicians safe access at the agreed appointment.", ar: "تمكين الفنيين من الدخول بأمان في الموعد المتفق عليه." },
  { party: "customer", en: "Approve quotations for additional work before it is carried out.", ar: "اعتماد عروض الأسعار للأعمال الإضافية قبل تنفيذها." },
  { party: "customer", en: "Pay the amounts due under the agreement.", ar: "سداد المبالغ المستحقة وفقاً للاتفاقية." },
  { party: "company", en: "Carry out the included services within the stated limits, quantities and visits.", ar: "تنفيذ الخدمات المشمولة ضمن الحدود والكميات والزيارات المحددة." },
  { party: "company", en: "Provide a separate quotation, and wait for approval, before any additional work.", ar: "تقديم عرض سعر منفصل وانتظار الموافقة قبل أي أعمال إضافية." },
  { party: "company", en: "Document pre-existing conditions in an inspection report where necessary.", ar: "توثيق الحالات السابقة في تقرير الفحص عند الحاجة." },
  { party: "company", en: "Respond to emergency reports as set out in the agreed package.", ar: "الاستجابة لبلاغات الطوارئ وفق الباقة المتفق عليها." },
  { party: "company", en: "Answer for proven direct damage caused by its breach or its employees' error.", ar: "تحمل مسؤولية الأضرار المباشرة المثبتة الناتجة عن إخلالها أو خطأ موظفيها." },
];

// The message sent with the payment link (spec wording).
export const PAYMENT_MESSAGE: Bi = {
  en: "Your OSTA maintenance agreement has been reviewed and approved. Please complete your payment using the secure payment link below to activate your maintenance package.",
  ar: "تمت مراجعة واعتماد اتفاقية الصيانة الخاصة بك. يرجى إتمام الدفع من خلال رابط الدفع التالي لتفعيل باقتك.",
};
