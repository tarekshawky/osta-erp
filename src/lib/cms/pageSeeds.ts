import { createBlock, type Block } from "./blocks";
import type { BUILT_IN_PAGES } from "./pageRules";

const bi = (en: string, ar: string) => ({ en, ar });
const none = bi("", "");

export type BuiltInSlug = (typeof BUILT_IN_PAGES)[number];

function hero(heading: ReturnType<typeof bi>, subtitle: ReturnType<typeof bi>, extra: Record<string, unknown> = {}): Block {
  const b = createBlock("hero");
  b.props = { ...b.props, align: "center", heading, subtitle, ...extra };
  return b;
}

// Each built-in public page expressed as blocks, with the same wording the site shows today. Created as a DRAFT:
// visitors keep seeing the built-in page until the owner previews the draft and publishes it.
export const BUILT_IN_SEEDS: Record<BuiltInSlug, { titleEn: string; titleAr: string; seo: { titleEn: string; descriptionEn: string }; blocks: () => Block[] }> = {
  about: {
    titleEn: "About Us",
    titleAr: "من نحن",
    seo: { titleEn: "About Us", descriptionEn: "OSTA Services was founded to make home maintenance in the UAE faster, easier, and more reliable." },
    blocks: () => {
      const text = createBlock("richText");
      text.props = {
        heading: none,
        align: "start",
        body: bi(
          "We started small, but with trust from our customers, OSTA became one of the growing names in UAE home services. Our certified technicians serve homes, villas, offices, and commercial properties across Dubai, Abu Dhabi, Sharjah, Ajman, Al Ain, Ras Al Khaimah, Umm Al Quwain, and Fujairah — with transparent pricing and a warranty on every eligible service.",
          "بدأنا بشكل بسيط، ولكن بثقة عملائنا أصبحت آسطا من الأسماء الصاعدة في خدمات المنازل داخل الإمارات. يخدم فنيونا المعتمدون المنازل والفلل والمكاتب والمنشآت التجارية في دبي وأبوظبي والشارقة وعجمان والعين ورأس الخيمة وأم القيوين والفجيرة — بأسعار شفافة وضمان على كل خدمة مؤهلة."
        ),
      };
      const cta = createBlock("cta");
      cta.props = { heading: bi("Book Your Service Today", "احجز خدمتك اليوم"), subtitle: none, button: { label: bi("Book a Service", "احجز خدمة"), url: "/pricing" } };
      return [
        hero(
          bi("About OSTA Services", "عن OSTA Services"),
          bi(
            "OSTA Services was founded with a simple idea — to make home maintenance in the UAE faster, easier, and more reliable for everyone.",
            "تأسست خدمات آسطا بفكرة بسيطة: جعل خدمات الصيانة المنزلية في الإمارات أسرع وأسهل وأكثر موثوقية للجميع."
          )
        ),
        text,
        cta,
      ];
    },
  },
  contact: {
    titleEn: "Contact Us",
    titleAr: "تواصل معنا",
    seo: { titleEn: "Contact Us", descriptionEn: "Get in touch with OSTA Services via WhatsApp, phone, or email." },
    blocks: () => {
      const cards = createBlock("contactCards");
      cards.props = { heading: none, subtitle: none, whatsappButtonLabel: bi("Chat on WhatsApp", "تحدث عبر واتساب") };
      return [
        hero(bi("Contact Us", "تواصل معنا"), bi("Have a question or need a service? Reach out any time.", "لديك سؤال أو تحتاج خدمة؟ تواصل معنا في أي وقت.")),
        cards,
      ];
    },
  },
  services: {
    titleEn: "Our Services",
    titleAr: "خدماتنا",
    seo: { titleEn: "Our Services", descriptionEn: "AC repair, cleaning, installation, electrical, and home maintenance services across the UAE." },
    blocks: () => {
      const grid = createBlock("servicesGrid");
      grid.props = { ...grid.props, limit: 24, eyebrow: none, heading: none, subtitle: none, viewAllLabel: none, viewAllUrl: "" };
      return [hero(bi("Our Services", "خدماتنا"), bi("A complete range of AC and home maintenance services across the UAE.", "مجموعة كاملة من خدمات صيانة المكيفات والمنزل في جميع أنحاء الإمارات.")), grid];
    },
  },
  blog: {
    titleEn: "Blog",
    titleAr: "المدونة",
    seo: { titleEn: "Blog", descriptionEn: "Tips, guides, and news on AC maintenance and home care from the OSTA Services team." },
    blocks: () => {
      const posts = createBlock("blogPreview");
      posts.props = { eyebrow: none, heading: none, limit: 12, viewAllLabel: none, viewAllUrl: "" };
      return [hero(bi("Blog", "المدونة"), bi("Tips, guides, and news from the OSTA Services team.", "نصائح وأدلة وأخبار من فريق OSTA Services.")), posts];
    },
  },
  pricing: {
    titleEn: "Pricing",
    titleAr: "الأسعار",
    seo: { titleEn: "Pricing", descriptionEn: "Transparent, upfront pricing for AC repair, cleaning, installation, and home maintenance in the UAE." },
    blocks: () => {
      const calc = createBlock("bookingCalculator");
      calc.props = { heading: bi("Price your booking and book", "احسب سعر حجزك واحجز"), subtitle: bi("Choose your emirate, service and booking type — the price appears instantly.", "اختر الإمارة والخدمة ونوع الحجز — يظهر السعر فوراً.") };
      return [hero(bi("Pricing", "الأسعار"), bi("Transparent, upfront pricing for every service — no hidden fees.", "أسعار شفافة وواضحة لكل خدمة — بدون رسوم خفية.")), calc];
    },
  },
};
