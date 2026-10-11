import { createBlock, type Block } from "./blocks";

const bi = (en: string, ar: string) => ({ en, ar });

// The current public homepage, expressed as blocks, using the exact texts the site shows today.
// Created as a DRAFT so nothing changes for visitors until the owner previews it and publishes.
export function homepageBlocks(): Block[] {
  const hero = createBlock("hero");
  hero.props = {
    ...hero.props,
    variant: "landing",
    align: "center",
    eyebrow: bi("Trusted AC Repair & Home Maintenance", "صيانة مكيفات ومنازل موثوقة"),
    heading: bi("Your Comfort.", "راحتك."),
    headingAccent: bi("Our Priority.", "أولويتنا."),
    subtitle: bi("Professional home services across the UAE. Trusted by 10,000+ happy customers.", "خدمات منزلية احترافية في جميع أنحاء الإمارات. موثوقون من قبل أكثر من 10,000 عميل سعيد."),
    ctas: [
      { label: bi("Book a Service", "احجز خدمة"), url: "/orders/new" },
      { label: bi("View All Services", "عرض كل الخدمات"), url: "/services" },
    ],
    badges: [
      { icon: "ShieldCheck", label: bi("Trusted Professionals", "محترفون موثوقون") },
      { icon: "Clock", label: bi("Same Day Service", "خدمة في نفس اليوم") },
      { icon: "BadgeCheck", label: bi("14-Day Warranty", "ضمان 14 يوماً") },
      { icon: "Wrench", label: bi("Transparent Pricing", "أسعار شفافة") },
    ],
  };

  const services = createBlock("servicesGrid");
  services.props = {
    ...services.props,
    limit: 12,
    eyebrow: bi("Our Services", "خدماتنا"),
    heading: bi("Everything your home needs", "كل ما يحتاجه منزلك"),
    subtitle: bi("A complete range of AC and home maintenance services under one roof.", "مجموعة كاملة من خدمات صيانة المكيفات والمنزل تحت سقف واحد."),
    viewAllLabel: bi("View All Services", "عرض كل الخدمات"),
    viewAllUrl: "/services",
  };

  const sections = createBlock("homeSections");

  const stats = createBlock("stats");
  stats.props = {
    heading: bi("", ""),
    items: [
      { icon: "Star", value: "5.0", label: bi("Google Rating", "تقييم جوجل") },
      { icon: "Users", value: "10K+", label: bi("Happy Customers", "عميل سعيد") },
      { icon: "ThumbsUp", value: "197+", label: bi("Positive Reviews", "تقييم إيجابي") },
      { icon: "MapPin", value: "7", label: bi("Emirates We Serve", "إمارات نخدمها") },
    ],
  };

  const blog = createBlock("blogPreview");
  blog.props = {
    eyebrow: bi("From the Blog", "من المدونة"),
    heading: bi("Maintenance tips & guides", "نصائح وأدلة الصيانة"),
    limit: 3,
    viewAllLabel: bi("View all articles", "عرض كل المقالات"),
    viewAllUrl: "/blog",
  };

  const cta = createBlock("cta");
  cta.props = {
    heading: bi("Book Your Service Today", "احجز خدمتك اليوم"),
    subtitle: bi("Log in or create an account to book online in minutes.", "سجّل الدخول أو أنشئ حساباً لتحجز عبر الإنترنت خلال دقائق."),
    button: { label: bi("Book Now", "احجز الآن"), url: "/orders/new" },
  };

  return [hero, services, sections, stats, blog, cta];
}
