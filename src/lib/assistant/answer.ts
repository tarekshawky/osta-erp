import { buildIndex, search, type Index, type SearchService } from "./search";
import { normalize, tokens } from "./text";

// The free services assistant: reads a question and answers from the website's own data (services, prices, emirates, contact details).
// No AI service, no key, no cost. Pure: the database is read elsewhere (data.ts), so every answer is testable.

export type Lang = "en" | "ar";
export type PriceInfo = { mode: "INSPECTION" } | { mode: "PRICED"; unitEn: string; unitAr: string; byRegion: Record<string, number> };
export type AssistantService = SearchService & { price: PriceInfo };
export type Region = { slug: string; nameEn: string; nameAr: string };
export type Contact = { phone: string; whatsapp: string; email: string; hoursEn: string; hoursAr: string; addressEn: string; addressAr: string };
export type AssistantData = { services: AssistantService[]; regions: Region[]; categories: { nameEn: string; nameAr: string }[]; contact: Contact };

export type ReplyMatch = { bookSlug: string; nameEn: string; nameAr: string; category: string; categoryAr: string; priceText: string };
export type ReplyLink = { label: string; href: string };
export type Reply = { answer: string; matches: ReplyMatch[]; links: ReplyLink[]; suggestions: string[] };

export const MAX_QUESTION = 300;
const STRONG = 12; // a match score that clearly names one service

const RX = {
  price: /\b(price|prices|pricing|cost|costs|how much|rate|rates|fee|fees|charge|charges|quote|cheap|expensive)\b|سعر|اسعار|تكلف|بكم|تسعير|كم ياخذ|كم تاخذ/,
  areas: /\b(area|areas|emirate|emirates|cover|coverage|serve|location|locations|deliver|available in|operate)\b|مناطق|منطقه|امارات|امارة|تغطون|تخدمون|توصلون|متوفر في|وين|اين/,
  hours: /\b(hours|opening|closing|open|working hours|work hours|schedule)\b|ساعات العمل|اوقات العمل|مواعيد العمل|ساعات|دوام|مفتوح|تفتحون/,
  contact: /\b(phone|call|whatsapp|email|e-mail|contact|number|talk|speak|human|agent|support|reach)\b|واتساب|واتس|رقم|اتصال|اتصل|تواصل|ايميل|بريد|كلم|موظف|دعم/,
  booking: /\b(book|booking|order|appointment|reserve|reservation|how do i|how can i|how to)\b|احجز|حجز|موعد|اطلب|طلب|كيف احجز|كيف اطلب/,
  list: /\b(what services|which services|services do you|do you (do|provide|offer|have)|offer|list|categories|catalog|catalogue|all services)\b|ماذا تقدمون|ايش عندكم|ايش تقدمون|خدماتكم|قائمه الخدمات|اي خدمات|كل الخدمات|(ايش|شو|وش|ما هي|ماهي) الخدمات|الخدمات (اللي|التي|المتوفره)/,
  thanks: /\b(thanks|thank you|thx)\b|شكرا|يعطيك العافيه|مشكور/,
  greeting: /^(hi|hello|hey|hiya|salam|good (morning|evening|afternoon)|السلام عليكم|مرحبا|اهلا|هلا|صباح الخير|مساء الخير|سلام)(?=\s|$)/,
};

const EMIRATES: { slug: string; match: RegExp }[] = [
  { slug: "dubai", match: /\bdubai\b|دبي/ },
  { slug: "abu-dhabi", match: /abu dhabi|ابوظبي|ابو ظبي/ },
  { slug: "sharjah", match: /\bsharjah\b|الشارقه|شارقه/ },
  { slug: "ajman", match: /\bajman\b|عجمان/ },
  { slug: "umm-al-quwain", match: /umm al quwain|umm al-quwain|ام القيوين|ام القوين/ },
  { slug: "ras-al-khaimah", match: /ras al khaimah|ras al-khaimah|\brak\b|راس الخيمه/ },
  { slug: "fujairah", match: /\bfujairah\b|الفجيره|فجيره/ },
  { slug: "al-ain", match: /al ain|العين/ },
];

