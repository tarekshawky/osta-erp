import type { Block } from "./blocks";
import { LIBRARY, createFromLibrary } from "./blockLibrary";

// The ducted / concealed / semi-central AC installation page (/ducted-ac-installation), as ordinary blocks built from the block library:
// after it is created the administrator edits any block like any other page. Prices, packages, extras and the quotation texts are NOT
// written here: the calculator block draws them from Self-Service Quotations → Pricing.

export const DUCTED_SLUG = "ducted-ac-installation";

const bi = (en: string, ar: string) => ({ en, ar });
const none = bi("", "");

function make(entryId: string, patch: Record<string, unknown> = {}): Block {
  const entry = LIBRARY.find((e) => e.id === entryId);
  if (!entry) throw new Error(`Unknown library block: ${entryId}`);
  const b = createFromLibrary(entry);
  return { ...b, props: { ...b.props, ...patch } };
}

export const DUCTED_PAGE = {
  titleEn: "Ducted & Concealed AC Installation UAE | Osta Services",
  titleAr: "تركيب مكيفات الدكت والكونسيلد وشبه المركزي في الإمارات | اسطا",
  seo: {
    titleEn: "Ducted AC Installation UAE | Concealed AC Installation | Osta",
    titleAr: "تركيب مكيفات الدكت والكونسيلد في الإمارات | اسطا",
    descriptionEn: "Professional ducted and concealed AC installation in UAE. Compare Standard, Complete and Premium packages, including plenum modification and duct connection. Generate your quotation online with Osta.",
    descriptionAr: "خدمات تركيب مكيفات الدكت والكونسيلد وشبه المركزي في الإمارات من اسطا. باقات تركيب بأسعار واضحة تشمل تعديل وتوصيل البلينم وفتحات الدكت. احسب السعر وأنشئ عرضك وحمّله PDF الآن.",
    canonical: "", noindex: false, ogImage: "",
    focusKeyword: "Ducted AC Installation UAE",
    // The Arabic focus keyword first, then the other keywords (English and Arabic).
    secondaryKeywords: [
      "تركيب مكيفات الدكت في الإمارات",
      "Ducted AC installation UAE", "concealed AC installation UAE", "semi central AC installation", "ducted split AC installation", "ducted air conditioner installation", "ducted AC installation cost", "ducted AC installation Dubai", "ducted AC installation Abu Dhabi", "ducted AC installation Ajman", "plenum connection", "plenum modification", "HVAC installation UAE",
      "تركيب مكيفات الدكت في الإمارات", "تركيب مكيفات الكونسيلد", "تركيب التكييف شبه المركزي", "أسعار تركيب مكيفات الدكت", "تركيب مكيف دكت", "تعديل موس كونكشن", "تعديل وتوصيل البلينم", "تركيب مكيفات مخفية", "تركيب وحدات التكييف المخفية",
    ].filter((k, i, a) => a.indexOf(k) === i).join(", "),
  },
  blocks: (): Block[] => [
    make("hero", {
      variant: "landing", align: "start", eyebrow: bi("Ducted · Concealed · Semi-Central", "دكت · كونسيلد · شبه مركزي"),
      heading: bi("Professional Ducted & Concealed AC Installation in UAE", "تركيب مكيفات الدكت والكونسيلد وشبه المركزي باحترافية في الإمارات"),
      subtitle: bi("Choose your package, calculate the cost and download your own quotation in minutes.", "اختر الباقة، واحسب التكلفة، وحمّل عرض السعر الخاص بك خلال دقائق."),
      ctas: [{ label: bi("Calculate your cost", "احسب التكلفة"), url: "#ducted-calculator" }, { label: bi("Contact us", "تواصل معنا"), url: "/contact" }],
    }),
    make("rich-text", {
      heading: none, align: "start",
      body: bi(
        "Looking for professional ducted or concealed air conditioning installation in the UAE? Osta Services provides reliable installation solutions for ducted split and semi-central AC systems, including indoor and outdoor unit installation, existing plenum modification, duct connection, copper piping, drainage, electrical connections and system testing.\n\nChoose from our Standard, Complete and Premium installation packages, calculate your estimated cost and generate your own professional quotation online.",
        "تقدم اسطا للخدمات الفنية خدمات تركيب مكيفات الدكت والكونسيلد والتكييف شبه المركزي في الإمارات، وتشمل تركيب الوحدات الداخلية والخارجية، وتعديل وتوصيل الـ Plenum Connection بفتحات الدكت الموجودة، وتوصيلات النحاس والصرف والكهرباء واختبار التشغيل.\n\nاختر الباقة المناسبة، واحسب تكلفة التركيب مباشرة، وأنشئ عرض السعر الخاص بك وحمّله بصيغة PDF من الموقع.",
      ),
    }),
    make("benefits", {
      heading: bi("The AC systems we install", "أنواع أنظمة التكييف التي نركّبها"), columns: "3",
      items: [
        { icon: "Wind", title: bi("Ducted Split AC", "مكيف دكت سبليت"), text: bi("Installation of concealed AC units connected to an air duct network that distributes the conditioned air to different rooms and spaces.", "تركيب وحدات التكييف المخفية المتصلة بشبكة مجاري الهواء لتوزيع الهواء المكيف على الغرف والمساحات المختلفة.") },
        { icon: "Fan", title: bi("Concealed AC", "مكيف كونسيلد"), text: bi("Installation of AC units concealed inside false ceilings, connected to suitable air outlets.", "تركيب وحدات التكييف المخفية داخل الأسقف المستعارة مع توصيلها بمخارج الهواء المناسبة.") },
        { icon: "Building2", title: bi("Semi-Central AC", "تكييف شبه مركزي"), text: bi("Installation of AC systems that serve large spaces or several zones through concealed units and air distribution networks.", "تركيب أنظمة التكييف التي تخدم المساحات الكبيرة أو عدة مناطق من خلال الوحدات المخفية وشبكات توزيع الهواء.") },
      ],
    }),
    // Packages, the price table, the plenum explanation, the exclusions and the calculator that builds the quotation PDF.
    make("ducted-calculator"),
    make("faq", {
      heading: bi("Frequently asked questions", "الأسئلة الشائعة"),
      items: [
        { question: bi("What is included in ducted AC installation?", "ما الذي يشمله تركيب مكيف الدكت؟"), answer: bi("Installing and fixing the indoor and outdoor units, modifying and connecting the plenum to your existing duct openings, connecting the drainage and electrical supply, copper piping according to the package you choose, and testing the system.", "تركيب وتثبيت الوحدتين الداخلية والخارجية، وتعديل وتوصيل الـ Plenum بفتحات الدكت الموجودة، وتوصيل الصرف والكهرباء، ومواسير النحاس حسب الباقة التي تختارها، واختبار تشغيل النظام.") },
        { question: bi("Is Plenum modification included in the installation price?", "هل تعديل البلينم مشمول في سعر التركيب؟"), answer: bi("Yes. The Existing Plenum Modification & Duct Connection is added automatically to every unit in every package. It is mandatory and it is already included in the totals you see in the calculator.", "نعم. يُضاف تعديل وتوصيل البلينم بفتحات الدكت الموجودة تلقائياً لكل وحدة في جميع الباقات. هو إلزامي ومشمول في الإجمالي الذي تراه في الحاسبة.") },
        { question: bi("What is the difference between Standard, Complete and Premium?", "ما الفرق بين باقات التركيب؟"), answer: bi("Standard is installation only, using the copper pipes and connections already on site. Complete adds new copper pipes up to 3 metres with insulation, the connecting cable, the drain hose and a leak and vacuum test. Premium adds copper pipes up to 5 metres, a nitrogen pressure test, vacuum, leak test and a final inspection.", "ستاندرد هي تركيب فقط باستخدام مواسير النحاس والتوصيلات الموجودة بالموقع. كومبليت تضيف مواسير نحاس جديدة حتى 3 أمتار مع العزل وكابل التوصيل وخرطوم الصرف واختبار التسريب والفاكيوم. بريميوم تضيف مواسير نحاس حتى 5 أمتار واختبار ضغط النيتروجين والفاكيوم واختبار التسريب والفحص النهائي.") },
        { question: bi("Do you supply the AC unit?", "هل توفرون جهاز التكييف؟"), answer: bi("No. The installation prices do not include the supply of the air conditioning unit.", "لا. أسعار التركيب لا تشمل توريد جهاز التكييف.") },
        { question: bi("Can you install a ducted AC system without existing ducts?", "هل يمكن تركيب مكيف دكت بدون شبكة دكت موجودة؟"), answer: bi("The package prices cover connecting the unit to duct openings that already exist. A completely new duct network needs measurements and a site inspection: add “New Duct Fabrication & Installation” in the calculator and we will send you a separate quotation.", "أسعار الباقات تغطي توصيل الوحدة بفتحات دكت موجودة بالفعل. أما شبكة الدكت الجديدة بالكامل فتحتاج إلى قياسات ومعاينة للموقع: أضف «تصنيع وتركيب دكت جديد» في الحاسبة وسنرسل لك عرض سعر منفصلاً.") },
        { question: bi("How much copper piping is included?", "كم متر نحاس تشمل الباقات؟"), answer: bi("Standard uses the copper pipes already on site. Complete includes up to 3 metres and Premium up to 5 metres. Additional metres can be added in the calculator.", "ستاندرد تستخدم مواسير النحاس الموجودة بالموقع. كومبليت تشمل حتى 3 أمتار وبريميوم حتى 5 أمتار. يمكن إضافة أمتار زيادة من الحاسبة.") },
        { question: bi("Do you provide nitrogen pressure testing and vacuum?", "هل توفرون اختبار النيتروجين والفاكيوم؟"), answer: bi("Premium includes the nitrogen pressure test, vacuum and leak test. Complete includes a leak and vacuum test when the refrigerant circuit is opened or new pipes are installed.", "نعم. بريميوم تشمل اختبار ضغط النيتروجين والفاكيوم واختبار التسريب. كومبليت تشمل اختبار التسريب والفاكيوم عند فتح دائرة التبريد أو تركيب مواسير جديدة.") },
        { question: bi("Do you install 3 Ton, 5 Ton and larger units?", "هل تقومون بتركيب مكيفات 3 طن و5 طن والسعات الأكبر؟"), answer: bi("Yes. The calculator covers 3, 4, 5, 6, 7.5 and 10 Ton units, and you can mix different sizes and packages in the same quotation.", "نعم. تغطي الحاسبة وحدات 3 و4 و5 و6 و7.5 و10 طن، ويمكنك الجمع بين سعات وباقات مختلفة في عرض سعر واحد.") },
        { question: bi("Does the price include new diffusers and grilles?", "هل يشمل السعر مخارج الهواء الجديدة؟"), answer: bi("No. New air outlets and grilles are not included in the package prices. You can add them as optional services in the calculator.", "لا. مخارج الهواء والـ Grilles الجديدة غير مشمولة في أسعار الباقات. يمكنك إضافتها كخدمات اختيارية من الحاسبة.") },
        { question: bi("Is the online calculator quotation final?", "هل السعر الناتج من الحاسبة نهائي؟"), answer: bi("No. The quotation is an estimate based on the package and project information you enter. Final pricing is subject to site inspection, technical assessment and confirmation of the installation scope.", "لا. عرض السعر تقديري بناءً على الباقة وبيانات المشروع التي تدخلها. يخضع السعر النهائي لمعاينة الموقع والتقييم الفني وتأكيد نطاق أعمال التركيب.") },
      ],
    }),
    make("benefits", {
      heading: bi("Why choose Osta?", "لماذا تختار اسطا؟"), columns: "4",
      items: [
        { icon: "Wrench", title: bi("Professional AC installation technicians", "فنيون متخصصون في تركيب أنظمة التكييف"), text: none },
        { icon: "Receipt", title: bi("Transparent and itemized quotations", "عروض أسعار واضحة ومفصلة"), text: none },
        { icon: "Package", title: bi("Flexible installation packages", "باقات تركيب مرنة"), text: none },
        { icon: "ShieldCheck", title: bi("Proper copper piping and insulation", "الاهتمام بتوصيلات النحاس والعزل"), text: none },
        { icon: "BadgeCheck", title: bi("Plenum modification and connection included", "تعديل وتوصيل البلينم مشمول في سعر التركيب"), text: none },
        { icon: "Gauge", title: bi("Operational testing after completion", "اختبار تشغيل المكيف بعد الانتهاء"), text: none },
        { icon: "Smartphone", title: bi("Digital quotations and invoices", "عروض أسعار وفواتير إلكترونية"), text: none },
        { icon: "MapPinned", title: bi("Service coverage across selected UAE locations", "تغطية مناطق متعددة في الإمارات"), text: none },
      ],
    }),
    make("multi-cta"),
  ],
};
