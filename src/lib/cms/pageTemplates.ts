import type { Block } from "./blocks";
import { LIBRARY, createFromLibrary } from "./blockLibrary";

// Ready-made page structures (Page Templates). Every template is a list of ordinary blocks built from the block library, so after
// importing one the administrator can edit, delete, reorder or replace any block. The text is a suggestion to be rewritten: it
// makes no promises about prices, timings, reviews or numbers, and the prices, pictures and testimonials are left for you to add.

export type TemplateCategory = "services" | "sales" | "company";
export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "services", label: "Service pages" },
  { id: "sales", label: "Offers & sales" },
  { id: "company", label: "Company & contact" },
];

export type PageTemplate = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string; // a Lucide icon name
  // Suggested search-engine text, shown after import so it can be copied into the page's SEO settings.
  seo: { titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string };
  build: () => Block[];
};

const bi = (en: string, ar: string) => ({ en, ar });
const none = bi("", "");
const cta = (en: string, ar: string, url: string) => ({ label: bi(en, ar), url });

function make(entryId: string, patch: Record<string, unknown> = {}): Block {
  const entry = LIBRARY.find((e) => e.id === entryId);
  if (!entry) throw new Error(`Unknown library block: ${entryId}`);
  const b = createFromLibrary(entry);
  return { ...b, props: { ...b.props, ...patch } };
}

const BOOK = "/pricing";
const CONTACT = "/contact";

const hero = (eyebrow: [string, string], heading: [string, string], subtitle: [string, string]) =>
  make("hero", { variant: "landing", align: "start", eyebrow: bi(...eyebrow), heading: bi(...heading), subtitle: bi(...subtitle), ctas: [cta("Book now", "احجز الآن", BOOK), cta("Contact us", "تواصل معنا", CONTACT)] });

const faq = (heading: [string, string], items: [[string, string], [string, string]][]) =>
  make("faq", { heading: bi(...heading), items: items.map(([q, a]) => ({ question: bi(...q), answer: bi(...a) })) });

const GENERIC_ANSWER: [string, string] = ["Call or WhatsApp us and our team will confirm the details for you.", "اتصل بنا أو راسلنا على واتساب وسيؤكد لك فريقنا التفاصيل."];

const benefits = (heading: [string, string], items: [string, [string, string], [string, string]][], columns = "3") =>
  make("benefits", { heading: bi(...heading), columns, items: items.map(([icon, t, x]) => ({ icon, title: bi(...t), text: bi(...x) })) });

const steps = (items?: [string, [string, string], [string, string]][]) =>
  make("how-it-works", items ? { items: items.map(([icon, t, x]) => ({ icon, title: bi(...t), text: bi(...x), imageUrl: "" })) } : {});

const checkList = (heading: [string, string], items: [string, string][]) =>
  make("check-list", { heading: bi(...heading), columns: "2", items: items.map(([en, ar]) => ({ text: bi(en, ar), icon: "" })) });

// One generator for the service pages: they share a structure and differ in the service name and its suggested scope.
function servicePage(s: { name: [string, string]; tagline: [string, string]; included: [string, string][]; reasons: [string, [string, string]][] }): Block[] {
  return [
    hero(["Osta Services", "أوستا للخدمات"], s.name, s.tagline),
    make("trust-badges"),
    benefits(["Why choose Osta", "لماذا أوستا"], s.reasons.map(([icon, t]) => [icon, t, ["", ""]] as [string, [string, string], [string, string]])),
    checkList(["What is included", "ما الذي تشمله الخدمة"], s.included),
    make("service-showcase", { name: bi(...s.name), subtitle: bi(...s.tagline), features: s.included.slice(0, 4).map(([en, ar]) => ({ icon: "CheckCircle2", text: bi(en, ar) })), badge: "popular" }),
    steps(),
    make("testimonials", { items: [0, 1, 2].map(() => ({ text: none, name: none, role: none, rating: 5, imageUrl: "" })) }),
    faq(["Frequently asked questions", "الأسئلة الشائعة"], [
      [[`How do I book ${s.name[0].toLowerCase()}?`, `كيف أحجز ${s.name[1]}؟`], ["Book online in a few taps, or call or WhatsApp us.", "احجز أونلاين بخطوات بسيطة، أو اتصل بنا أو راسلنا على واتساب."]],
      [["What areas do you cover?", "ما المناطق التي تغطونها؟"], ["See the Service Areas on this site, or ask our team.", "راجع مناطق الخدمة في الموقع، أو اسأل فريقنا."]],
      [["Can I get a quote first?", "هل يمكنني الحصول على عرض سعر أولاً؟"], GENERIC_ANSWER],
    ]),
    make("contact-banner"),
  ];
}

