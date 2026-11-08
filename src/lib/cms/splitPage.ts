import { createFromLibrary, LIBRARY } from "./blockLibrary";
import type { Block } from "./blocks";

// The Split AC installation page already exists at /split-ac-installation with its own content and design. It is upgraded in place (never a
// second page): the calculator (packages, price table, conditions and the quotation calculator), the FAQ and links to related services are
// added to the DRAFT, after what is already there, and the SEO fields that are still empty are filled. The administrator moves the blocks
// where they fit, reviews and publishes. Nothing goes live by itself.

export const SPLIT_SLUG = "split-ac-installation";

const bi = (en: string, ar: string) => ({ en, ar });

export const SPLIT_SEO = {
  titleEn: "Split AC Installation UAE | Packages & Instant Quotation | Osta Services",
  titleAr: "تركيب مكيفات سبليت في الإمارات | باقات وعرض سعر فوري | اسطا",
  descriptionEn: "Professional split AC installation in Ajman, Sharjah, Dubai and Abu Dhabi. Compare Standard, Complete and Premium installation packages and generate your PDF quotation instantly online.",
  descriptionAr: "تركيب مكيفات سبليت باحترافية في عجمان والشارقة ودبي وأبوظبي. قارن بين باقات التركيب الأساسي والشامل والمميز واحصل على عرض سعر PDF فوري من الموقع.",
  focusKeyword: "Split AC Installation UAE",
  secondaryKeywords: [
    "Split AC Installation UAE", "Split Air Conditioner Installation", "AC Installation Ajman", "AC Installation Dubai", "AC Installation Abu Dhabi", "Split AC Installation Cost UAE", "Professional AC Installation Services",
    "تركيب مكيفات سبليت في الإمارات", "أسعار تركيب مكيفات سبليت", "تركيب مكيفات في عجمان", "تركيب مكيفات في دبي", "تركيب مكيفات في أبوظبي", "فني تركيب مكيفات", "تركيب مكيفات مع مواسير النحاس",
  ].join(", "),
};

export const SPLIT_FAQ = [
  { q: bi("What is included in standard split AC installation?", "ماذا تشمل باقة التركيب الأساسي للمكيف السبليت؟"), a: bi("Standard installation includes installing the indoor and outdoor units, connecting existing copper pipes, electrical cables, and drainage connections, followed by an operational and cooling test. New materials and piping are not included.", "تشمل تركيب الوحدة الداخلية والخارجية وتوصيل مواسير النحاس والكابلات وخط الصرف الموجودة والجاهزة بالموقع، بالإضافة إلى اختبار التشغيل والتبريد. لا تشمل أي خامات أو تمديدات جديدة.") },
  { q: bi("What is the difference between Complete and Premium installation?", "ما الفرق بين التركيب الشامل والتركيب المميز؟"), a: bi("Complete installation includes new installation materials and copper piping up to 3 metres. Premium installation includes materials and copper piping up to 5 metres, plus nitrogen pressure testing and vacuuming.", "التركيب الشامل يتضمن الخامات الأساسية ومواسير النحاس حتى 3 أمتار، بينما التركيب المميز يتضمن الخامات ومواسير النحاس حتى 5 أمتار، بالإضافة إلى اختبار ضغط النيتروجين وعمل الفاكيوم.") },
  { q: bi("How much does split AC installation cost in UAE?", "كم تبلغ تكلفة تركيب مكيف سبليت في الإمارات؟"), a: bi("Prices depend on AC capacity and the selected installation package. Osta Services offers three packages starting from AED 150 for labour-only installation. Customers can use the online quotation calculator for an instant estimate.", "تعتمد التكلفة على قدرة المكيف بالطن وباقة التركيب المختارة. تبدأ أسعار التركيب دون خامات من 150 درهماً. يمكنك استخدام حاسبة الأسعار للحصول على عرض سعر فوري.") },
  { q: bi("How many metres of copper piping are included?", "كم متر مواسير نحاس تشمل كل باقة؟"), a: bi("Standard installation does not include new copper piping. Complete includes up to 3 metres, while Premium includes up to 5 metres per AC unit.", "الباقة الأساسية لا تشمل مواسير نحاس جديدة، والتركيب الشامل يشمل حتى 3 أمتار، بينما التركيب المميز يشمل حتى 5 أمتار لكل مكيف.") },
  { q: bi("What happens if I need more than the included copper pipe length?", "ماذا يحدث إذا احتجت إلى مواسير نحاس أطول من المسافة المشمولة؟"), a: bi("Any additional copper piping beyond the selected package allowance will be charged separately after inspection and customer approval.", "يتم احتساب طول المواسير الإضافي بشكل منفصل بعد المعاينة والحصول على موافقة العميل قبل تنفيذ العمل.") },
  { q: bi("Does AC installation include refrigerant gas charging?", "هل تركيب المكيف يشمل شحن غاز التبريد؟"), a: bi("Refrigerant gas charging is not automatically included in any package. It may be required depending on the AC condition, installation requirements, and manufacturer's instructions.", "شحن الغاز غير مشمول تلقائياً في أي باقة، ويتم تحديد الحاجة إليه حسب حالة المكيف ومتطلبات التركيب وتعليمات الشركة المصنعة.") },
  { q: bi("Do you provide outdoor AC unit brackets?", "هل توفرون حوامل الوحدة الخارجية؟"), a: bi("New outdoor metal brackets are not included in the standard package prices. They can be added as an optional service and quoted separately.", "الحوامل المعدنية الجديدة للوحدة الخارجية غير مشمولة في أسعار الباقات الأساسية، ويمكن إضافتها كخدمة اختيارية بتكلفة منفصلة.") },
  { q: bi("Do you perform nitrogen pressure testing and vacuuming?", "هل تقومون باختبار ضغط النيتروجين وعمل الفاكيوم؟"), a: bi("Nitrogen pressure testing and vacuuming are included in the Premium package. Leak testing and proper vacuuming should also be carried out whenever the refrigerant circuit is opened or new piping is installed.", "تشمل باقة التركيب المميز اختبار ضغط النيتروجين وعمل الفاكيوم. كما يجب إجراء اختبارات التسريب والفاكيوم عند فتح دائرة التبريد أو تركيب مواسير جديدة.") },
  { q: bi("Can I install multiple split AC units in one visit?", "هل يمكن تركيب أكثر من مكيف في نفس الزيارة؟"), a: bi("Yes. Customers can add multiple AC units with different capacities using our online quotation calculator. The quotation will calculate the total automatically.", "نعم، يمكنك إضافة عدة مكيفات بقدرات مختلفة باستخدام حاسبة الأسعار، وسيتم حساب إجمالي التكلفة تلقائياً.") },
  { q: bi("Which areas in UAE does Osta Services cover?", "ما المناطق التي تغطيها خدمات اسطا في الإمارات؟"), a: bi("Osta Services provides AC installation and maintenance services across selected areas in the UAE, including Ajman, Sharjah, Umm Al Quwain, Dubai, Al Ain, and Abu Dhabi, subject to service availability and project requirements.", "توفر اسطا خدمات تركيب وصيانة المكيفات في مناطق متعددة داخل الإمارات، بما في ذلك عجمان والشارقة وأم القيوين ودبي والعين وأبوظبي، وفقاً لتوفر الخدمة ومتطلبات المشروع.") },
];