const T = {
  hello: { en: "Hello! I can help you find the right service, tell you prices, the emirates we cover and how to book. What do you need?", ar: "أهلاً بك! أستطيع مساعدتك في اختيار الخدمة المناسبة ومعرفة الأسعار والإمارات التي نغطيها وطريقة الحجز. ماذا تحتاج؟" },
  thanks: { en: "You're welcome! Anything else I can help with?", ar: "عفواً! هل أستطيع مساعدتك في شيء آخر؟" },
  matchIntro: { en: "These services look like a match:", ar: "هذه الخدمات تبدو مناسبة:" },
  priceIntro: { en: "Here are the prices:", ar: "هذه هي الأسعار:" },
  priceNote: { en: "These are starting prices before VAT; the final price is confirmed when you book, and some jobs are priced after a technician inspects.", ar: "هذه أسعار ابتدائية قبل ضريبة القيمة المضافة، ويُؤكَّد السعر النهائي عند الحجز، وبعض الأعمال تُسعَّر بعد معاينة الفني." },
  askWhich: { en: "Which service do you want the price of? Tell me the service (for example “AC cleaning”) and, if you like, the emirate.", ar: "ما الخدمة التي تريد سعرها؟ اكتب اسم الخدمة (مثل «تنظيف المكيف») والإمارة إن أردت." },
  inspection: { en: "price confirmed after inspection", ar: "السعر بعد المعاينة" },
  book: { en: "To book: choose your emirate, then the service (or several), pick the booking type and time, and confirm. You see the price before you confirm.", ar: "للحجز: اختر الإمارة ثم الخدمة (أو عدة خدمات)، ثم نوع الحجز والموعد، وأكّد الطلب. يظهر لك السعر قبل التأكيد." },
  bookLink: { en: "Book now", ar: "احجز الآن" },
  servicesLink: { en: "All services", ar: "كل الخدمات" },
  areasAll: { en: "We serve all of these emirates:", ar: "نخدم جميع هذه الإمارات:" },
  contactIntro: { en: "You can reach us here:", ar: "يمكنك التواصل معنا من هنا:" },
  fallback: { en: "I can answer questions about our services, prices, the emirates we cover, opening hours and how to book. For anything else, please contact us:", ar: "أستطيع الإجابة عن خدماتنا وأسعارنا والإمارات التي نغطيها وساعات العمل وطريقة الحجز. لأي شيء آخر تواصل معنا:" },
  categories: { en: "We offer many home services, including:", ar: "نقدّم خدمات منزلية كثيرة، منها:" },
  more: { en: "Tell me the problem (for example “AC not cooling”) and I will suggest the right service.", ar: "اخبرني بالمشكلة (مثل «المكيف لا يبرد») وسأقترح عليك الخدمة المناسبة." },
};
const t = (k: keyof typeof T, lang: Lang) => T[k][lang];

const SUGGESTIONS: Record<Lang, string[]> = {
  en: ["My AC is not cooling", "How much is AC cleaning?", "Which emirates do you serve?", "How do I book?"],
  ar: ["المكيف لا يبرد", "كم سعر تنظيف المكيف؟", "ما الإمارات التي تخدمونها؟", "كيف أحجز؟"],
};

const money = (aed: number) => `${Math.round(aed).toLocaleString("en-US")} AED`;

export function priceText(s: AssistantService, lang: Lang, region?: Region | null): string {
  if (s.price.mode === "INSPECTION" || Object.keys(s.price.byRegion).length === 0) return t("inspection", lang);
  const unit = (lang === "ar" ? s.price.unitAr : s.price.unitEn).trim();
  const per = unit ? ` ${unit}` : "";
  const at = region ? s.price.byRegion[region.slug] : undefined;
  if (at !== undefined) return `${money(at)}${per}`;
  const values = Object.values(s.price.byRegion);
  const lo = Math.min(...values), hi = Math.max(...values);
  if (lo === hi) return `${money(lo)}${per}`;
  return lang === "ar" ? `من ${money(lo)} إلى ${money(hi)}${per} حسب الإمارة` : `from ${money(lo)} to ${money(hi)}${per}, depending on the emirate`;
}

export type Assistant = { ask(question: string, lang: Lang): Reply; index: Index };