const SERVICE_TRUST: [string, [string, string]][] = [["BadgeCheck", ["Verified technicians", "فنيون موثّقون"]], ["Clock", ["On-time visits", "التزام بالمواعيد"]], ["ShieldCheck", ["Service warranty", "ضمان على الخدمة"]], ["Award", ["Quality workmanship", "جودة في التنفيذ"]]];

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "ac-maintenance", name: "AC Maintenance Landing Page", category: "services", icon: "Fan",
    description: "A full landing page for AC maintenance: hero, benefits, what is included, steps, FAQ and booking.",
    seo: { titleEn: "AC Maintenance Service in the UAE | Osta Services", titleAr: "خدمة صيانة المكيفات في الإمارات | أوستا", descriptionEn: "Book AC maintenance online with Osta Services.", descriptionAr: "احجز صيانة المكيفات أونلاين مع أوستا للخدمات." },
    build: () => servicePage({
      name: ["AC Maintenance", "صيانة المكيفات"], tagline: ["Keep your air conditioning running well all year.", "حافظ على كفاءة مكيفك طوال العام."],
      included: [["Full inspection of the unit", "فحص شامل للوحدة"], ["Cleaning of filters and coils", "تنظيف الفلاتر والملفات"], ["Drainage check", "فحص التصريف"], ["Performance check", "فحص الأداء"]], reasons: SERVICE_TRUST,
    }),
  },
  {
    id: "ac-cleaning-promo", name: "AC Cleaning Promotion Page", category: "sales", icon: "Snowflake",
    description: "A promotion page for AC cleaning: announcement bar, offer with countdown, benefits, steps and booking.",
    seo: { titleEn: "AC Cleaning Offer | Osta Services", titleAr: "عرض تنظيف المكيفات | أوستا", descriptionEn: "Limited-time AC cleaning offer from Osta Services.", descriptionAr: "عرض محدود لتنظيف المكيفات من أوستا للخدمات." },
    build: () => [
      make("announcement", { text: bi("AC cleaning offer: book this week", "عرض تنظيف المكيفات: احجز هذا الأسبوع"), link: cta("Book now", "احجز الآن", BOOK), tone: "orange" }),
      hero(["Special offer", "عرض خاص"], ["AC Cleaning", "تنظيف المكيفات"], ["Cleaner air and a better-performing AC.", "هواء أنقى ومكيف بأداء أفضل."]),
      make("promo", { badge: bi("Limited offer", "عرض محدود"), heading: bi("AC cleaning offer", "عرض تنظيف المكيفات"), text: bi("Add the offer details, price and end date.", "أضف تفاصيل العرض والسعر وتاريخ الانتهاء."), cta: cta("Book now", "احجز الآن", BOOK) }),
      benefits(["Why clean your AC", "لماذا تنظف مكيفك"], [["Wind", ["Cleaner air", "هواء أنقى"], ["", ""]], ["Zap", ["Better performance", "أداء أفضل"], ["", ""]], ["Timer", ["Longer life", "عمر أطول"], ["", ""]]]),
      make("before-after"),
      steps(),
      faq(["Frequently asked questions", "الأسئلة الشائعة"], [[["How long does the offer last?", "كم تستمر مدة العرض؟"], ["See the end date shown in the offer above.", "راجع تاريخ الانتهاء الظاهر في العرض أعلاه."]], [["How do I book?", "كيف أحجز؟"], ["Book online, or call or WhatsApp us.", "احجز أونلاين، أو اتصل بنا أو راسلنا على واتساب."]]]),
      make("multi-cta"),
    ],
  },
  {
    id: "ac-repair", name: "AC Repair Service Page", category: "services", icon: "Wrench",
    description: "A service page for AC repair with fast-response messaging and a booking path.",
    seo: { titleEn: "AC Repair Service | Osta Services", titleAr: "خدمة تصليح المكيفات | أوستا", descriptionEn: "Book an AC repair technician with Osta Services.", descriptionAr: "احجز فني تصليح مكيفات مع أوستا للخدمات." },
    build: () => servicePage({
      name: ["AC Repair", "تصليح المكيفات"], tagline: ["Get your AC diagnosed and repaired.", "تشخيص وتصليح مكيفك."],
      included: [["Diagnosis of the problem", "تشخيص المشكلة"], ["Repair by a trained technician", "تصليح على يد فني مدرّب"], ["Testing after the repair", "اختبار بعد التصليح"], ["Clear advice on next steps", "نصيحة واضحة للخطوات التالية"]], reasons: SERVICE_TRUST,
    }),
  },
  {
    id: "duct-cleaning", name: "Duct Cleaning Service Page", category: "services", icon: "Wind",
    description: "A service page for air-duct cleaning with scope, process and FAQ.",
    seo: { titleEn: "Air Duct Cleaning | Osta Services", titleAr: "تنظيف مجاري الهواء | أوستا", descriptionEn: "Book air duct cleaning with Osta Services.", descriptionAr: "احجز تنظيف مجاري الهواء مع أوستا للخدمات." },
    build: () => servicePage({
      name: ["Duct Cleaning", "تنظيف مجاري الهواء"], tagline: ["Cleaner ducts for fresher air at home or work.", "مجاري هواء أنظف لهواء أنقى في المنزل أو العمل."],
      included: [["Inspection of the duct system", "فحص نظام المجاري"], ["Removal of dust and debris", "إزالة الغبار والأوساخ"], ["Cleaning of vents and grilles", "تنظيف الفتحات والشبكات"], ["Final check", "فحص نهائي"]], reasons: SERVICE_TRUST,
    }),
  },
  {
    id: "plumbing", name: "Plumbing Service Page", category: "services", icon: "Droplets",
    description: "A service page for plumbing repairs and installations.",
    seo: { titleEn: "Plumbing Services | Osta Services", titleAr: "خدمات السباكة | أوستا", descriptionEn: "Book a plumber with Osta Services.", descriptionAr: "احجز سباكاً مع أوستا للخدمات." },
    build: () => servicePage({
      name: ["Plumbing Services", "خدمات السباكة"], tagline: ["Leaks, blockages and installations handled properly.", "معالجة التسريبات والانسدادات والتركيبات بشكل صحيح."],
      included: [["Leak detection and repair", "كشف التسريبات وإصلاحها"], ["Unblocking drains", "فتح المجاري المسدودة"], ["Fixture installation", "تركيب التجهيزات"], ["Water heater service", "صيانة سخان المياه"]], reasons: SERVICE_TRUST,
    }),
  },
  {
    id: "water-tank", name: "Water Tank Cleaning Page", category: "services", icon: "Droplets",
    description: "A service page for water tank cleaning and sanitising.",
    seo: { titleEn: "Water Tank Cleaning | Osta Services", titleAr: "تنظيف خزانات المياه | أوستا", descriptionEn: "Book water tank cleaning with Osta Services.", descriptionAr: "احجز تنظيف خزانات المياه مع أوستا للخدمات." },
    build: () => servicePage({
      name: ["Water Tank Cleaning", "تنظيف خزانات المياه"], tagline: ["Clean storage for cleaner water.", "تخزين نظيف لمياه أنقى."],
      included: [["Draining and cleaning the tank", "تفريغ الخزان وتنظيفه"], ["Sanitising", "التعقيم"], ["Inspection of the tank", "فحص الخزان"], ["Refilling and final check", "إعادة التعبئة وفحص نهائي"]], reasons: SERVICE_TRUST,
    }),
  },
  {
    id: "electrical", name: "Electrical Maintenance Page", category: "services", icon: "Zap",
    description: "A service page for electrical repairs, installations and safety checks.",
    seo: { titleEn: "Electrical Maintenance | Osta Services", titleAr: "الصيانة الكهربائية | أوستا", descriptionEn: "Book an electrician with Osta Services.", descriptionAr: "احجز كهربائياً مع أوستا للخدمات." },
    build: () => servicePage({
      name: ["Electrical Maintenance", "الصيانة الكهربائية"], tagline: ["Safe electrical repairs and installations.", "إصلاحات وتركيبات كهربائية آمنة."],
      included: [["Fault finding", "كشف الأعطال"], ["Socket and switch repair", "إصلاح المقابس والمفاتيح"], ["Lighting installation", "تركيب الإنارة"], ["Safety check", "فحص السلامة"]], reasons: SERVICE_TRUST,
    }),
  },
  {
    id: "painting", name: "Painting Service Page", category: "services", icon: "PaintRoller",
    description: "A service page for interior and exterior painting with a gallery for finished work.",
    seo: { titleEn: "Painting Services | Osta Services", titleAr: "خدمات الدهان | أوستا", descriptionEn: "Book painters with Osta Services.", descriptionAr: "احجز دهانين مع أوستا للخدمات." },
    build: () => {
      const page = servicePage({
        name: ["Painting Services", "خدمات الدهان"], tagline: ["A fresh finish for your home or office.", "لمسة جديدة لمنزلك أو مكتبك."],
        included: [["Wall preparation", "تحضير الجدران"], ["Interior and exterior painting", "دهان داخلي وخارجي"], ["Clean-up after the work", "تنظيف بعد العمل"], ["Final walkthrough", "جولة فحص نهائية"]], reasons: SERVICE_TRUST,
      });
      page.splice(5, 0, make("gallery", { heading: bi("Our work", "أعمالنا") }));
      return page;
    },
  },
  {
    id: "home-maintenance", name: "Home Maintenance Page", category: "services", icon: "House",
    description: "An overview page for home maintenance with the live service catalogue and the price calculator.",
    seo: { titleEn: "Home Maintenance Services | Osta Services", titleAr: "خدمات صيانة المنازل | أوستا", descriptionEn: "Home maintenance services from Osta Services.", descriptionAr: "خدمات صيانة المنازل من أوستا للخدمات." },
    build: () => [
      hero(["Osta Services", "أوستا للخدمات"], ["Home Maintenance", "صيانة المنازل"], ["One team for the repairs and upkeep your home needs.", "فريق واحد لإصلاحات وصيانة منزلك."]),
      make("trust-badges"),
      make("services-grid", { heading: bi("Our services", "خدماتنا"), source: "catalogue", limit: 12 }),
      make("how-it-works"),
      make("price-calculator", { heading: bi("Get a price and book", "احصل على السعر واحجز") }),
      faq(["Frequently asked questions", "الأسئلة الشائعة"], [[["Which services can I book?", "ما الخدمات التي يمكنني حجزها؟"], ["See the services above, or ask our team.", "راجع الخدمات أعلاه، أو اسأل فريقنا."]], [["Can I book more than one service?", "هل يمكنني حجز أكثر من خدمة؟"], GENERIC_ANSWER]]),
      make("contact-banner"),
    ],
  },
  {
    id: "amc", name: "Annual Maintenance Contract Page", category: "sales", icon: "FileCheck",
    description: "Explains an annual maintenance contract: plans, comparison, how it works and an enquiry form.",
    seo: { titleEn: "Annual Maintenance Contracts | Osta Services", titleAr: "عقود الصيانة السنوية | أوستا", descriptionEn: "Annual maintenance contracts from Osta Services.", descriptionAr: "عقود الصيانة السنوية من أوستا للخدمات." },
    build: () => [
      hero(["Annual Maintenance Contract", "عقد الصيانة السنوي"], ["Maintenance, planned for the year", "صيانة مخطط لها طوال العام"], ["Scheduled visits and priority support under one contract.", "زيارات مجدولة ودعم ذو أولوية في عقد واحد."]),
      benefits(["Why a contract", "لماذا عقد صيانة"], [["CalendarCheck", ["Scheduled visits", "زيارات مجدولة"], ["", ""]], ["Headphones", ["Priority support", "دعم ذو أولوية"], ["", ""]], ["ClipboardCheck", ["One provider", "مزوّد واحد"], ["", ""]]]),
      make("pricing", { heading: bi("Choose a plan", "اختر الخطة"), plans: ["Basic|الأساسية", "Standard|القياسية", "Premium|المميزة"].map((n, i) => ({ name: bi(...(n.split("|") as [string, string])), price: "", period: bi("per year", "سنوياً"), description: none, features: [{ text: bi("Add what is included", "أضف ما تشمله الخطة") }], badge: i === 1 ? bi("Popular", "الأكثر طلباً") : none, highlighted: i === 1 ? "yes" : "no", cta: cta("Ask for a quote", "اطلب عرض سعر", CONTACT) })) }),
      make("comparison"),
      steps([["ClipboardCheck", ["Tell us what you have", "أخبرنا بما لديك"], ["", ""]], ["FileCheck", ["We prepare your plan", "نجهز خطتك"], ["", ""]], ["CalendarCheck", ["Visits are scheduled", "تُجدول الزيارات"], ["", ""]]]),
      faq(["Frequently asked questions", "الأسئلة الشائعة"], [[["What does a contract cover?", "ماذا يشمل العقد؟"], GENERIC_ANSWER], [["How do I start?", "كيف أبدأ؟"], ["Send us an enquiry and we will get back to you.", "أرسل لنا استفساراً وسنتواصل معك."]]]),
      make("form", { heading: bi("Request a contract quote", "اطلب عرض سعر لعقد"), intro: none }),
      make("contact-banner"),
    ],
  },
  {
    id: "commercial", name: "Commercial Services Page", category: "services", icon: "Building2",
    description: "A page for business customers: services, benefits, the catalogue and an enquiry form.",
    seo: { titleEn: "Commercial Maintenance Services | Osta Services", titleAr: "خدمات الصيانة التجارية | أوستا", descriptionEn: "Maintenance services for businesses from Osta Services.", descriptionAr: "خدمات صيانة للشركات من أوستا للخدمات." },
    build: () => [
      hero(["For businesses", "للشركات"], ["Commercial Services", "الخدمات التجارية"], ["Reliable maintenance for offices, shops and buildings.", "صيانة موثوقة للمكاتب والمحلات والمباني."]),
      benefits(["Built for business", "مصمم للأعمال"], [["ClipboardCheck", ["Planned maintenance", "صيانة مخططة"], ["", ""]], ["Headphones", ["Dedicated support", "دعم مخصص"], ["", ""]], ["Receipt", ["Clear paperwork", "مستندات واضحة"], ["", ""]]]),
      make("service-catalogue"),
      make("trust-badges"),
      make("logos", { heading: bi("Our clients", "عملاؤنا"), items: [] }),
      make("form", { heading: bi("Commercial enquiry", "استفسار تجاري"), intro: none }),
      make("contact-banner"),
    ],
  },
  {
    id: "residential", name: "Residential Services Page", category: "services", icon: "House",
    description: "A page for homeowners and tenants with the services grid, calculator and steps.",
    seo: { titleEn: "Residential Services | Osta Services", titleAr: "الخدمات السكنية | أوستا", descriptionEn: "Home services for villas and apartments from Osta Services.", descriptionAr: "خدمات منزلية للفلل والشقق من أوستا للخدمات." },
    build: () => [
      hero(["For homes", "للمنازل"], ["Residential Services", "الخدمات السكنية"], ["Care for your villa or apartment, booked online.", "عناية بفيلتك أو شقتك، تحجزها أونلاين."]),
      make("services-grid", { heading: bi("Services for your home", "خدمات لمنزلك"), source: "catalogue", limit: 8 }),
      steps(),
      make("price-calculator"),
      make("why-choose"),
      faq(["Frequently asked questions", "الأسئلة الشائعة"], [[["Do I need to be at home?", "هل يجب أن أكون في المنزل؟"], GENERIC_ANSWER], [["How do I pay?", "كيف أدفع؟"], ["Ask our team about the payment options.", "اسأل فريقنا عن خيارات الدفع."]]]),
      make("multi-cta"),
    ],
  },
  {
    id: "product-sales", name: "Product Sales Page", category: "sales", icon: "ShoppingBag",
    description: "A product page: featured product, product cards, comparison and a quick way to order.",
    seo: { titleEn: "Products | Osta Services", titleAr: "المنتجات | أوستا", descriptionEn: "Products from Osta Services.", descriptionAr: "منتجات من أوستا للخدمات." },
    build: () => [
      make("announcement", { text: bi("New products available", "منتجات جديدة متوفرة"), link: cta("See them", "شاهدها", "#products"), tone: "blue" }),
      make("heading-subtitle", { eyebrow: bi("Products", "المنتجات"), heading: bi("Our products", "منتجاتنا"), subtitle: bi("Choose what suits you.", "اختر ما يناسبك.") }),
      make("product-showcase", { style: { anchorId: "products" }, name: bi("Featured product", "المنتج المميز"), badge: "featured", secondaryType: "quote" }),
      make("product-cards", { heading: bi("More products", "منتجات أخرى") }),
      make("comparison", { heading: bi("Compare products", "قارن بين المنتجات") }),
      make("benefits", { heading: bi("Why buy from Osta", "لماذا تشتري من أوستا") }),
      faq(["Frequently asked questions", "الأسئلة الشائعة"], [[["How do I order?", "كيف أطلب؟"], ["Use the buttons on the product, or call or WhatsApp us.", "استخدم الأزرار في المنتج، أو اتصل بنا أو راسلنا على واتساب."]], [["Is installation available?", "هل التركيب متوفر؟"], GENERIC_ANSWER]]),
      make("contact-banner"),
    ],
  },
  {
    id: "branch", name: "Branch Landing Page", category: "company", icon: "MapPin",
    description: "A landing page for a branch or emirate: its locations, contact details, services and FAQ.",
    seo: { titleEn: "Osta Services Branch | Osta Services", titleAr: "فرع أوستا للخدمات | أوستا", descriptionEn: "Visit or contact our branch.", descriptionAr: "زر فرعنا أو تواصل معه." },
    build: () => [
      hero(["Our branch", "فرعنا"], ["Osta Services near you", "أوستا للخدمات بالقرب منك"], ["Find our address, hours and the services we offer here.", "اعثر على عنواننا وساعات العمل والخدمات التي نقدمها هنا."]),
      make("locations"),
      make("contact-cards"),
      make("services-grid", { heading: bi("Services in this area", "الخدمات في هذه المنطقة"), source: "catalogue", limit: 8 }),
      faq(["Frequently asked questions", "الأسئلة الشائعة"], [[["Which areas do you serve from here?", "ما المناطق التي تخدمونها من هنا؟"], GENERIC_ANSWER], [["How do I book?", "كيف أحجز؟"], ["Book online, or call or WhatsApp us.", "احجز أونلاين، أو اتصل بنا أو راسلنا على واتساب."]]]),
      make("multi-cta"),
    ],
  },
  {
    id: "special-offers", name: "Special Offers Page", category: "sales", icon: "BadgePercent",
    description: "A page listing your current offers with a highlighted deal, offer cards and how to claim.",
    seo: { titleEn: "Special Offers | Osta Services", titleAr: "العروض الخاصة | أوستا", descriptionEn: "Current offers from Osta Services.", descriptionAr: "العروض الحالية من أوستا للخدمات." },
    build: () => [
      make("announcement", { text: bi("See our current offers", "شاهد عروضنا الحالية"), link: cta("Book now", "احجز الآن", BOOK), tone: "orange" }),
      make("heading-subtitle", { eyebrow: bi("Offers", "العروض"), heading: bi("Special offers", "عروض خاصة"), subtitle: bi("Save on the services you need.", "وفّر على الخدمات التي تحتاجها.") }),
      make("promo"),
      make("service-cards", { heading: bi("More offers", "عروض أخرى") }),
      steps([["CalendarCheck", ["Choose an offer", "اختر عرضاً"], ["", ""]], ["MessageCircle", ["Book online or WhatsApp us", "احجز أونلاين أو راسلنا"], ["", ""]], ["CheckCircle2", ["We take care of the rest", "ونحن نتولى الباقي"], ["", ""]]]),
      faq(["Offer terms", "شروط العروض"], [[["How long do offers last?", "كم تستمر العروض؟"], ["Each offer shows its end date.", "يظهر لكل عرض تاريخ انتهائه."]], [["Can offers be combined?", "هل يمكن الجمع بين العروض؟"], GENERIC_ANSWER]]),
      make("contact-banner"),
    ],
  },
  {
    id: "about", name: "About Us Page", category: "company", icon: "Users",
    description: "Tells your story: introduction, values, team and a way to get in touch.",
    seo: { titleEn: "About Osta Services", titleAr: "عن أوستا للخدمات", descriptionEn: "Learn about Osta Services.", descriptionAr: "تعرّف على أوستا للخدمات." },
    build: () => [
      hero(["About us", "من نحن"], ["About Osta Services", "عن أوستا للخدمات"], ["Who we are and how we work.", "من نحن وكيف نعمل."]),
      make("image-text", { heading: bi("Our story", "قصتنا"), body: bi("Tell your story here.", "اكتب قصتك هنا.") }),
      make("benefits", { heading: bi("Our values", "قيمنا"), items: [{ icon: "HeartHandshake", title: bi("Care", "اهتمام"), text: none }, { icon: "Award", title: bi("Quality", "جودة"), text: none }, { icon: "Clock", title: bi("Reliability", "موثوقية"), text: none }] }),
      make("team"),
      make("trust-badges"),
      make("contact-banner"),
    ],
  },
  {
    id: "contact", name: "Contact Us Page", category: "company", icon: "Phone",
    description: "Contact details, locations and an enquiry form, all using your official details.",
    seo: { titleEn: "Contact Osta Services", titleAr: "تواصل مع أوستا للخدمات", descriptionEn: "Contact Osta Services by phone, WhatsApp or form.", descriptionAr: "تواصل مع أوستا للخدمات عبر الهاتف أو واتساب أو النموذج." },
    build: () => [
      make("heading-subtitle", { eyebrow: bi("Contact", "التواصل"), heading: bi("Contact us", "تواصل معنا"), subtitle: bi("We are happy to help.", "يسعدنا مساعدتك.") }),
      make("contact-cards"),
      make("form", { heading: bi("Send us a message", "أرسل لنا رسالة"), intro: none }),
      make("locations"),
      make("multi-cta"),
    ],
  },
  {
    id: "reviews", name: "Customer Reviews Page", category: "company", icon: "MessagesSquare",
    description: "A page for customer reviews: testimonials, trust badges and a prompt to share feedback.",
    seo: { titleEn: "Customer Reviews | Osta Services", titleAr: "آراء العملاء | أوستا", descriptionEn: "What customers say about Osta Services.", descriptionAr: "ماذا يقول العملاء عن أوستا للخدمات." },
    build: () => [
      make("heading-subtitle", { eyebrow: bi("Reviews", "الآراء"), heading: bi("What our customers say", "آراء عملائنا"), subtitle: none }),
      make("testimonials", { heading: none, items: [0, 1, 2, 3, 4, 5].map(() => ({ text: none, name: none, role: none, rating: 5, imageUrl: "" })) }),
      make("trust-badges"),
      make("cta", { heading: bi("Share your experience", "شاركنا تجربتك"), subtitle: none, button: cta("Contact us", "تواصل معنا", CONTACT) }),
    ],
  },
  {
    id: "careers", name: "Careers Page", category: "company", icon: "BriefcaseBusiness",
    description: "A careers page with reasons to join, the live list of open jobs and the hiring steps.",
    seo: { titleEn: "Careers | Osta Services", titleAr: "الوظائف | أوستا", descriptionEn: "Join the Osta Services team.", descriptionAr: "انضم إلى فريق أوستا للخدمات." },
    build: () => [
      hero(["Careers", "الوظائف"], ["Join our team", "انضم إلى فريقنا"], ["See the roles open right now.", "تعرّف على الوظائف المتاحة الآن."]),
      benefits(["Why work with us", "لماذا تعمل معنا"], [["Users", ["A supportive team", "فريق داعم"], ["", ""]], ["Award", ["Room to grow", "فرصة للتطور"], ["", ""]], ["Smile", ["A good place to work", "بيئة عمل جيدة"], ["", ""]]]),
      make("open-jobs"),
      steps([["ClipboardList", ["Apply online", "قدّم أونلاين"], ["", ""]], ["Phone", ["We contact you", "نتواصل معك"], ["", ""]], ["UserCheck", ["Join the team", "انضم للفريق"], ["", ""]]]),
      make("contact-banner"),
    ],
  },
  {
    id: "membership", name: "Membership Plans Page", category: "sales", icon: "BadgeCheck",
    description: "Membership plans with a comparison table, benefits and FAQ.",
    seo: { titleEn: "Membership Plans | Osta Services", titleAr: "خطط العضوية | أوستا", descriptionEn: "Membership plans from Osta Services.", descriptionAr: "خطط العضوية من أوستا للخدمات." },
    build: () => [
      hero(["Membership", "العضوية"], ["Membership plans", "خطط العضوية"], ["Choose the plan that fits your home.", "اختر الخطة التي تناسب منزلك."]),
      make("pricing", { heading: bi("Choose a plan", "اختر الخطة"), plans: ["Basic|الأساسية", "Plus|المتقدمة", "Premium|المميزة"].map((n, i) => ({ name: bi(...(n.split("|") as [string, string])), price: "", period: bi("per year", "سنوياً"), description: none, features: [{ text: bi("Add what is included", "أضف ما تشمله الخطة") }], badge: i === 1 ? bi("Popular", "الأكثر طلباً") : none, highlighted: i === 1 ? "yes" : "no", cta: cta("Join now", "اشترك الآن", CONTACT) })) }),
      make("comparison", { heading: bi("Compare plans", "قارن بين الخطط") }),
      make("benefits", { heading: bi("Member benefits", "مزايا الأعضاء") }),
      faq(["Frequently asked questions", "الأسئلة الشائعة"], [[["How do I join?", "كيف أشترك؟"], ["Contact us and we will set you up.", "تواصل معنا وسنقوم بتفعيل اشتراكك."]], [["Can I change my plan?", "هل يمكنني تغيير خطتي؟"], GENERIC_ANSWER]]),
      make("contact-banner"),
    ],
  },
];

export const templateById = (id: string) => PAGE_TEMPLATES.find((t) => t.id === id);