function make(entryId: string, patch: Record<string, unknown> = {}): Block {
  const entry = LIBRARY.find((e) => e.id === entryId);
  if (!entry) throw new Error(`Unknown library block: ${entryId}`);
  const b = createFromLibrary(entry);
  return { ...b, props: { ...b.props, ...patch } };
}

export type RelatedLink = { slug: string; titleEn: string; titleAr: string };

// Adds what the page is missing, after what is already there. Returns the blocks and which parts were added (a part that already exists is
// never added twice, and nothing existing is changed).
export function withSplitBlocks(draft: unknown, related: RelatedLink[] = []): { ok: true; blocks: Block[]; added: string[] } | { ok: false; error: string } {
  if (draft != null && !Array.isArray(draft)) return { ok: false, error: "The page draft could not be read." };
  const blocks = [...((draft ?? []) as Block[])];
  const has = (type: string) => blocks.some((b) => b?.type === type);
  const added: string[] = [];
  if (!has("splitQuoteCalculator")) { blocks.push(make("split-quote-calculator")); added.push("calculator"); }
  if (!has("faq")) {
    blocks.push(make("faq", { heading: bi("Frequently asked questions", "الأسئلة الشائعة"), items: SPLIT_FAQ.map((f) => ({ question: f.q, answer: f.a })) }));
    added.push("faq");
  }
  const RELATED = "Related AC services";
  if (related.length && !blocks.some((b) => b?.type === "ctaButtons" && (b.props as { heading?: { en?: string } }).heading?.en === RELATED)) {
    blocks.push(make("multi-cta", { heading: bi(RELATED, "خدمات التكييف ذات الصلة"), buttons: related.slice(0, 4).map((r) => ({ kind: "custom", label: bi(r.titleEn, r.titleAr || r.titleEn), url: `/${r.slug}` })) }));
    added.push("links");
  }
  return { ok: true, blocks, added };
}

// Only fills SEO fields that are still empty: what the team already wrote is kept.
export function mergeSeo(current: unknown): Record<string, unknown> {
  const cur = (current && typeof current === "object" ? current : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...cur };
  for (const [k, v] of Object.entries(SPLIT_SEO)) if (typeof cur[k] !== "string" || !(cur[k] as string).trim()) out[k] = v;
  return out;
}