export function createAssistant(data: AssistantData): Assistant {
  const index = buildIndex(data.services);
  const bySlug = new Map(data.services.map((s) => [s.slug, s]));
  const name = (x: { nameEn: string; nameAr: string }, lang: Lang) => (lang === "ar" ? x.nameAr : x.nameEn);
  const c = data.contact;

  const contactLinks = (lang: Lang): ReplyLink[] => {
    const links: ReplyLink[] = [];
    const wa = c.whatsapp.replace(/\D/g, "");
    if (wa) links.push({ label: lang === "ar" ? "واتساب" : "WhatsApp", href: `https://wa.me/${wa}` });
    if (c.phone) links.push({ label: lang === "ar" ? `اتصل ${c.phone}` : `Call ${c.phone}`, href: `tel:${c.phone.replace(/[^\d+]/g, "")}` });
    if (c.email) links.push({ label: lang === "ar" ? "راسلنا" : "Email us", href: `mailto:${c.email}` });
    return links;
  };
  const contactLines = (lang: Lang) => [c.phone && `${lang === "ar" ? "الهاتف" : "Phone"}: ${c.phone}`, c.email && `${lang === "ar" ? "البريد" : "Email"}: ${c.email}`, (lang === "ar" ? c.hoursAr || c.hoursEn : c.hoursEn || c.hoursAr) && `${lang === "ar" ? "ساعات العمل" : "Hours"}: ${lang === "ar" ? c.hoursAr || c.hoursEn : c.hoursEn || c.hoursAr}`].filter(Boolean) as string[];

  const toMatch = (s: AssistantService, lang: Lang, region?: Region | null): ReplyMatch => ({ bookSlug: s.slug, nameEn: s.nameEn, nameAr: s.nameAr, category: s.category, categoryAr: s.categoryAr, priceText: priceText(s, lang, region) });
  const bookLinks = (slugs: string[], lang: Lang): ReplyLink[] => (slugs.length ? [{ label: t("bookLink", lang), href: slugs.length === 1 ? `/pricing?service=${encodeURIComponent(slugs[0])}` : `/pricing?services=${slugs.map(encodeURIComponent).join(",")}` }] : [{ label: t("bookLink", lang), href: "/pricing" }]);

  function ask(question: string, lang: Lang): Reply {
    const text = normalize(question.slice(0, MAX_QUESTION));
    const words = tokens(text);
    const suggestions = SUGGESTIONS[lang];
    const reply = (answer: string, extra: Partial<Reply> = {}): Reply => ({ answer, matches: [], links: [], suggestions, ...extra });
    const emirate = EMIRATES.find((e) => e.match.test(text));
    const region = emirate ? data.regions.find((r) => r.slug === emirate.slug) ?? null : null;
    // the words that ask the question (price, hours, how do I book …) are not the service: leave them out when looking for one
    const subject = ["price", "areas", "hours", "contact", "booking", "list"].reduce((x, k) => x.replace(new RegExp(RX[k as keyof typeof RX].source, "g"), " "), text);
    const scored = search(index, subject, 3);
    const hits = scored.map((h) => bySlug.get(h.service.slug)!).filter(Boolean);
    // clearly one service: a very good score, or well ahead of the next
    const strong = scored.length > 0 && (scored[0].score >= STRONG || scored.length === 1 || scored[0].score >= 1.4 * scored[1].score);

    if (words.length === 0) return reply(t("hello", lang));
    if (RX.greeting.test(text) && words.length <= 3 && hits.length === 0) return reply(t("hello", lang));
    if (RX.thanks.test(text) && words.length <= 4 && hits.length === 0) return reply(t("thanks", lang));

    if (RX.price.test(text)) {
      if (hits.length === 0) return reply(t("askWhich", lang), { links: [{ label: t("servicesLink", lang), href: "/services" }] });
      const where = region ? (lang === "ar" ? ` في ${region.nameAr}` : ` in ${region.nameEn}`) : "";
      const lines = hits.map((s) => `• ${name(s, lang)}: ${priceText(s, lang, region)}`);
      return reply(`${t("priceIntro", lang)}${where ? where : ""}\n${lines.join("\n")}\n\n${t("priceNote", lang)}`, { matches: hits.map((s) => toMatch(s, lang, region)), links: bookLinks(hits.slice(0, 1).map((s) => s.slug), lang) });
    }

    if (RX.booking.test(text)) {
      // the service named in the question gets its own Book link, only when it is clearly the one meant
      const named = strong ? hits.slice(0, 1) : [];
      return reply(t("book", lang), { matches: named.map((s) => toMatch(s, lang, region)), links: bookLinks(named.map((s) => s.slug), lang) });
    }

    const wantsAreas = RX.areas.test(text) || (emirate !== undefined && hits.length === 0);
    if (wantsAreas && hits.length === 0) {
      const list = data.regions.map((r) => name(r, lang)).join(lang === "ar" ? "، " : ", ");
      if (region) return reply(lang === "ar" ? `نعم، نخدم ${region.nameAr}. نخدم أيضاً: ${list}.` : `Yes, we serve ${region.nameEn}. We cover: ${list}.`, { links: bookLinks([], lang) });
      return reply(`${t("areasAll", lang)} ${list}.`, { links: bookLinks([], lang) });
    }

    if ((RX.hours.test(text) || RX.contact.test(text)) && hits.length === 0) {
      const lines = contactLines(lang);
      return reply(lines.length ? `${t("contactIntro", lang)}\n${lines.join("\n")}` : t("fallback", lang), { links: contactLinks(lang) });
    }

    if (hits.length > 0) {
      const lines = hits.map((s) => `• ${name(s, lang)} (${s.category.length ? (lang === "ar" ? s.categoryAr : s.category) : ""}): ${priceText(s, lang, region)}`);
      return reply(`${t("matchIntro", lang)}\n${lines.join("\n")}\n\n${t("priceNote", lang)}`, { matches: hits.map((s) => toMatch(s, lang, region)), links: bookLinks(hits.slice(0, 1).map((s) => s.slug), lang) });
    }

    if (RX.list.test(text)) {
      const cats = data.categories.slice(0, 8).map((x) => `• ${name(x, lang)}`).join("\n");
      return reply(`${t("categories", lang)}\n${cats}\n\n${t("more", lang)}`, { links: [{ label: t("servicesLink", lang), href: "/services" }] });
    }

    const lines = contactLines(lang);
    return reply(`${t("fallback", lang)}${lines.length ? `\n${lines.join("\n")}` : ""}`, { links: [...contactLinks(lang), { label: t("servicesLink", lang), href: "/services" }] });
  }

  return { ask, index };
}
