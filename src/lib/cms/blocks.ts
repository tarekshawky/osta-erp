import { z } from "zod";
import { cssProblem, jsProblem } from "./blockCode";
import { ICON_NAMES } from "./icons";
import { hasUnsafeInlineLink } from "./inlineLinks";
import { cleanRichValue } from "./richText";
import { WEATHER_CITIES, WEATHER_CITY_SLUGS } from "./weatherCities";

// ---- shared field schemas ----
// Text is either plain (with optional [link text](address){flags} links) or HTML from the visual editor, which is
// rebuilt through an allow-list on every save (see richText.ts). The address of a link must be a site path, https://,
// tel: or mailto:. No practical limit on how much text a field can hold (long articles are fine); this only guards against absurd input.
const text = z
  .string()
  .max(2_000_000)
  .refine((v) => !hasUnsafeInlineLink(v), "A link in this text has an address that is not allowed. Use a site path (/…), https://, tel: or mailto:.")
  .transform(cleanRichValue);
const bi = z.object({ en: text, ar: text });
// Links: site paths, http(s), tel: and mailto: only -- never javascript: or data:. "#name" jumps to a block on the same page
// (a block's "Anchor ID").
const link = z
  .string()
  .max(2000)
  .refine((v) => v === "" || /^(\/|https?:\/\/|tel:|mailto:|#[A-Za-z][A-Za-z0-9_-]*$)/.test(v), "Use a site path (/…), https:// link, tel:, mailto: or #anchor.");
// Images: site paths, http(s) or an uploaded raster data URL. No SVG (can carry script).
const image = z
  .string()
  .max(3_000_000)
  .refine((v) => v === "" || /^(\/|https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/.test(v), "Invalid image.");
const cta = z.object({ label: bi, url: link });
const iconName = z.string().max(40).regex(/^[A-Za-z0-9]*$/);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #050b1a.");
const yesNo = z.enum(["yes", "no"]);
const CURRENCIES = ["AED", "USD", "SAR", "EUR"] as const;
const currency = z.enum(CURRENCIES);
const BADGES = ["none", "featured", "popular", "bestSeller", "new", "offer", "limited"] as const;
const money = z.string().max(30);

// What an advanced image can change on tablets and phones; 0 / "inherit" = the same as the desktop setting.
const IMAGE_DEVICE = z.object({
  width: z.number().min(0).max(5000), widthUnit: z.enum(["px", "%"]), maxWidth: z.number().min(0).max(5000), height: z.number().min(0).max(5000), maxHeight: z.number().min(0).max(5000),
  align: z.enum(["inherit", "start", "center", "end"]), wrap: z.enum(["inherit", "none", "start", "end"]), space: z.enum(["inherit", "none", "sm", "md", "lg"]),
});

const RAW_SCHEMAS = {
  hero: z.object({
    eyebrow: bi,
    heading: bi,
    subtitle: bi,
    imageUrl: image,
    imagePosition: z.enum(["end", "start", "background"]),
    // A full-width background behind the whole hero (under the overlay). Independent of the side image above.
    backgroundImage: image.optional(),
    align: z.enum(["start", "center"]),
    ctas: z.array(cta).max(3),
    // Optional so blocks saved before these existed stay valid.
    // Dark layer over a background image: strength 0-100 (%) and its colour.
    overlay: z.number().int().min(0).max(100).optional(),
    overlayColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Overlay colour must look like #050b1a.").optional(),
    variant: z.enum(["standard", "landing"]).optional(),
    headingAccent: bi.optional(),
    badges: z.array(z.object({ icon: z.string().max(40).regex(/^[A-Za-z0-9]*$/), label: bi })).max(6).optional(),
  }),
  // source "website" = the website service pages (the default); "catalogue" = every service of the Service Catalogue, each with a Book
  // button (optionally only one category, by its English name). The limit is whatever number you type (up to 2000).
  servicesGrid: z.object({
    heading: bi, subtitle: bi, limit: z.number().int().min(1).max(2000), eyebrow: bi.optional(), viewAllLabel: bi.optional(), viewAllUrl: link.optional(),
    source: z.enum(["website", "catalogue"]).optional(), category: z.string().max(120).optional(),
  }),
  blogPreview: z.object({ eyebrow: bi, heading: bi, limit: z.number().int().min(1).max(12), viewAllLabel: bi, viewAllUrl: link }),
  // Open jobs from Jobs & Workforce, pulled automatically; each card opens the job's application page.
  jobsList: z.object({ eyebrow: bi, heading: bi, subtitle: bi, limit: z.number().int().min(1).max(24), jobType: z.enum(["all", "DAILY", "PERMANENT"]), emptyText: bi, viewAllLabel: bi }),
  // Links to the published pages directly under this page in the page tree (Website → Page Structure): a category page lists its
  // service pages, and a page appears here only once it is published.
  subPages: z.object({ eyebrow: bi, heading: bi, subtitle: bi }),
  // Every Service Catalogue service with search, category cards, "Add" (a basket of several services) and "Book".
  serviceCatalog: z.object({ heading: bi, subtitle: bi }),
  homeSections: z.object({}),
  richText: z.object({ heading: bi, body: bi, align: z.enum(["start", "center"]) }),
  imageText: z.object({
    heading: bi,
    body: bi,
    imageUrl: image,
    imageAlt: bi,
    imagePosition: z.enum(["end", "start"]),
    cta,
  }),
  // A picture on its own: with an optional caption and link, in three widths and several shapes.
  image: z.object({
    imageUrl: image,
    imageAlt: bi,
    caption: bi,
    link,
    size: z.enum(["content", "wide", "full"]),
    ratio: z.enum(["auto", "16:9", "3:2", "1:1", "21:9"]),
    rounded: z.enum(["yes", "no"]),
    align: z.enum(["start", "center", "end"]),
  }),
  // A flexible row of 1-3 columns; each column is either text (heading, formatted text, button) or an image.
  columns: z.object({
    heading: bi,
    layout: z.enum(["equal", "wide-start", "wide-end"]),
    valign: z.enum(["start", "center", "end"]),
    reverseMobile: z.enum(["no", "yes"]),
    gap: z.enum(["sm", "md", "lg"]),
    columns: z
      .array(z.object({ kind: z.enum(["text", "image"]), heading: bi, body: bi, cta, imageUrl: image, imageAlt: bi }))
      .min(1)
      .max(3),
  }),
  faq: z.object({ heading: bi, items: z.array(z.object({ question: bi, answer: bi })).max(200) }),
  stats: z.object({ heading: bi, items: z.array(z.object({ value: z.string().max(40), label: bi, icon: z.string().max(40).regex(/^[A-Za-z0-9]*$/).optional() })).max(8) }),
  cta: z.object({ heading: bi, subtitle: bi, button: cta }),
  form: z.object({ heading: bi, intro: bi, formSlug: z.string().max(60).regex(/^[a-z0-9-]*$/) }),
  // Phone / WhatsApp / email cards, address and hours, all read from Website → Site & Contact.
  contactCards: z.object({ heading: bi, subtitle: bi, whatsappButtonLabel: bi }),
  // The live price calculator: emirate, service, quantity, booking type, summary, agreement and Book.
  bookingCalculator: z.object({ heading: bi, subtitle: bi }),
  // Every active branch (real office) as a card: address, phone, directions and, optionally, its map. Pulled automatically from Website → Locations.
  locations: z.object({ heading: bi, subtitle: bi, showMap: z.enum(["yes", "no"]) }),
  // A small chat: visitors ask about services, prices, the emirates you cover, hours and how to book, and get answers from your own data.
  // Free: no AI service and no key. Suggested questions appear as buttons.
  servicesAssistant: z.object({ heading: bi, subtitle: bi, placeholder: bi, welcome: bi, suggestions: z.array(z.object({ text: bi })).max(6) }),
  // "Find my service" (AI): the visitor describes a problem and gets the matching catalogue services with Book buttons.
  aiServiceFinder: z.object({ heading: bi, subtitle: bi, placeholder: bi, button: bi, examples: z.array(z.object({ text: bi })).max(4) }),
  // Live weather from Open-Meteo (free, no key; listed in github.com/public-apis/public-apis): one emirate with an optional forecast,
  // or a card for every emirate. It loads on the visitor's screen, so it is always current. The tip shows only in hot weather.
  weather: z.object({
    heading: bi, subtitle: bi,
    mode: z.enum(["city", "all"]),
    city: z.enum(WEATHER_CITY_SLUGS),
    forecast: z.enum(["none", "3", "5", "7"]),
    tipText: bi, tipUrl: link, tipFromC: z.number().int().min(15).max(60),
  }),
  // ---- Visual block library (text, images, products & services, conversion) ----
  heading: z.object({ eyebrow: bi, heading: bi, subtitle: bi, align: z.enum(["start", "center"]), size: z.enum(["md", "lg", "xl"]) }),
  // One list block for bullets, numbers and checkmark features; each item may carry its own icon (checkmark lists).
  list: z.object({
    heading: bi, variant: z.enum(["bullet", "check", "number"]), columns: z.enum(["1", "2"]),
    items: z.array(z.object({ icon: iconName.optional(), text: bi })).max(60),
  }),
  quote: z.object({ variant: z.enum(["quote", "highlight"]), text: bi, author: bi, role: bi, accentColor: hexColor.optional() }),
  // A thin bar with one line of text and an optional link (offers, notices).
  announcement: z.object({ text: bi, link: cta, tone: z.enum(["blue", "orange", "green", "dark"]), icon: iconName.optional() }),
  gallery: z.object({
    heading: bi, columns: z.enum(["2", "3", "4"]), ratio: z.enum(["auto", "1:1", "3:2", "16:9"]),
    images: z.array(z.object({ imageUrl: image, alt: bi, caption: bi })).max(40),
  }),
  slider: z.object({
    heading: bi, ratio: z.enum(["16:9", "21:9", "3:2"]), autoplay: yesNo,
    slides: z.array(z.object({ imageUrl: image, heading: bi, text: bi, cta })).max(12),
  }),
  // A full-width banner with its own picture behind a heading, text and a button.
  bgSection: z.object({
    heading: bi, body: bi, cta, align: z.enum(["start", "center"]), height: z.enum(["sm", "md", "lg"]),
    imageUrl: image, overlay: z.number().int().min(0).max(100), overlayColor: hexColor.optional(),
  }),
  // A product or a service shown in full: picture, price, features, rating and buttons. Typed by hand, or filled from the
  // Service Catalogue (source "catalogue": the service's name and its Book / page links come from the catalogue, and anything
  // typed here still wins).
  showcase: z.object({
    kind: z.enum(["product", "service"]),
    source: z.enum(["manual", "catalogue"]),
    catalogueKey: z.string().max(160).optional(),
    imageUrl: image, imageAlt: bi,
    name: bi, subtitle: bi, description: bi,
    price: money, oldPrice: money, currency,
    features: z.array(z.object({ icon: iconName.optional(), text: bi })).max(20),
    badge: z.enum(BADGES),
    primary: cta,
    secondaryType: z.enum(["none", "call", "whatsapp", "learn", "quote", "buy", "custom"]), secondaryLabel: bi, secondaryUrl: link,
    // Price presentation: a small label above/next to the price ("Starting price"), the unit ("Per AC unit"), an automatic
    // "-25%" badge, a heading over the feature list ("What's included?"), extra pictures under the main one, and card styling.
    priceLabel: bi.optional(), priceUnit: bi.optional(), startingFrom: yesNo.optional(), showDiscount: yesNo.optional(), priceColor: hexColor.optional(),
    featuresHeading: bi.optional(),
    gallery: z.array(z.object({ imageUrl: image, alt: bi })).max(8).optional(),
    shadow: z.enum(["none", "sm", "md", "lg"]).optional(), radius: z.enum(["none", "md", "xl", "2xl"]).optional(), buttonStyle: z.enum(["brand", "dark"]).optional(),
    rating: z.number().min(0).max(5).optional(), reviews: z.number().int().min(0).max(10_000_000).optional(),
    bgColor: hexColor.optional(), textColor: hexColor.optional(),
    imagePosition: z.enum(["start", "end", "top"]), layout: z.enum(["split", "card"]),
  }),
  cardsGrid: z.object({
    kind: z.enum(["product", "service"]), heading: bi, subtitle: bi, columns: z.enum(["2", "3", "4"]), currency,
    cards: z.array(z.object({ imageUrl: image, name: bi, description: bi, price: money, oldPrice: money, badge: z.enum(BADGES), cta })).max(24),
  }),
  benefits: z.object({
    eyebrow: bi, heading: bi, subtitle: bi, columns: z.enum(["2", "3", "4"]),
    items: z.array(z.object({ icon: iconName.optional(), title: bi, text: bi })).max(24),
  }),
  pricing: z.object({
    heading: bi, subtitle: bi, currency,
    plans: z.array(z.object({ name: bi, price: money, period: bi, description: bi, features: z.array(z.object({ text: bi })).max(30), badge: bi, highlighted: yesNo, cta })).max(6),
  }),
  comparison: z.object({
    heading: bi, subtitle: bi,
    columns: z.array(z.object({ name: bi, highlighted: yesNo })).min(2).max(4),
    rows: z.array(z.object({ label: bi, values: z.array(z.object({ v: z.string().max(80) })).max(4) })).max(30),
  }),
  beforeAfter: z.object({ heading: bi, subtitle: bi, beforeUrl: image, afterUrl: image, beforeLabel: bi, afterLabel: bi, alt: bi }),
  promo: z.object({
    badge: bi, heading: bi, text: bi, price: money, oldPrice: money, currency,
    endDate: z.string().max(10).regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a date like 2026-12-31."),
    imageUrl: image, cta, accentColor: hexColor.optional(),
  }),
  // Booking, call, WhatsApp, quote and custom buttons. Call and WhatsApp always use the official contact details from Website →
  // Site & Contact (no number is typed here); Book goes to the booking page.
  ctaButtons: z.object({
    heading: bi, subtitle: bi, align: z.enum(["start", "center", "end"]), size: z.enum(["md", "lg"]),
    buttons: z.array(z.object({ kind: z.enum(["book", "call", "whatsapp", "quote", "custom"]), label: bi, url: link })).min(1).max(5),
  }),
  contactBanner: z.object({ heading: bi, subtitle: bi, showBook: yesNo, showCall: yesNo, showWhatsapp: yesNo, tone: z.enum(["dark", "blue", "light"]) }),
  // A link to a Global Block (Website → Global Blocks). The website never sees this type: it is replaced by the global block's
  // current content before the page is served (see globalBlocks.ts).
  global: z.object({ globalId: z.string().max(40) }),
  // Google reviews shown on the site: the summary (overall rating and number of reviews) and a few chosen reviews are typed in by
  // hand, with links to the Google listing and to "write a review". There is no automatic sync with Google.
  googleReviews: z.object({
    heading: bi, subtitle: bi, layout: z.enum(["grid", "carousel"]),
    rating: z.number().min(0).max(5), total: z.number().int().min(0).max(10_000_000),
    googleUrl: link, writeReviewUrl: link,
    reviews: z.array(z.object({ author: z.string().max(80), rating: z.number().min(0).max(5), text: bi, date: z.string().max(40), imageUrl: image })).max(12),
  }),
  // The annual maintenance packages, filled automatically from Website → Maintenance Packages: pricing cards, comparison table,
  // terms and the "Subscribe now" form. A heading or subtitle typed here replaces the one from the packages screen.
  // `group` picks one set of packages (its key from the Maintenance Packages screen); empty = the original home packages.
  // Order on the page: heading, package cards, comparison table, terms and exclusions, then the request form.
  maintenancePackages: z.object({
    heading: bi, subtitle: bi, showComparison: yesNo, showTerms: yesNo,
    group: z.string().max(40).regex(/^[a-z0-9-]*$/, "Use the group's key: lowercase letters, numbers and dashes.").optional(),
    showForm: yesNo.optional(),
  }),
  // The ducted / concealed / semi-central AC installation: package cards, the price table and the interactive calculator that builds a
  // quotation PDF for the customer. Every price, package and optional service is edited under Self-Service Quotations -> Pricing.
  ductedCalculator: z.object({ heading: bi, subtitle: bi, showPricing: yesNo, defaultLang: z.enum(["en", "ar"]) }),
  // The HVAC ductwork smart quotation calculator (system cards, ten steps, live summary, bilingual PDF). Every price, system, component,
  // service and text is edited under Self-Service Quotations → Ductwork pricing.
  ductQuoteCalculator: z.object({ heading: bi, subtitle: bi, showSystems: yesNo, defaultLang: z.enum(["en", "ar"]) }),
  // The Split AC installation packages (cards, price table, conditions) and the instant quotation calculator. Every package, price, extra and
  // text is edited under Self-Service Quotations → Split AC pricing.
  splitQuoteCalculator: z.object({ heading: bi, subtitle: bi, showPackages: yesNo, defaultLang: z.enum(["en", "ar"]) }),
  // An advanced picture: its own size, fit, position, frame, effects (never changing the original file), any kind of link, optional
  // banner text and button on top of it, bilingual alt / title / caption, and separate size / position settings for tablets and phones.
  imagePro: z.object({
    imageUrl: image, alt: bi, title: bi, caption: bi, description: bi, credit: bi, lazy: yesNo, body: bi,
    size: z.object({
      mode: z.enum(["auto", "original", "custom"]), width: z.number().min(0).max(5000), widthUnit: z.enum(["px", "%"]), maxWidth: z.number().min(0).max(5000),
      height: z.number().min(0).max(5000), heightUnit: z.enum(["px", "%"]), maxHeight: z.number().min(0).max(5000),
      fit: z.enum(["cover", "contain", "fill", "none"]), focusX: z.number().min(0).max(100), focusY: z.number().min(0).max(100),
      cropTop: z.number().min(0).max(80), cropRight: z.number().min(0).max(80), cropBottom: z.number().min(0).max(80), cropLeft: z.number().min(0).max(80),
      rotate: z.number().min(0).max(359), flipH: yesNo, flipV: yesNo,
    }),
    position: z.object({
      align: z.enum(["start", "center", "end"]), wrap: z.enum(["none", "start", "end"]), shiftX: z.number().min(0).max(1000), shiftY: z.number().min(0).max(1000),
      marginTop: z.number().min(0).max(300), marginBottom: z.number().min(0).max(300), marginStart: z.number().min(0).max(300), marginEnd: z.number().min(0).max(300), padding: z.number().min(0).max(200),
    }),
    frame: z.object({
      style: z.enum(["none", "thin", "thick", "dashed", "round", "custom"]), width: z.number().min(0).max(30), color: hexColor.optional(), radius: z.number().min(0).max(500),
      shadow: z.enum(["none", "sm", "md", "lg"]), bgColor: hexColor.optional(),
    }),
    effects: z.object({
      opacity: z.number().min(0).max(100), grayscale: z.number().min(0).max(100), blur: z.number().min(0).max(30), overlayColor: hexColor.optional(), overlayOpacity: z.number().min(0).max(100),
      hover: z.enum(["none", "zoom", "lift", "brighten", "color"]),
    }),
    link: z.object({
      type: z.enum(["none", "external", "internal", "service", "product", "booking", "contact", "whatsapp", "phone", "custom"]), url: link, whatsappText: bi,
      newTab: yesNo, nofollow: yesNo, sponsored: yesNo, title: bi,
    }),
    banner: z.object({
      heading: bi, text: bi, buttonLabel: bi, buttonStyle: z.enum(["solid", "outline", "light"]), vertical: z.enum(["start", "center", "end"]), horizontal: z.enum(["start", "center", "end"]),
      textColor: hexColor.optional(), panel: yesNo,
    }),
    tablet: IMAGE_DEVICE, mobile: IMAGE_DEVICE,
  }),
  divider: z.object({ variant: z.enum(["line", "dots", "space"]), size: z.enum(["sm", "md", "lg"]) }),
  // How it works / booking steps / process / timeline: 2-10 steps, each with an icon, title, text and optional picture.
  steps: z.object({
    eyebrow: bi, heading: bi, subtitle: bi, variant: z.enum(["cards", "timeline"]),
    items: z.array(z.object({ icon: iconName.optional(), title: bi, text: bi, imageUrl: image })).max(10),
  }),
  testimonials: z.object({
    heading: bi, subtitle: bi, layout: z.enum(["grid", "carousel"]),
    items: z.array(z.object({ name: bi, role: bi, text: bi, rating: z.number().min(0).max(5).optional(), imageUrl: image })).max(12),
  }),
  // Partner / brand logos, certifications and trust badges. With a picture it is a logo; without, the icon and name make a badge.
  logos: z.object({
    heading: bi, subtitle: bi, grayscale: yesNo,
    items: z.array(z.object({ imageUrl: image, name: bi, icon: iconName.optional(), url: link })).max(24),
  }),
  team: z.object({
    heading: bi, subtitle: bi, columns: z.enum(["2", "3", "4"]),
    members: z.array(z.object({ imageUrl: image, name: bi, role: bi, bio: bi })).max(24),
  }),
  // A video from YouTube or Vimeo (paste the page address) or a .mp4/.webm file (from the media library or an https address).
  video: z.object({
    heading: bi, url: z.string().max(500).regex(/^(|https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/\S+|(https:\/\/\S+|\/api\/media\/\S+)\.(mp4|webm)(\?\S*)?|\/api\/media\/[^/?\s]+)$/, "Use a YouTube or Vimeo address, or a .mp4 / .webm file."),
    poster: image, caption: bi, ratio: z.enum(["16:9", "4:3", "1:1"]),
  }),
} as const;

// Any section can have its own background: an image under a dark overlay, or a plain colour.
const hex = hexColor;
const sectionStyle = z.object({
  bgImage: image.optional(),
  overlay: z.number().int().min(0).max(100).optional(),
  overlayColor: hex.optional(),
  bgColor: hex.optional(),
  // Extra space above and below the block, and where its text sits (for blocks that follow the section alignment).
  spacing: z.enum(["none", "sm", "md", "lg", "xl"]).optional(),
  textAlign: z.enum(["auto", "start", "center", "end"]).optional(),
  // Width of the block's content, rounded corners and shadow of the section, a custom CSS class and an anchor id (#id) to link to.
  width: z.enum(["auto", "medium", "narrow"]).optional(),
  radius: z.enum(["none", "md", "xl", "2xl"]).optional(),
  shadow: z.enum(["none", "sm", "md", "lg"]).optional(),
  cssClass: z.string().max(120).regex(/^[A-Za-z0-9_ -]*$/, "Use letters, numbers, - and _ only.").optional(),
  anchorId: z.string().max(40).regex(/^([A-Za-z][A-Za-z0-9_-]*)?$/, "Start with a letter; use letters, numbers, - and _ only.").optional(),
  // Design: text and accent colours for the block, a border. Responsive: size of the block's content and extra space per device
  // (tablet and phone follow desktop until set). Advanced: entrance animation and a date window in which the block is shown.
  textColor: hex.optional(),
  accentColor: hex.optional(),
  border: z.enum(["none", "thin", "accent"]).optional(),
  fontSizeDesktop: z.enum(["auto", "sm", "lg", "xl"]).optional(),
  fontSizeTablet: z.enum(["inherit", "auto", "sm", "lg", "xl"]).optional(),
  fontSizeMobile: z.enum(["inherit", "auto", "sm", "lg", "xl"]).optional(),
  spacingTablet: z.enum(["inherit", "none", "sm", "md", "lg", "xl"]).optional(),
  spacingMobile: z.enum(["inherit", "none", "sm", "md", "lg", "xl"]).optional(),
  animation: z.enum(["none", "fade", "slideUp"]).optional(),
  showFrom: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a date like 2026-12-01.").optional(),
  showUntil: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a date like 2026-12-31.").optional(),
  // Typography: heading and text size (separately), heading weight and line height; phones can have their own sizes.
  headingSize: z.enum(["auto", "sm", "lg", "xl"]).optional(),
  headingSizeMobile: z.enum(["inherit", "auto", "sm", "lg", "xl"]).optional(),
  textSize: z.enum(["auto", "sm", "lg", "xl"]).optional(),
  textSizeMobile: z.enum(["inherit", "auto", "sm", "lg", "xl"]).optional(),
  headingWeight: z.enum(["auto", "medium", "bold", "extrabold"]).optional(),
  lineHeight: z.enum(["auto", "tight", "relaxed"]).optional(),
  // Owner-only custom code for this block (see blockCode.ts for the rules and how it runs).
  customCss: z.string().superRefine((v, ctx) => { const p = cssProblem(v); if (p) ctx.addIssue({ code: "custom", message: p }); }).optional(),
  customJs: z.string().superRefine((v, ctx) => { const p = jsProblem(v); if (p) ctx.addIssue({ code: "custom", message: p }); }).optional(),
  customJsConsent: z.enum(["always", "analytics", "marketing"]).optional(),
});
const withStyle = <T extends z.ZodRawShape>(s: z.ZodObject<T>) => s.extend({ style: sectionStyle.optional() });

export const BLOCK_SCHEMAS = {
  hero: withStyle(RAW_SCHEMAS.hero),
  servicesGrid: withStyle(RAW_SCHEMAS.servicesGrid),
  blogPreview: withStyle(RAW_SCHEMAS.blogPreview),
  jobsList: withStyle(RAW_SCHEMAS.jobsList),
  subPages: withStyle(RAW_SCHEMAS.subPages),
  serviceCatalog: withStyle(RAW_SCHEMAS.serviceCatalog),
  homeSections: withStyle(RAW_SCHEMAS.homeSections),
  richText: withStyle(RAW_SCHEMAS.richText),
  imageText: withStyle(RAW_SCHEMAS.imageText),
  image: withStyle(RAW_SCHEMAS.image),
  columns: withStyle(RAW_SCHEMAS.columns),
  faq: withStyle(RAW_SCHEMAS.faq),
  stats: withStyle(RAW_SCHEMAS.stats),
  cta: withStyle(RAW_SCHEMAS.cta),
  form: withStyle(RAW_SCHEMAS.form),
  contactCards: withStyle(RAW_SCHEMAS.contactCards),
  bookingCalculator: withStyle(RAW_SCHEMAS.bookingCalculator),
  weather: withStyle(RAW_SCHEMAS.weather),
  aiServiceFinder: withStyle(RAW_SCHEMAS.aiServiceFinder),
  servicesAssistant: withStyle(RAW_SCHEMAS.servicesAssistant),
  locations: withStyle(RAW_SCHEMAS.locations),
  heading: withStyle(RAW_SCHEMAS.heading),
  list: withStyle(RAW_SCHEMAS.list),
  quote: withStyle(RAW_SCHEMAS.quote),
  announcement: withStyle(RAW_SCHEMAS.announcement),
  gallery: withStyle(RAW_SCHEMAS.gallery),
  slider: withStyle(RAW_SCHEMAS.slider),
  bgSection: withStyle(RAW_SCHEMAS.bgSection),
  showcase: withStyle(RAW_SCHEMAS.showcase),
  cardsGrid: withStyle(RAW_SCHEMAS.cardsGrid),
  benefits: withStyle(RAW_SCHEMAS.benefits),
  pricing: withStyle(RAW_SCHEMAS.pricing),
  comparison: withStyle(RAW_SCHEMAS.comparison),
  beforeAfter: withStyle(RAW_SCHEMAS.beforeAfter),
  promo: withStyle(RAW_SCHEMAS.promo),
  ctaButtons: withStyle(RAW_SCHEMAS.ctaButtons),
  contactBanner: withStyle(RAW_SCHEMAS.contactBanner),
  global: RAW_SCHEMAS.global,
  googleReviews: withStyle(RAW_SCHEMAS.googleReviews),
  maintenancePackages: withStyle(RAW_SCHEMAS.maintenancePackages),
  ductedCalculator: withStyle(RAW_SCHEMAS.ductedCalculator),
  ductQuoteCalculator: withStyle(RAW_SCHEMAS.ductQuoteCalculator),
  splitQuoteCalculator: withStyle(RAW_SCHEMAS.splitQuoteCalculator),
  divider: withStyle(RAW_SCHEMAS.divider),
  steps: withStyle(RAW_SCHEMAS.steps),
  testimonials: withStyle(RAW_SCHEMAS.testimonials),
  logos: withStyle(RAW_SCHEMAS.logos),
  team: withStyle(RAW_SCHEMAS.team),
  video: withStyle(RAW_SCHEMAS.video),
  imagePro: withStyle(RAW_SCHEMAS.imagePro),
} as const;

export type BlockType = keyof typeof BLOCK_SCHEMAS;
export const BLOCK_TYPES = Object.keys(BLOCK_SCHEMAS) as BlockType[];

export type Block = {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  hidden: boolean;
  // tablet is optional: blocks saved before it existed follow their desktop setting on tablets.
  visibility: { desktop: boolean; mobile: boolean; tablet?: boolean };
};

// ---- editor field definitions (drive the generic block form) ----
export type ShowIf = { key: string; equals: string };
export type FieldDef = FieldDefBase & { showIf?: ShowIf }; // showIf: only show this field when a sibling field has this value
type FieldDefBase =
  // rich: edited in the visual editor (headings, colours, lists, links, images) instead of a plain text box.
  | { kind: "bi-text" | "bi-textarea"; key: string; label: string; rich?: boolean }
  | { kind: "text" | "textarea" | "url" | "image" | "number" | "color"; key: string; label: string }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: "form-select"; key: string; label: string }
  | { kind: "group"; key: string; label: string; fields: FieldDef[]; collapsible?: boolean }
  | { kind: "list"; key: string; label: string; itemLabel: string; max: number; fields: FieldDef[] };

const align: FieldDef = {
  kind: "select",
  key: "align",
  label: "Alignment",
  options: [
    { value: "start", label: "Start" },
    { value: "center", label: "Center" },
  ],
};
const ctaFields: FieldDef[] = [
  { kind: "bi-text", key: "label", label: "Label" },
  { kind: "url", key: "url", label: "Link" },
];
const opts = (...pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label }));
const iconField: FieldDef = { kind: "select", key: "icon", label: "Icon (checkmark lists use it)", options: [{ value: "", label: "Default" }, ...ICON_NAMES.map((n) => ({ value: n, label: n }))] };
const currencyField: FieldDef = { kind: "select", key: "currency", label: "Currency", options: opts(["AED", "AED – Dirham"], ["USD", "USD – Dollar"], ["SAR", "SAR – Riyal"], ["EUR", "EUR – Euro"]) };
const badgeField: FieldDef = { kind: "select", key: "badge", label: "Badge", options: opts(["none", "No badge"], ["featured", "Featured"], ["popular", "Popular"], ["bestSeller", "Best seller"], ["new", "New"], ["offer", "Special offer"], ["limited", "Limited time"]) };
const cols234 = opts(["2", "2"], ["3", "3"], ["4", "4"]);
const biEmpty = () => ({ en: "", ar: "" });
const ctaEmpty = () => ({ label: biEmpty(), url: "" });

const IMAGE_DEVICE_FIELDS: FieldDef[] = [
  { kind: "number", key: "width", label: "Width (0 = same as desktop)" },
  { kind: "select", key: "widthUnit", label: "Width unit", options: opts(["%", "Percent of the available width"], ["px", "Pixels"]) },
  { kind: "number", key: "maxWidth", label: "Maximum width in pixels (0 = same as desktop)" },
  { kind: "number", key: "height", label: "Height in pixels (0 = same as desktop)" },
  { kind: "number", key: "maxHeight", label: "Maximum height in pixels (0 = same as desktop)" },
  { kind: "select", key: "align", label: "Align", options: opts(["inherit", "Same as desktop"], ["start", "Left (start)"], ["center", "Centre"], ["end", "Right (end)"]) },
  { kind: "select", key: "wrap", label: "Text wrap", options: opts(["inherit", "Same as desktop"], ["none", "None: its own line"], ["start", "Float left"], ["end", "Float right"]) },
  { kind: "select", key: "space", label: "Space around it", options: opts(["inherit", "Same as desktop"], ["none", "None"], ["sm", "Small"], ["md", "Medium"], ["lg", "Large"]) },
];

export const BLOCK_REGISTRY: Record<
  BlockType,
  { label: string; description: string; fields: FieldDef[]; defaults: () => Record<string, unknown> }
> = {
  hero: {
    label: "Hero",
    description: "Big heading, subtitle, image and up to 3 buttons.",
    fields: [
      { kind: "bi-text", key: "eyebrow", label: "Small label above heading" },
      { kind: "bi-text", key: "heading", label: "Heading (H1)" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "image", key: "backgroundImage", label: "Background image (fills the whole hero, under a dark overlay)" },
      { kind: "image", key: "imageUrl", label: "Side image (beside the text)" },
      {
        kind: "select",
        key: "imagePosition",
        label: "Image position",
        options: [
          { value: "end", label: "Beside text (end)" },
          { value: "start", label: "Beside text (start)" },
          { value: "background", label: "Background (older option: use the Background image field above instead)" },
        ],
      },
      { kind: "number", key: "overlay", label: "Overlay strength over the background image, 0–100 (higher = darker)" },
      { kind: "color", key: "overlayColor", label: "Overlay colour" },
      align,
      { kind: "list", key: "ctas", label: "Buttons", itemLabel: "Button", max: 3, fields: ctaFields },
      {
        kind: "select",
        key: "variant",
        label: "Style",
        options: [
          { value: "standard", label: "Standard" },
          { value: "landing", label: "Landing (centered with glow, accent line and badges — the homepage look)" },
        ],
      },
      { kind: "bi-text", key: "headingAccent", label: "Accent line under the heading (Landing style, shown in colour)" },
      {
        kind: "list",
        key: "badges",
        label: "Trust badges (Landing style)",
        itemLabel: "Badge",
        max: 6,
        fields: [
          { kind: "text", key: "icon", label: "Icon name (e.g. ShieldCheck, Clock, BadgeCheck, Wrench)" },
          { kind: "bi-text", key: "label", label: "Label" },
        ],
      },
    ],
    defaults: () => ({ eyebrow: biEmpty(), heading: biEmpty(), subtitle: biEmpty(), imageUrl: "", backgroundImage: "", imagePosition: "end", overlay: 85, overlayColor: "#050b1a", align: "start", ctas: [], variant: "standard", headingAccent: biEmpty(), badges: [] }),
  },
  servicesGrid: {
    label: "Services grid",
    description: "Cards for your services, pulled automatically: your website services, or every service of the Service Catalogue with a Book button on each.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      {
        kind: "select", key: "source", label: "Which services",
        options: [{ value: "website", label: "My website services (the service pages)" }, { value: "catalogue", label: "All services from the Service Catalogue (with Book buttons)" }],
      },
      { kind: "text", key: "category", label: "Only this catalogue category (optional: its English name, e.g. Cleaning Services; empty = all)", showIf: { key: "source", equals: "catalogue" } },
      { kind: "number", key: "limit", label: "Max services to show (type any number, up to 2000)" },
      { kind: "bi-text", key: "eyebrow", label: "Small label above heading (optional)" },
      { kind: "bi-text", key: "viewAllLabel", label: "“View all” link text (optional)" },
      { kind: "url", key: "viewAllUrl", label: "“View all” link" },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty(), limit: 8, source: "website", category: "", eyebrow: biEmpty(), viewAllLabel: biEmpty(), viewAllUrl: "" }),
  },
  blogPreview: {
    label: "Latest blog posts",
    description: "The newest published articles, pulled automatically.",
    fields: [
      { kind: "bi-text", key: "eyebrow", label: "Small label above heading" },
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "number", key: "limit", label: "How many posts (1–12)" },
      { kind: "bi-text", key: "viewAllLabel", label: "“View all” link text" },
      { kind: "url", key: "viewAllUrl", label: "“View all” link" },
    ],
    defaults: () => ({ eyebrow: biEmpty(), heading: biEmpty(), limit: 3, viewAllLabel: biEmpty(), viewAllUrl: "/blog" }),
  },
  jobsList: {
    label: "Open jobs",
    description: "The jobs that are open for applications (from Jobs & Workforce), pulled automatically. Each card opens the job page where people apply.",
    fields: [
      { kind: "bi-text", key: "eyebrow", label: "Small label above heading" },
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-text", key: "subtitle", label: "Text under the heading" },
      { kind: "number", key: "limit", label: "How many jobs (1–24)" },
      { kind: "select", key: "jobType", label: "Show", options: [{ value: "all", label: "All open jobs" }, { value: "DAILY", label: "Daily work only" }, { value: "PERMANENT", label: "Permanent jobs only" }] },
      { kind: "bi-text", key: "emptyText", label: "Message when there are no open jobs" },
      { kind: "bi-text", key: "viewAllLabel", label: "“See all jobs” button text" },
    ],
    defaults: () => ({
      eyebrow: biEmpty(), heading: { en: "Open positions", ar: "الفرص المتاحة" }, subtitle: biEmpty(), limit: 6, jobType: "all",
      emptyText: { en: "No open positions right now. Please check back soon.", ar: "لا توجد فرص متاحة حالياً. تابعنا قريباً." }, viewAllLabel: { en: "See all jobs", ar: "عرض كل الوظائف" },
    }),
  },
  subPages: {
    label: "Sub-pages list",
    description: "Links to the published pages directly under this page in Website → Page Structure (for example a category page listing its services). A page shows here once it is published.",
    fields: [
      { kind: "bi-text", key: "eyebrow", label: "Small label above heading" },
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-text", key: "subtitle", label: "Text under the heading" },
    ],
    defaults: () => ({ eyebrow: biEmpty(), heading: { en: "Our services", ar: "خدماتنا" }, subtitle: biEmpty() }),
  },
  serviceCatalog: {
    label: "Service catalogue (search, categories, Book)",
    description: "All your services from the Service Catalogue: visitors search or pick a category, press Add on several services (or Book on one) and complete ONE booking with all of them. Only published services show.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading (empty = “All our services”)" },
      { kind: "bi-textarea", key: "subtitle", label: "Text under the heading (empty = the standard line)", rich: true },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty() }),
  },
  homeSections: {
    label: "Homepage sections",
    description: "Shows the sections you edit under “Homepage Sections” (sustainability, brands, areas, prime membership…). Edit their content there.",
    fields: [],
    defaults: () => ({}),
  },
  richText: {
    label: "Text",
    description: "A heading and formatted text: headings, bold, colours, lists, links and images.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "body", label: "Body", rich: true },
      align,
    ],
    defaults: () => ({ heading: biEmpty(), body: biEmpty(), align: "start" }),
  },
  imageText: {
    label: "Image + text",
    description: "An image next to a heading, text and optional button.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "body", label: "Body", rich: true },
      { kind: "image", key: "imageUrl", label: "Image" },
      { kind: "bi-text", key: "imageAlt", label: "Image description (alt text)" },
      {
        kind: "select",
        key: "imagePosition",
        label: "Image position",
        options: [
          { value: "end", label: "End" },
          { value: "start", label: "Start" },
        ],
      },
      { kind: "group", key: "cta", label: "Button (optional)", fields: ctaFields },
    ],
    defaults: () => ({ heading: biEmpty(), body: biEmpty(), imageUrl: "", imageAlt: biEmpty(), imagePosition: "end", cta: ctaEmpty() }),
  },
  image: {
    label: "Image",
    description: "A picture on its own: choose its width and shape, add a caption or a link. For a picture BEHIND text, use “Section background” on any block.",
    fields: [
      { kind: "image", key: "imageUrl", label: "Image" },
      { kind: "bi-text", key: "imageAlt", label: "Image description (alt text)" },
      { kind: "bi-text", key: "caption", label: "Caption (optional)" },
      { kind: "url", key: "link", label: "Link when the image is clicked (optional)" },
      {
        kind: "select", key: "size", label: "Width",
        options: [{ value: "content", label: "Narrow (article width)" }, { value: "wide", label: "Wide (page width)" }, { value: "full", label: "Full screen width" }],
      },
      {
        kind: "select", key: "ratio", label: "Shape",
        options: [{ value: "auto", label: "Original shape" }, { value: "16:9", label: "Wide 16:9" }, { value: "3:2", label: "Photo 3:2" }, { value: "21:9", label: "Banner 21:9" }, { value: "1:1", label: "Square" }],
      },
      { kind: "select", key: "rounded", label: "Rounded corners", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
      { kind: "select", key: "align", label: "Position (narrow and wide widths)", options: [{ value: "center", label: "Centre" }, { value: "start", label: "Start" }, { value: "end", label: "End" }] },
    ],
    defaults: () => ({ imageUrl: "", imageAlt: biEmpty(), caption: biEmpty(), link: "", size: "wide", ratio: "auto", rounded: "yes", align: "center" }),
  },
  columns: {
    label: "Columns (flex layout)",
    description: "Put things side by side: for example a heading and text in one column and a picture in the next. Each column is text or an image. Stacks on phones.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading above the columns (optional)" },
      {
        kind: "select", key: "layout", label: "Column widths (2 columns)",
        options: [{ value: "equal", label: "Equal" }, { value: "wide-start", label: "First column wider" }, { value: "wide-end", label: "Second column wider" }],
      },
      { kind: "select", key: "valign", label: "Vertical alignment", options: [{ value: "center", label: "Middle" }, { value: "start", label: "Top" }, { value: "end", label: "Bottom" }] },
      { kind: "select", key: "gap", label: "Space between columns", options: [{ value: "md", label: "Medium" }, { value: "sm", label: "Small" }, { value: "lg", label: "Large" }] },
      { kind: "select", key: "reverseMobile", label: "On phones", options: [{ value: "no", label: "Keep the column order" }, { value: "yes", label: "Show the last column first" }] },
      {
        kind: "list", key: "columns", label: "Columns", itemLabel: "Column", max: 3,
        fields: [
          { kind: "select", key: "kind", label: "This column is", options: [{ value: "text", label: "Text" }, { value: "image", label: "An image" }] },
          { kind: "bi-text", key: "heading", label: "Heading", showIf: { key: "kind", equals: "text" } },
          { kind: "bi-textarea", key: "body", label: "Text", rich: true, showIf: { key: "kind", equals: "text" } },
          { kind: "group", key: "cta", label: "Button (optional)", fields: ctaFields, showIf: { key: "kind", equals: "text" } },
          { kind: "image", key: "imageUrl", label: "Image", showIf: { key: "kind", equals: "image" } },
          { kind: "bi-text", key: "imageAlt", label: "Image description (alt text)", showIf: { key: "kind", equals: "image" } },
        ],
      },
    ],
    defaults: () => ({
      heading: biEmpty(), layout: "equal", valign: "center", gap: "md", reverseMobile: "no",
      columns: [
        { kind: "text", heading: biEmpty(), body: biEmpty(), cta: ctaEmpty(), imageUrl: "", imageAlt: biEmpty() },
        { kind: "image", heading: biEmpty(), body: biEmpty(), cta: ctaEmpty(), imageUrl: "", imageAlt: biEmpty() },
      ],
    }),
  },
  faq: {
    label: "FAQ",
    description: "Questions and answers.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      {
        kind: "list",
        key: "items",
        label: "Questions",
        itemLabel: "Question",
        max: 200,
        fields: [
          { kind: "bi-text", key: "question", label: "Question" },
          { kind: "bi-textarea", key: "answer", label: "Answer", rich: true },
        ],
      },
    ],
    defaults: () => ({ heading: biEmpty(), items: [] }),
  },
  stats: {
    label: "Statistics",
    description: "Up to 8 big numbers with labels.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      {
        kind: "list",
        key: "items",
        label: "Numbers",
        itemLabel: "Number",
        max: 8,
        fields: [
          { kind: "text", key: "value", label: "Value (e.g. 10K+)" },
          { kind: "bi-text", key: "label", label: "Label" },
          { kind: "text", key: "icon", label: "Icon name (optional, e.g. Star, Users, ThumbsUp, MapPin)" },
        ],
      },
    ],
    defaults: () => ({ heading: biEmpty(), items: [] }),
  },
  form: {
    label: "Form",
    description: "A lead form from Website → Forms (contact, quote request…).",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "intro", label: "Intro text", rich: true },
      { kind: "form-select", key: "formSlug", label: "Which form" },
    ],
    defaults: () => ({ heading: biEmpty(), intro: biEmpty(), formSlug: "" }),
  },
  cta: {
    label: "Call to action",
    description: "A heading and a booking/contact button.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "group", key: "button", label: "Button", fields: ctaFields },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty(), button: ctaEmpty() }),
  },
  contactCards: {
    label: "Contact cards",
    description: "WhatsApp, phone and email cards plus address and hours. The details come from Website → Site & Contact.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "bi-text", key: "whatsappButtonLabel", label: "WhatsApp button text (leave empty to hide the button)" },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty(), whatsappButtonLabel: biEmpty() }),
  },
  bookingCalculator: {
    label: "Price calculator & booking",
    description: "The live calculator: emirate, service, quantity, booking type, price summary, agreement and a Book button. Prices come from Dynamic Pricing.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty() }),
  },
  locations: {
    label: "Our locations (branches with maps)",
    description: "All your active branches, pulled automatically from Website → Locations: name, address, phone, opening hours, a Get Directions button and, if you like, an embedded map for each. Good for the Contact page. Emirate pages already show their own branch without this block.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Text under the heading", rich: true },
      { kind: "select", key: "showMap", label: "Map on each card", options: [{ value: "yes", label: "Show an embedded map" }, { value: "no", label: "No map (faster page)" }] },
    ],
    defaults: () => ({ heading: { en: "Our locations", ar: "فروعنا" }, subtitle: biEmpty(), showMap: "yes" }),
  },
  servicesAssistant: {
    label: "Services assistant (free chat)",
    description: "A small chat where visitors ask about your services, prices per emirate, the emirates you cover, opening hours and how to book, and get answers straight away from your own data (Service Catalogue, Dynamic Pricing, Site & Contact). Each answer can carry Book buttons. Free: it needs no AI account, no key and costs nothing per question.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Text under the heading", rich: true },
      { kind: "bi-text", key: "placeholder", label: "Hint inside the message box" },
      { kind: "bi-textarea", key: "welcome", label: "First message from the assistant" },
      { kind: "list", key: "suggestions", label: "Suggested questions shown as buttons (up to 6; empty = the standard ones)", itemLabel: "Question", max: 6, fields: [{ kind: "bi-text", key: "text", label: "Question" }] },
    ],
    defaults: () => ({
      heading: { en: "Ask about our services", ar: "اسأل عن خدماتنا" },
      subtitle: { en: "Prices, areas we cover and how to book: ask and get an answer right away.", ar: "الأسعار والمناطق التي نغطيها وطريقة الحجز: اسأل واحصل على الجواب فوراً." },
      placeholder: { en: "Type your question…", ar: "اكتب سؤالك…" },
      welcome: { en: "Hello! Ask me about a service, a price, the emirates we cover or how to book. You can also describe a problem, like “my AC is not cooling”.", ar: "أهلاً بك! اسألني عن خدمة أو سعر أو الإمارات التي نغطيها أو طريقة الحجز. ويمكنك أيضاً وصف مشكلتك، مثل «المكيف لا يبرد»." },
      suggestions: [],
    }),
  },
  aiServiceFinder: {
    label: "AI service finder",
    description: "The visitor describes the problem in their own words (“the AC is not cooling”) and AI suggests the matching services from your Service Catalogue, each with a Book button. It only ever suggests services you really offer. Needs the ANTHROPIC_API_KEY setting on the admin app; without it the block shows a link to your services instead.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Text under the heading", rich: true },
      { kind: "bi-text", key: "placeholder", label: "Hint inside the box" },
      { kind: "bi-text", key: "button", label: "Button text" },
      { kind: "list", key: "examples", label: "Example problems visitors can tap (up to 4)", itemLabel: "Example", max: 4, fields: [{ kind: "bi-text", key: "text", label: "Example" }] },
    ],
    defaults: () => ({
      heading: { en: "Not sure which service you need?", ar: "لست متأكداً أي خدمة تحتاج؟" },
      subtitle: { en: "Describe the problem and we will suggest the right service.", ar: "صف المشكلة وسنقترح عليك الخدمة المناسبة." },
      placeholder: { en: "For example: my AC is running but not cooling", ar: "مثلاً: المكيف يعمل لكنه لا يبرّد" },
      button: { en: "Find my service", ar: "اعثر على خدمتي" },
      examples: [
        { text: { en: "AC is not cooling", ar: "المكيف لا يبرّد" } },
        { text: { en: "Water leaking from the ceiling", ar: "تسرّب مياه من السقف" } },
        { text: { en: "A light switch stopped working", ar: "مفتاح الإنارة لا يعمل" } },
      ],
    }),
  },
  weather: {
    label: "Weather",
    description: "Live weather for the UAE (temperature, feels-like, humidity, wind and a forecast), for one emirate or all of them. It updates by itself on the visitor's screen. Optional tip that appears only in hot weather, for example “Book an AC service”.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Text under the heading", rich: true },
      { kind: "select", key: "mode", label: "Show", options: [{ value: "city", label: "One emirate (with a forecast)" }, { value: "all", label: "A card for every emirate" }] },
      { kind: "select", key: "city", label: "Emirate", showIf: { key: "mode", equals: "city" }, options: WEATHER_CITIES.map((c) => ({ value: c.slug, label: c.nameEn })) },
      {
        kind: "select", key: "forecast", label: "Forecast", showIf: { key: "mode", equals: "city" },
        options: [{ value: "none", label: "No forecast (today only)" }, { value: "3", label: "3 days" }, { value: "5", label: "5 days" }, { value: "7", label: "7 days" }],
      },
      { kind: "bi-text", key: "tipText", label: "Hot-weather tip (empty = no tip)" },
      { kind: "url", key: "tipUrl", label: "Tip button link (for example /pricing)" },
      { kind: "number", key: "tipFromC", label: "Show the tip from this temperature, in °C (15–60)" },
    ],
    defaults: () => ({
      heading: { en: "Weather today", ar: "الطقس اليوم" }, subtitle: biEmpty(), mode: "city", city: "dubai", forecast: "5",
      tipText: { en: "It is hot out there. Book an AC service before the heat gets worse.", ar: "الجو حار. احجز صيانة المكيف قبل أن يزداد الحر." }, tipUrl: "/pricing", tipFromC: 38,
    }),
  },
  heading: {
    label: "Heading & subtitle",
    description: "A section title with a small label above and a subtitle under it.",
    fields: [
      { kind: "bi-text", key: "eyebrow", label: "Small label above" },
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      align,
      { kind: "select", key: "size", label: "Heading size", options: opts(["md", "Medium"], ["lg", "Large"], ["xl", "Extra large"]) },
    ],
    defaults: () => ({ eyebrow: biEmpty(), heading: { en: "Section title", ar: "عنوان القسم" }, subtitle: biEmpty(), align: "center", size: "lg" }),
  },
  list: {
    label: "List",
    description: "Bullets, numbers or a checkmark features list, each line with its own icon if you like.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading (optional)" },
      { kind: "select", key: "variant", label: "List style", options: opts(["bullet", "Bullets"], ["check", "Checkmarks / icons"], ["number", "Numbers"]) },
      { kind: "select", key: "columns", label: "Columns", options: opts(["1", "1 column"], ["2", "2 columns"]) },
      { kind: "list", key: "items", label: "Items", itemLabel: "Item", max: 60, fields: [{ kind: "bi-text", key: "text", label: "Text" }, iconField] },
    ],
    defaults: () => ({
      heading: biEmpty(), variant: "check", columns: "1",
      items: [{ text: { en: "First point", ar: "النقطة الأولى" }, icon: "" }, { text: { en: "Second point", ar: "النقطة الثانية" }, icon: "" }, { text: { en: "Third point", ar: "النقطة الثالثة" }, icon: "" }],
    }),
  },
  quote: {
    label: "Quote / highlight",
    description: "A pull-quote with the author, or a highlighted note box.",
    fields: [
      { kind: "select", key: "variant", label: "Look", options: opts(["quote", "Quote"], ["highlight", "Highlight box"]) },
      { kind: "bi-textarea", key: "text", label: "Text" },
      { kind: "bi-text", key: "author", label: "Author / title (optional)" },
      { kind: "bi-text", key: "role", label: "Role or place (optional)" },
      { kind: "color", key: "accentColor", label: "Accent colour" },
    ],
    defaults: () => ({ variant: "quote", text: { en: "A short, memorable sentence.", ar: "جملة قصيرة لا تُنسى." }, author: biEmpty(), role: biEmpty() }),
  },
  announcement: {
    label: "Announcement bar",
    description: "A thin bar with one line of news or an offer, and an optional link.",
    fields: [
      { kind: "bi-text", key: "text", label: "Text" },
      { kind: "group", key: "link", label: "Link (optional)", fields: ctaFields },
      { kind: "select", key: "tone", label: "Colour", options: opts(["blue", "Blue"], ["orange", "Orange"], ["green", "Green"], ["dark", "Dark"]) },
      iconField,
    ],
    defaults: () => ({ text: { en: "Free inspection this week!", ar: "فحص مجاني هذا الأسبوع!" }, link: ctaEmpty(), tone: "blue", icon: "Sparkles" }),
  },
  gallery: {
    label: "Image gallery",
    description: "A grid of pictures with optional captions.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading (optional)" },
      { kind: "select", key: "columns", label: "Columns", options: cols234 },
      { kind: "select", key: "ratio", label: "Picture shape", options: opts(["auto", "Natural"], ["1:1", "Square"], ["3:2", "Landscape 3:2"], ["16:9", "Wide 16:9"]) },
      { kind: "list", key: "images", label: "Pictures", itemLabel: "Picture", max: 40, fields: [{ kind: "image", key: "imageUrl", label: "Picture" }, { kind: "bi-text", key: "alt", label: "Description (alt text)" }, { kind: "bi-text", key: "caption", label: "Caption" }] },
    ],
    defaults: () => ({ heading: biEmpty(), columns: "3", ratio: "3:2", images: [{ imageUrl: "", alt: biEmpty(), caption: biEmpty() }, { imageUrl: "", alt: biEmpty(), caption: biEmpty() }, { imageUrl: "", alt: biEmpty(), caption: biEmpty() }] }),
  },
  slider: {
    label: "Image slider",
    description: "Slides one after another, each with a picture, a line of text and a button.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading (optional)" },
      { kind: "select", key: "ratio", label: "Slide shape", options: opts(["16:9", "Wide 16:9"], ["21:9", "Panorama 21:9"], ["3:2", "Landscape 3:2"]) },
      { kind: "select", key: "autoplay", label: "Move by itself", options: opts(["yes", "Yes"], ["no", "No"]) },
      { kind: "list", key: "slides", label: "Slides", itemLabel: "Slide", max: 12, fields: [{ kind: "image", key: "imageUrl", label: "Picture" }, { kind: "bi-text", key: "heading", label: "Heading" }, { kind: "bi-text", key: "text", label: "Text" }, { kind: "group", key: "cta", label: "Button (optional)", fields: ctaFields }] },
    ],
    defaults: () => ({ heading: biEmpty(), ratio: "16:9", autoplay: "yes", slides: [{ imageUrl: "", heading: biEmpty(), text: biEmpty(), cta: ctaEmpty() }, { imageUrl: "", heading: biEmpty(), text: biEmpty(), cta: ctaEmpty() }] }),
  },
  bgSection: {
    label: "Background image section",
    description: "A full-width banner with a picture behind a heading, text and button.",
    fields: [
      { kind: "image", key: "imageUrl", label: "Background picture" },
      { kind: "number", key: "overlay", label: "Darkness over the picture, 0–100" },
      { kind: "color", key: "overlayColor", label: "Overlay colour" },
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "body", label: "Text", rich: true },
      { kind: "group", key: "cta", label: "Button (optional)", fields: ctaFields },
      align,
      { kind: "select", key: "height", label: "Height", options: opts(["sm", "Small"], ["md", "Medium"], ["lg", "Tall"]) },
    ],
    defaults: () => ({ heading: { en: "Your headline here", ar: "عنوانك هنا" }, body: biEmpty(), cta: ctaEmpty(), align: "center", height: "md", imageUrl: "", overlay: 55 }),
  },
  showcase: {
    label: "Product / service showcase",
    description: "One product or service in full: picture, price, features, rating and buttons. Type it by hand or fill it from the Service Catalogue.",
    fields: [
      { kind: "select", key: "kind", label: "This is a", options: opts(["service", "Service"], ["product", "Product"]) },
      { kind: "select", key: "source", label: "Content from", options: opts(["manual", "Typed here"], ["catalogue", "Service Catalogue (name and links come from it)"]) },
      { kind: "text", key: "catalogueKey", label: "Catalogue service (its page name, for example ac-maintenance)", showIf: { key: "source", equals: "catalogue" } },
      { kind: "image", key: "imageUrl", label: "Main picture" },
      { kind: "bi-text", key: "imageAlt", label: "Picture description (alt text)" },
      { kind: "list", key: "gallery", label: "More pictures (shown under the main one)", itemLabel: "Picture", max: 8, fields: [{ kind: "image", key: "imageUrl", label: "Picture" }, { kind: "bi-text", key: "alt", label: "Description (alt text)" }] },
      { kind: "bi-text", key: "name", label: "Name" },
      { kind: "bi-text", key: "subtitle", label: "Subtitle" },
      { kind: "bi-textarea", key: "description", label: "Description", rich: true },
      { kind: "text", key: "price", label: "Price (for example 150)" },
      { kind: "text", key: "oldPrice", label: "Old price, crossed out (optional)" },
      currencyField,
      { kind: "select", key: "startingFrom", label: "“Starting from” price", options: opts(["no", "No"], ["yes", "Yes (label “Starting price”)"]) },
      { kind: "bi-text", key: "priceLabel", label: "Custom price label (for example “Starting price”; empty = automatic)" },
      { kind: "bi-text", key: "priceUnit", label: "Price unit (for example “Per AC unit”)" },
      { kind: "select", key: "showDiscount", label: "Show the discount % (from the old price)", options: opts(["no", "No"], ["yes", "Yes"]) },
      { kind: "color", key: "priceColor", label: "Price colour" },
      { kind: "bi-text", key: "featuresHeading", label: "Heading over the features (for example “What’s included?”)" },
      { kind: "list", key: "features", label: "Features", itemLabel: "Feature", max: 20, fields: [{ kind: "bi-text", key: "text", label: "Text" }, iconField] },
      badgeField,
      { kind: "group", key: "primary", label: "Main button", fields: ctaFields },
      { kind: "select", key: "secondaryType", label: "Second button", options: opts(["none", "None"], ["call", "Call now (official number)"], ["whatsapp", "WhatsApp (official number)"], ["learn", "Learn more (link)"], ["quote", "Request a quote"], ["buy", "Buy now (link)"], ["custom", "Custom (text and link)"]) },
      { kind: "bi-text", key: "secondaryLabel", label: "Second button text (empty = default; call and WhatsApp ignore it)" },
      { kind: "url", key: "secondaryUrl", label: "Second button link (empty = default; call and WhatsApp ignore it)" },
      { kind: "select", key: "buttonStyle", label: "Button style", options: opts(["brand", "Brand blue"], ["dark", "Dark / outlined"]) },
      { kind: "number", key: "rating", label: "Rating, 0–5 (optional)" },
      { kind: "number", key: "reviews", label: "Number of reviews (optional)" },
      { kind: "color", key: "bgColor", label: "Card background colour" },
      { kind: "color", key: "textColor", label: "Text colour" },
      { kind: "select", key: "imagePosition", label: "Picture position", options: opts(["start", "Start"], ["end", "End"], ["top", "Top"]) },
      { kind: "select", key: "layout", label: "Layout", options: opts(["split", "Side by side"], ["card", "Compact card"]) },
      { kind: "select", key: "shadow", label: "Shadow", options: opts(["none", "None"], ["sm", "Soft"], ["md", "Medium"], ["lg", "Strong"]) },
      { kind: "select", key: "radius", label: "Corner roundness", options: opts(["xl", "Rounded"], ["2xl", "Very rounded"], ["md", "Slightly rounded"], ["none", "Square"]) },
    ],
    defaults: () => ({
      kind: "service", source: "manual", imageUrl: "", imageAlt: biEmpty(),
      name: { en: "Service name", ar: "اسم الخدمة" }, subtitle: biEmpty(), description: biEmpty(),
      price: "", oldPrice: "", currency: "AED",
      features: [{ text: { en: "Fast and tidy work", ar: "عمل سريع ومرتب" }, icon: "CheckCircle2" }, { text: { en: "Trained technicians", ar: "فنيون مدرَّبون" }, icon: "CheckCircle2" }],
      badge: "none", primary: { label: { en: "Book now", ar: "احجز الآن" }, url: "/pricing" },
      secondaryType: "whatsapp", secondaryLabel: biEmpty(), secondaryUrl: "", imagePosition: "end", layout: "split",
    }),
  },
  cardsGrid: {
    label: "Product / service cards",
    description: "A grid of cards, each with a picture, name, text, price and button.",
    fields: [
      { kind: "select", key: "kind", label: "These are", options: opts(["service", "Services"], ["product", "Products"]) },
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "select", key: "columns", label: "Columns", options: cols234 },
      currencyField,
      { kind: "list", key: "cards", label: "Cards", itemLabel: "Card", max: 24, fields: [{ kind: "image", key: "imageUrl", label: "Picture" }, { kind: "bi-text", key: "name", label: "Name" }, { kind: "bi-text", key: "description", label: "Short text" }, { kind: "text", key: "price", label: "Price" }, { kind: "text", key: "oldPrice", label: "Old price" }, badgeField, { kind: "group", key: "cta", label: "Button", fields: ctaFields }] },
    ],
    defaults: () => ({
      kind: "service", heading: biEmpty(), subtitle: biEmpty(), columns: "3", currency: "AED",
      cards: [0, 1, 2].map(() => ({ imageUrl: "", name: biEmpty(), description: biEmpty(), price: "", oldPrice: "", badge: "none", cta: ctaEmpty() })),
    }),
  },
  benefits: {
    label: "Features & benefits",
    description: "Icon cards: a short title and text for each benefit.",
    fields: [
      { kind: "bi-text", key: "eyebrow", label: "Small label above" },
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "select", key: "columns", label: "Columns", options: cols234 },
      { kind: "list", key: "items", label: "Benefits", itemLabel: "Benefit", max: 24, fields: [iconField, { kind: "bi-text", key: "title", label: "Title" }, { kind: "bi-text", key: "text", label: "Text" }] },
    ],
    defaults: () => ({
      eyebrow: biEmpty(), heading: { en: "Why choose us", ar: "لماذا نحن" }, subtitle: biEmpty(), columns: "3",
      items: [{ icon: "ShieldCheck", title: { en: "Trusted", ar: "موثوق" }, text: biEmpty() }, { icon: "Clock", title: { en: "On time", ar: "في الموعد" }, text: biEmpty() }, { icon: "Award", title: { en: "Quality", ar: "جودة" }, text: biEmpty() }],
    }),
  },
  pricing: {
    label: "Pricing cards",
    description: "Up to 6 plans side by side with price, features and a button; one can be highlighted.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      currencyField,
      {
        kind: "list", key: "plans", label: "Plans", itemLabel: "Plan", max: 6,
        fields: [
          { kind: "bi-text", key: "name", label: "Plan name" }, { kind: "text", key: "price", label: "Price" }, { kind: "bi-text", key: "period", label: "Per (for example “per visit”)" },
          { kind: "bi-text", key: "description", label: "Short text" },
          { kind: "list", key: "features", label: "What is included", itemLabel: "Line", max: 30, fields: [{ kind: "bi-text", key: "text", label: "Text" }] },
          { kind: "bi-text", key: "badge", label: "Badge text (optional)" },
          { kind: "select", key: "highlighted", label: "Highlight this plan", options: opts(["no", "No"], ["yes", "Yes"]) },
          { kind: "group", key: "cta", label: "Button", fields: ctaFields },
        ],
      },
    ],
    defaults: () => ({
      heading: biEmpty(), subtitle: biEmpty(), currency: "AED",
      plans: [
        { name: { en: "Basic", ar: "الأساسية" }, price: "99", period: { en: "per visit", ar: "للزيارة" }, description: biEmpty(), features: [{ text: { en: "Inspection", ar: "فحص" } }], badge: biEmpty(), highlighted: "no", cta: { label: { en: "Book", ar: "احجز" }, url: "/pricing" } },
        { name: { en: "Standard", ar: "القياسية" }, price: "199", period: { en: "per visit", ar: "للزيارة" }, description: biEmpty(), features: [{ text: { en: "Inspection", ar: "فحص" } }, { text: { en: "Cleaning", ar: "تنظيف" } }], badge: { en: "Popular", ar: "الأكثر طلباً" }, highlighted: "yes", cta: { label: { en: "Book", ar: "احجز" }, url: "/pricing" } },
      ],
    }),
  },
  comparison: {
    label: "Comparison table",
    description: "Compare 2–4 options row by row (for example our packages).",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "list", key: "columns", label: "Columns (the options being compared)", itemLabel: "Option", max: 4, fields: [{ kind: "bi-text", key: "name", label: "Name" }, { kind: "select", key: "highlighted", label: "Highlight", options: opts(["no", "No"], ["yes", "Yes"]) }] },
      { kind: "list", key: "rows", label: "Rows", itemLabel: "Row", max: 30, fields: [{ kind: "bi-text", key: "label", label: "Row title" }, { kind: "list", key: "values", label: "Values, one per option (type ✓, ✗ or any text)", itemLabel: "Value", max: 4, fields: [{ kind: "text", key: "v", label: "Value" }] }] },
    ],
    defaults: () => ({
      heading: biEmpty(), subtitle: biEmpty(),
      columns: [{ name: { en: "Basic", ar: "أساسية" }, highlighted: "no" }, { name: { en: "Premium", ar: "مميزة" }, highlighted: "yes" }],
      rows: [{ label: { en: "Inspection", ar: "الفحص" }, values: [{ v: "✓" }, { v: "✓" }] }, { label: { en: "Warranty", ar: "الضمان" }, values: [{ v: "✗" }, { v: "✓" }] }],
    }),
  },
  beforeAfter: {
    label: "Before & after",
    description: "Two pictures of the same job, with a slider to compare them.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading (optional)" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "image", key: "beforeUrl", label: "Before picture" },
      { kind: "image", key: "afterUrl", label: "After picture" },
      { kind: "bi-text", key: "beforeLabel", label: "Before label" },
      { kind: "bi-text", key: "afterLabel", label: "After label" },
      { kind: "bi-text", key: "alt", label: "Description (alt text)" },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty(), beforeUrl: "", afterUrl: "", beforeLabel: { en: "Before", ar: "قبل" }, afterLabel: { en: "After", ar: "بعد" }, alt: biEmpty() }),
  },
  promo: {
    label: "Promotional offer",
    description: "A highlighted offer with a badge, price, picture, button and an optional countdown date.",
    fields: [
      { kind: "bi-text", key: "badge", label: "Badge (for example “Limited offer”)" },
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "text", label: "Text", rich: true },
      { kind: "text", key: "price", label: "Offer price" },
      { kind: "text", key: "oldPrice", label: "Old price, crossed out" },
      currencyField,
      { kind: "text", key: "endDate", label: "Offer ends (YYYY-MM-DD, optional). Shows a countdown; after this day the offer disappears from the page" },
      { kind: "image", key: "imageUrl", label: "Picture" },
      { kind: "group", key: "cta", label: "Button", fields: ctaFields },
      { kind: "color", key: "accentColor", label: "Accent colour" },
    ],
    defaults: () => ({ badge: { en: "Limited offer", ar: "عرض محدود" }, heading: { en: "Special offer", ar: "عرض خاص" }, text: biEmpty(), price: "", oldPrice: "", currency: "AED", endDate: "", imageUrl: "", cta: { label: { en: "Book now", ar: "احجز الآن" }, url: "/pricing" } }),
  },
  ctaButtons: {
    label: "Action buttons",
    description: "Book now, call, WhatsApp, request a quote or your own buttons. Call and WhatsApp use the official number from Site & Contact.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading (optional)" },
      { kind: "bi-textarea", key: "subtitle", label: "Text (optional)", rich: true },
      { kind: "select", key: "align", label: "Alignment", options: opts(["start", "Start"], ["center", "Center"], ["end", "End"]) },
      { kind: "select", key: "size", label: "Button size", options: opts(["md", "Normal"], ["lg", "Large"]) },
      { kind: "list", key: "buttons", label: "Buttons", itemLabel: "Button", max: 5, fields: [{ kind: "select", key: "kind", label: "Type", options: opts(["book", "Book now"], ["call", "Call now"], ["whatsapp", "WhatsApp"], ["quote", "Request a quote"], ["custom", "Custom link"]) }, { kind: "bi-text", key: "label", label: "Text (empty = default)" }, { kind: "url", key: "url", label: "Link (empty = default; call/WhatsApp ignore it)" }] },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty(), align: "center", size: "lg", buttons: [{ kind: "book", label: biEmpty(), url: "" }, { kind: "whatsapp", label: biEmpty(), url: "" }] }),
  },
  contactBanner: {
    label: "Contact banner",
    description: "A strong banner inviting the visitor to book, call or WhatsApp. Uses the official contact details.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Text", rich: true },
      { kind: "select", key: "showBook", label: "Book button", options: opts(["yes", "Show"], ["no", "Hide"]) },
      { kind: "select", key: "showCall", label: "Call button", options: opts(["yes", "Show"], ["no", "Hide"]) },
      { kind: "select", key: "showWhatsapp", label: "WhatsApp button", options: opts(["yes", "Show"], ["no", "Hide"]) },
      { kind: "select", key: "tone", label: "Colour", options: opts(["dark", "Dark"], ["blue", "Blue"], ["light", "Light"]) },
    ],
    defaults: () => ({ heading: { en: "Need help? We are one tap away", ar: "تحتاج مساعدة؟ نحن على بعد ضغطة" }, subtitle: biEmpty(), showBook: "yes", showCall: "yes", showWhatsapp: "yes", tone: "dark" }),
  },
  global: {
    label: "Global block",
    description: "A reusable block shared by many pages. Edit it once under Website → Global Blocks and every page using it updates.",
    fields: [],
    defaults: () => ({ globalId: "" }),
  },
  googleReviews: {
    label: "Google reviews",
    description: "Your Google rating and number of reviews, a few chosen reviews, and buttons to see all reviews or write one.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "number", key: "rating", label: "Your Google rating (for example 4.8; 0 hides the summary)" },
      { kind: "number", key: "total", label: "Number of Google reviews" },
      { kind: "url", key: "googleUrl", label: "Link to your Google listing (“See all reviews”)" },
      { kind: "url", key: "writeReviewUrl", label: "Link to “Write a review” (leave empty to hide the button)" },
      { kind: "select", key: "layout", label: "Reviews layout", options: opts(["grid", "Grid"], ["carousel", "Carousel"]) },
      { kind: "list", key: "reviews", label: "Chosen reviews (copy real ones from Google)", itemLabel: "Review", max: 12, fields: [{ kind: "text", key: "author", label: "Reviewer name" }, { kind: "number", key: "rating", label: "Stars, 0–5" }, { kind: "bi-textarea", key: "text", label: "Review text (in the language it was written)" }, { kind: "text", key: "date", label: "Date (for example “2 weeks ago”)" }, { kind: "image", key: "imageUrl", label: "Photo (optional)" }] },
    ],
    // The links are Osta's own Google listing. The rating and the count are left at 0: type today's numbers from the listing.
    defaults: () => ({
      heading: { en: "Rated by our customers on Google", ar: "تقييم عملائنا على Google" }, subtitle: biEmpty(), layout: "grid", rating: 0, total: 0,
      googleUrl: "https://www.google.com/maps?cid=8049178210296539638", writeReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJezA0kjb39T4R9imKlu9stG8",
      reviews: [],
    }),
  },
  maintenancePackages: {
    label: "Maintenance packages",
    description: "The annual maintenance packages with prices, included services, comparison table, terms and a Subscribe form. Edit them under Website → Maintenance Packages.",
    fields: [
      { kind: "text", key: "group", label: "Package group key (for example commercial-maintenance; empty = the original home packages)" },
      { kind: "bi-text", key: "heading", label: "Heading (empty = the one from Maintenance Packages)" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle (empty = the one from Maintenance Packages)", rich: true },
      { kind: "select", key: "showComparison", label: "Comparison table (right after the packages)", options: opts(["yes", "Show"], ["no", "Hide"]) },
      { kind: "select", key: "showTerms", label: "Terms, conditions and exclusions", options: opts(["yes", "Show"], ["no", "Hide"]) },
      { kind: "select", key: "showForm", label: "Request form at the bottom of the block", options: opts(["yes", "Show"], ["no", "Hide"]) },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty(), group: "", showComparison: "yes", showTerms: "yes", showForm: "yes" }),
  },
  ductedCalculator: {
    label: "AC installation calculator",
    description: "Installation packages, the price table and a calculator that lets the customer build and download their own quotation. Prices are edited under Self-Service Quotations → Pricing.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading of the calculator section" },
      { kind: "bi-textarea", key: "subtitle", label: "Text under the heading", rich: true },
      { kind: "select", key: "showPricing", label: "Show the packages and the price table above the calculator", options: opts(["yes", "Show"], ["no", "Hide"]) },
      { kind: "select", key: "defaultLang", label: "Language the calculator opens in (the customer can switch inside it)", options: opts(["en", "English"], ["ar", "Arabic"]) },
    ],
    defaults: () => ({ heading: { en: "Calculate Your Ducted AC Installation Cost", ar: "احسب تكلفة تركيب مكيف الدكت الآن" }, subtitle: biEmpty(), showPricing: "yes", defaultLang: "en" }),
  },
  ductQuoteCalculator: {
    label: "Ductwork quotation calculator",
    description: "The three duct systems with their prices and a ten-step calculator that lets the customer build, download and send a ductwork quotation. Everything is edited under Self-Service Quotations → Ductwork pricing.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading of the calculator section" },
      { kind: "bi-textarea", key: "subtitle", label: "Text under the heading", rich: true },
      { kind: "select", key: "showSystems", label: "Show the duct systems and their prices above the calculator", options: opts(["yes", "Show"], ["no", "Hide"]) },
      { kind: "select", key: "defaultLang", label: "Language the calculator opens in (the customer can switch inside it)", options: opts(["en", "English"], ["ar", "Arabic"]) },
    ],
    defaults: () => ({ heading: { en: "HVAC Ductwork – Smart Quotation Calculator", ar: "حاسبة عروض أسعار تصنيع وتركيب الدكت" }, subtitle: biEmpty(), showSystems: "yes", defaultLang: "en" }),
  },
  splitQuoteCalculator: {
    label: "Split AC installation calculator",
    description: "The installation packages with prices, the conditions, and a calculator that lets the customer build, download and share a quotation PDF. Everything is edited under Self-Service Quotations → Split AC pricing.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading of the calculator section" },
      { kind: "bi-textarea", key: "subtitle", label: "Text under the heading", rich: true },
      { kind: "select", key: "showPackages", label: "Show the packages, the price table and the conditions above the calculator", options: opts(["yes", "Show"], ["no", "Hide"]) },
      { kind: "select", key: "defaultLang", label: "Language the calculator opens in (the customer can switch inside it)", options: opts(["en", "English"], ["ar", "Arabic"]) },
    ],
    defaults: () => ({ heading: { en: "Instant Split AC Installation Quotation", ar: "احسب تكلفة تركيب المكيف الآن" }, subtitle: biEmpty(), showPackages: "yes", defaultLang: "en" }),
  },
  imagePro: {
    label: "Image (advanced)",
    description: "A picture with full control: size, fit and crop, rotation, position and text wrap, frame, shadow and hover effects, any kind of link (page, WhatsApp, call, booking), optional title and button ON the picture (a clickable banner), bilingual alt text and caption, and separate settings for tablets and phones. Effects never change the original file.",
    fields: [
      { kind: "image", key: "imageUrl", label: "Image (choose from the media library or upload)" },
      { kind: "bi-text", key: "alt", label: "Alt text (describes the picture for search engines and screen readers)" },
      { kind: "bi-text", key: "title", label: "Image title (tooltip)" },
      { kind: "bi-text", key: "caption", label: "Caption (shown under the picture)" },
      { kind: "bi-textarea", key: "description", label: "Image description (for search engines, not shown)" },
      { kind: "bi-text", key: "credit", label: "Image credit (optional, shown after the caption)" },
      { kind: "select", key: "lazy", label: "Load the picture only when it comes into view (faster page)", options: opts(["yes", "Yes (recommended)"], ["no", "No (use for the first picture on the page)"]) },
      {
        kind: "group", key: "size", label: "Size, fit, crop and rotate", collapsible: true, fields: [
          { kind: "select", key: "mode", label: "Size", options: opts(["auto", "Fill the available width"], ["original", "Original size (never larger than the screen)"], ["custom", "Custom width and height"]) },
          { kind: "number", key: "width", label: "Width (0 = automatic)", showIf: { key: "mode", equals: "custom" } },
          { kind: "select", key: "widthUnit", label: "Width unit", options: opts(["%", "Percent of the available width"], ["px", "Pixels"]), showIf: { key: "mode", equals: "custom" } },
          { kind: "number", key: "height", label: "Height (0 = automatic)", showIf: { key: "mode", equals: "custom" } },
          { kind: "select", key: "heightUnit", label: "Height unit", options: opts(["px", "Pixels"], ["%", "Percent of the width"]), showIf: { key: "mode", equals: "custom" } },
          { kind: "number", key: "maxWidth", label: "Maximum width in pixels (0 = none)" },
          { kind: "number", key: "maxHeight", label: "Maximum height in pixels (0 = none)" },
          { kind: "select", key: "fit", label: "How the picture fills its box", options: opts(["cover", "Cover (fill the box, crop the edges)"], ["contain", "Contain (show all of it)"], ["fill", "Fill (stretch to the box)"], ["none", "Original (no scaling)"]) },
          { kind: "number", key: "focusX", label: "Focus point, left to right, 0–100 (50 = middle)" },
          { kind: "number", key: "focusY", label: "Focus point, top to bottom, 0–100 (50 = middle)" },
          { kind: "number", key: "cropTop", label: "Crop from the top, % of the picture (0–80)" },
          { kind: "number", key: "cropRight", label: "Crop from the right, % (0–80)" },
          { kind: "number", key: "cropBottom", label: "Crop from the bottom, % (0–80)" },
          { kind: "number", key: "cropLeft", label: "Crop from the left, % (0–80)" },
          { kind: "number", key: "rotate", label: "Rotate by degrees clockwise (0–359; 90, 180 and 270 turn it)" },
          { kind: "select", key: "flipH", label: "Flip left to right", options: opts(["no", "No"], ["yes", "Yes"]) },
          { kind: "select", key: "flipV", label: "Flip top to bottom", options: opts(["no", "No"], ["yes", "Yes"]) },
        ],
      },
      {
        kind: "group", key: "position", label: "Position, text wrap and spacing", collapsible: true, fields: [
          { kind: "select", key: "align", label: "Align", options: opts(["start", "Left (start)"], ["center", "Centre"], ["end", "Right (end)"]) },
          { kind: "select", key: "wrap", label: "Text wrap", options: opts(["none", "None: the picture has its own line"], ["start", "Float left: text wraps on the right"], ["end", "Float right: text wraps on the left"]) },
          { kind: "number", key: "shiftX", label: "Custom position: move toward the end by (px)" },
          { kind: "number", key: "shiftY", label: "Custom position: move down by (px)" },
          { kind: "number", key: "marginTop", label: "Margin above (px)" },
          { kind: "number", key: "marginBottom", label: "Margin below (px)" },
          { kind: "number", key: "marginStart", label: "Margin at the start side (px)" },
          { kind: "number", key: "marginEnd", label: "Margin at the end side (px)" },
          { kind: "number", key: "padding", label: "Padding inside the frame (px)" },
        ],
      },
      {
        kind: "group", key: "frame", label: "Frame, shadow and background", collapsible: true, fields: [
          { kind: "select", key: "style", label: "Frame", options: opts(["none", "No frame"], ["thin", "Thin"], ["thick", "Thick"], ["dashed", "Dashed"], ["round", "Round (circle or oval)"], ["custom", "Custom (set below)"]) },
          { kind: "number", key: "width", label: "Border width in pixels (custom frame)", showIf: { key: "style", equals: "custom" } },
          { kind: "color", key: "color", label: "Border colour (thin, thick, dashed and custom frames)" },
          { kind: "number", key: "radius", label: "Corner roundness in pixels (0 = square)" },
          { kind: "select", key: "shadow", label: "Shadow", options: opts(["none", "None"], ["sm", "Soft"], ["md", "Medium"], ["lg", "Strong"]) },
          { kind: "color", key: "bgColor", label: "Background colour behind the picture" },
        ],
      },
      {
        kind: "group", key: "effects", label: "Effects (the original file is never changed)", collapsible: true, fields: [
          { kind: "number", key: "opacity", label: "Opacity, 0–100 (100 = solid)" },
          { kind: "number", key: "grayscale", label: "Black and white, 0–100" },
          { kind: "number", key: "blur", label: "Blur in pixels (0–30)" },
          { kind: "color", key: "overlayColor", label: "Colour layer over the picture" },
          { kind: "number", key: "overlayOpacity", label: "Colour layer strength, 0–100" },
          { kind: "select", key: "hover", label: "When the mouse is over it", options: opts(["none", "Nothing"], ["zoom", "Zoom in"], ["lift", "Lift up"], ["brighten", "Brighten"], ["color", "Show full colour (undo black and white)"]) },
        ],
      },
      {
        kind: "group", key: "link", label: "Link: make the whole picture clickable", collapsible: true, fields: [
          { kind: "select", key: "type", label: "What happens when a visitor clicks it", options: opts(["none", "Nothing"], ["external", "External website"], ["internal", "Page of this website"], ["service", "Service page"], ["product", "Product page"], ["booking", "Booking page"], ["contact", "Contact page"], ["whatsapp", "Open WhatsApp"], ["phone", "Call the company"], ["custom", "Custom link (https://, tel:, mailto:, #anchor)"]) },
          { kind: "url", key: "url", label: "Address (for external, internal, service, product and custom links)" },
          { kind: "bi-text", key: "whatsappText", label: "WhatsApp message (optional, WhatsApp links only)" },
          { kind: "select", key: "newTab", label: "Open in", options: opts(["no", "The same tab"], ["yes", "A new tab"]) },
          { kind: "select", key: "nofollow", label: "Add nofollow (tell search engines not to follow it)", options: opts(["no", "No"], ["yes", "Yes"]) },
          { kind: "select", key: "sponsored", label: "Add sponsored (paid or advertising links)", options: opts(["no", "No"], ["yes", "Yes"]) },
          { kind: "bi-text", key: "title", label: "Link title (tooltip and accessibility)" },
        ],
      },
      {
        kind: "group", key: "banner", label: "Banner: title, text and button on the picture", collapsible: true, fields: [
          { kind: "bi-text", key: "heading", label: "Title on the picture" },
          { kind: "bi-textarea", key: "text", label: "Text on the picture" },
          { kind: "bi-text", key: "buttonLabel", label: "Button text (the button uses the link above; leave empty for no button)" },
          { kind: "select", key: "buttonStyle", label: "Button style", options: opts(["solid", "Solid"], ["outline", "Outline"], ["light", "Light"]) },
          { kind: "select", key: "vertical", label: "Vertical position", options: opts(["start", "Top"], ["center", "Middle"], ["end", "Bottom"]) },
          { kind: "select", key: "horizontal", label: "Horizontal position", options: opts(["start", "Start"], ["center", "Centre"], ["end", "End"]) },
          { kind: "color", key: "textColor", label: "Text colour (default white)" },
          { kind: "select", key: "panel", label: "Dark panel behind the text (easier to read)", options: opts(["no", "No"], ["yes", "Yes"]) },
        ],
      },
      { kind: "group", key: "tablet", label: "Tablet settings (leave on “same as desktop” to inherit)", collapsible: true, fields: IMAGE_DEVICE_FIELDS },
      { kind: "group", key: "mobile", label: "Phone settings (leave on “same as desktop” to inherit)", collapsible: true, fields: IMAGE_DEVICE_FIELDS },
      { kind: "bi-textarea", key: "body", label: "Text beside the picture (optional: with “Float left / right” in Position, this text wraps around the picture)", rich: true },
    ],
    defaults: () => ({
      imageUrl: "", alt: biEmpty(), title: biEmpty(), caption: biEmpty(), description: biEmpty(), credit: biEmpty(), lazy: "yes", body: biEmpty(),
      size: { mode: "auto", width: 0, widthUnit: "%", maxWidth: 0, height: 0, heightUnit: "px", maxHeight: 0, fit: "cover", focusX: 50, focusY: 50, cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0, rotate: 0, flipH: "no", flipV: "no" },
      position: { align: "center", wrap: "none", shiftX: 0, shiftY: 0, marginTop: 0, marginBottom: 0, marginStart: 0, marginEnd: 0, padding: 0 },
      frame: { style: "none", width: 2, radius: 12, shadow: "none" },
      effects: { opacity: 100, grayscale: 0, blur: 0, overlayOpacity: 0, hover: "none" },
      link: { type: "none", url: "", whatsappText: biEmpty(), newTab: "no", nofollow: "no", sponsored: "no", title: biEmpty() },
      banner: { heading: biEmpty(), text: biEmpty(), buttonLabel: biEmpty(), buttonStyle: "solid", vertical: "center", horizontal: "center", panel: "no" },
      tablet: { width: 0, widthUnit: "%", maxWidth: 0, height: 0, maxHeight: 0, align: "inherit", wrap: "inherit", space: "inherit" },
      mobile: { width: 0, widthUnit: "%", maxWidth: 0, height: 0, maxHeight: 0, align: "inherit", wrap: "inherit", space: "inherit" },
    }),
  },
  divider: {
    label: "Divider",
    description: "A line, dots or empty space between two parts of the page.",
    fields: [
      { kind: "select", key: "variant", label: "Look", options: opts(["line", "Line"], ["dots", "Dots"], ["space", "Empty space"]) },
      { kind: "select", key: "size", label: "Space around it", options: opts(["sm", "Small"], ["md", "Medium"], ["lg", "Large"]) },
    ],
    defaults: () => ({ variant: "line", size: "md" }),
  },
  steps: {
    label: "Steps / process",
    description: "How it works: 2–10 numbered steps with an icon, title, text and optional picture; as cards or a timeline.",
    fields: [
      { kind: "bi-text", key: "eyebrow", label: "Small label above" },
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "select", key: "variant", label: "Look", options: opts(["cards", "Cards in a row"], ["timeline", "Vertical timeline"]) },
      { kind: "list", key: "items", label: "Steps", itemLabel: "Step", max: 10, fields: [iconField, { kind: "bi-text", key: "title", label: "Title" }, { kind: "bi-text", key: "text", label: "Text" }, { kind: "image", key: "imageUrl", label: "Picture (optional)" }] },
    ],
    defaults: () => ({
      eyebrow: biEmpty(), heading: { en: "How it works", ar: "كيف تعمل الخدمة" }, subtitle: biEmpty(), variant: "cards",
      items: [
        { icon: "CalendarCheck", title: { en: "Book online", ar: "احجز أونلاين" }, text: biEmpty(), imageUrl: "" },
        { icon: "UserCheck", title: { en: "We visit you", ar: "نزورك" }, text: biEmpty(), imageUrl: "" },
        { icon: "CheckCircle2", title: { en: "Job done", ar: "تم العمل" }, text: biEmpty(), imageUrl: "" },
      ],
    }),
  },
  testimonials: {
    label: "Customer testimonials",
    description: "Reviews from customers with name, role, stars and a photo; in a grid or a carousel.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "select", key: "layout", label: "Layout", options: opts(["grid", "Grid"], ["carousel", "Carousel"]) },
      { kind: "list", key: "items", label: "Testimonials", itemLabel: "Testimonial", max: 12, fields: [{ kind: "bi-textarea", key: "text", label: "What the customer said" }, { kind: "bi-text", key: "name", label: "Name" }, { kind: "bi-text", key: "role", label: "Role or place (optional)" }, { kind: "number", key: "rating", label: "Stars, 0–5 (0 = none)" }, { kind: "image", key: "imageUrl", label: "Photo (optional)" }] },
    ],
    defaults: () => ({
      heading: { en: "What our customers say", ar: "آراء عملائنا" }, subtitle: biEmpty(), layout: "grid",
      items: [{ text: biEmpty(), name: biEmpty(), role: biEmpty(), rating: 5, imageUrl: "" }, { text: biEmpty(), name: biEmpty(), role: biEmpty(), rating: 5, imageUrl: "" }, { text: biEmpty(), name: biEmpty(), role: biEmpty(), rating: 5, imageUrl: "" }],
    }),
  },
  logos: {
    label: "Logos & trust badges",
    description: "Partner and brand logos, certifications and trust badges (a picture, or an icon with a name).",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "select", key: "grayscale", label: "Show logos in grey until hovered", options: opts(["no", "No"], ["yes", "Yes"]) },
      { kind: "list", key: "items", label: "Items", itemLabel: "Item", max: 24, fields: [{ kind: "image", key: "imageUrl", label: "Logo picture (leave empty for an icon badge)" }, { kind: "bi-text", key: "name", label: "Name" }, iconField, { kind: "url", key: "url", label: "Link (optional)" }] },
    ],
    defaults: () => ({
      heading: { en: "Trusted by", ar: "موثوق من" }, subtitle: biEmpty(), grayscale: "no",
      items: [{ imageUrl: "", name: { en: "Licensed technicians", ar: "فنيون مرخّصون" }, icon: "BadgeCheck", url: "" }, { imageUrl: "", name: { en: "Warranty included", ar: "ضمان مشمول" }, icon: "ShieldCheck", url: "" }, { imageUrl: "", name: { en: "Satisfaction guaranteed", ar: "رضاك مضمون" }, icon: "ThumbsUp", url: "" }],
    }),
  },
  team: {
    label: "Team members",
    description: "Photos, names and roles of your people.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle", rich: true },
      { kind: "select", key: "columns", label: "Columns", options: cols234 },
      { kind: "list", key: "members", label: "People", itemLabel: "Person", max: 24, fields: [{ kind: "image", key: "imageUrl", label: "Photo" }, { kind: "bi-text", key: "name", label: "Name" }, { kind: "bi-text", key: "role", label: "Role" }, { kind: "bi-text", key: "bio", label: "Short bio (optional)" }] },
    ],
    defaults: () => ({ heading: { en: "Meet our team", ar: "تعرّف على فريقنا" }, subtitle: biEmpty(), columns: "3", members: [0, 1, 2].map(() => ({ imageUrl: "", name: biEmpty(), role: biEmpty(), bio: biEmpty() })) }),
  },
  video: {
    label: "Video",
    description: "A YouTube or Vimeo video, or a .mp4 / .webm file, with an optional heading and caption.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading (optional)" },
      { kind: "text", key: "url", label: "Video address (YouTube or Vimeo page, or a .mp4 / .webm file)" },
      { kind: "image", key: "poster", label: "Cover picture (for a .mp4 / .webm file)" },
      { kind: "bi-text", key: "caption", label: "Caption (optional)" },
      { kind: "select", key: "ratio", label: "Shape", options: opts(["16:9", "Wide 16:9"], ["4:3", "Classic 4:3"], ["1:1", "Square"]) },
    ],
    defaults: () => ({ heading: biEmpty(), url: "", poster: "", caption: biEmpty(), ratio: "16:9" }),
  },
};

// Every block (except the hero, which has its own background controls) can take a section background.
const SPACING_OPTIONS = [{ value: "none", label: "Standard" }, { value: "sm", label: "A little more" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "Extra large" }];
const FONT_OPTIONS = [{ value: "auto", label: "As designed" }, { value: "sm", label: "Smaller" }, { value: "lg", label: "Larger" }, { value: "xl", label: "Much larger" }];

// Which tab of a block's settings each section-design field belongs to (Content is the block's own fields).
export const STYLE_TABS = {
  design: ["bgImage", "overlay", "overlayColor", "bgColor", "textColor", "headingSize", "headingWeight", "textSize", "lineHeight", "accentColor", "border", "radius", "shadow"],
  layout: ["width", "spacing", "textAlign"],
  advanced: ["anchorId", "cssClass", "animation", "showFrom", "showUntil"],
  responsive: ["spacingTablet", "spacingMobile", "headingSizeMobile", "textSizeMobile", "fontSizeDesktop", "fontSizeTablet", "fontSizeMobile"],
} as const;
export type StyleTab = keyof typeof STYLE_TABS;

const STYLE_FIELD: FieldDef = {
  kind: "group",
  key: "style",
  label: "Section design (background, spacing, corners…)",
  fields: [
    { kind: "image", key: "bgImage", label: "Background image" },
    { kind: "number", key: "overlay", label: "Overlay strength over the image, 0–100 (higher = darker)" },
    { kind: "color", key: "overlayColor", label: "Overlay colour" },
    { kind: "color", key: "bgColor", label: "Plain background colour (used when there is no image)" },
    { kind: "color", key: "textColor", label: "Text colour" },
    { kind: "select", key: "headingSize", label: "Heading size", options: [{ value: "auto", label: "As designed" }, { value: "sm", label: "Smaller" }, { value: "lg", label: "Larger" }, { value: "xl", label: "Much larger" }] },
    { kind: "select", key: "headingWeight", label: "Heading weight", options: [{ value: "auto", label: "As designed" }, { value: "medium", label: "Medium" }, { value: "bold", label: "Bold" }, { value: "extrabold", label: "Extra bold" }] },
    { kind: "select", key: "textSize", label: "Text size", options: [{ value: "auto", label: "As designed" }, { value: "sm", label: "Smaller" }, { value: "lg", label: "Larger" }, { value: "xl", label: "Much larger" }] },
    { kind: "select", key: "lineHeight", label: "Line height", options: [{ value: "auto", label: "As designed" }, { value: "tight", label: "Tight" }, { value: "relaxed", label: "Relaxed" }] },
    { kind: "color", key: "accentColor", label: "Accent colour (buttons, icons and highlights)" },
    { kind: "select", key: "border", label: "Border", options: [{ value: "none", label: "None" }, { value: "thin", label: "Thin" }, { value: "accent", label: "Accent colour" }] },
    { kind: "select", key: "spacing", label: "Extra space above and below (desktop)", options: SPACING_OPTIONS },
    { kind: "select", key: "spacingTablet", label: "Extra space on tablets", options: [{ value: "inherit", label: "Same as desktop" }, ...SPACING_OPTIONS] },
    { kind: "select", key: "spacingMobile", label: "Extra space on phones", options: [{ value: "inherit", label: "Same as desktop" }, ...SPACING_OPTIONS] },
    { kind: "select", key: "headingSizeMobile", label: "Heading size on phones", options: [{ value: "inherit", label: "Same as other devices" }, ...FONT_OPTIONS] },
    { kind: "select", key: "textSizeMobile", label: "Text size on phones", options: [{ value: "inherit", label: "Same as other devices" }, ...FONT_OPTIONS] },
    { kind: "select", key: "fontSizeDesktop", label: "Content size on desktop", options: FONT_OPTIONS },
    { kind: "select", key: "fontSizeTablet", label: "Content size on tablets", options: [{ value: "inherit", label: "Same as desktop" }, ...FONT_OPTIONS] },
    { kind: "select", key: "fontSizeMobile", label: "Content size on phones", options: [{ value: "inherit", label: "Same as desktop" }, ...FONT_OPTIONS] },
    { kind: "select", key: "animation", label: "Entrance animation", options: [{ value: "none", label: "None" }, { value: "fade", label: "Fade in" }, { value: "slideUp", label: "Slide up" }] },
    { kind: "text", key: "showFrom", label: "Show from (YYYY-MM-DD, optional)" },
    { kind: "text", key: "showUntil", label: "Show until the end of (YYYY-MM-DD, optional)" },
    { kind: "select", key: "textAlign", label: "Text alignment (blocks that follow it)", options: [{ value: "auto", label: "As designed" }, { value: "start", label: "Start" }, { value: "center", label: "Centre" }, { value: "end", label: "End" }] },
    { kind: "select", key: "width", label: "Content width", options: [{ value: "auto", label: "As designed" }, { value: "medium", label: "Medium" }, { value: "narrow", label: "Narrow" }] },
    { kind: "select", key: "radius", label: "Section corners", options: [{ value: "none", label: "Square" }, { value: "md", label: "Slightly rounded" }, { value: "xl", label: "Rounded" }, { value: "2xl", label: "Very rounded" }] },
    { kind: "select", key: "shadow", label: "Section shadow", options: [{ value: "none", label: "None" }, { value: "sm", label: "Soft" }, { value: "md", label: "Medium" }, { value: "lg", label: "Strong" }] },
    { kind: "text", key: "anchorId", label: "Anchor ID (link to this block with #id, for example offers)" },
    { kind: "text", key: "cssClass", label: "Custom CSS class (advanced; the class must exist in Page Code)" },
  ],
};
export const STYLE_FIELDS: FieldDef[] = STYLE_FIELD.kind === "group" ? STYLE_FIELD.fields : [];
for (const type of Object.keys(BLOCK_REGISTRY) as BlockType[]) if (type !== "hero" && type !== "global") BLOCK_REGISTRY[type].fields.push(STYLE_FIELD);

export function newBlockId(): string {
  return `blk_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function createBlock(type: BlockType): Block {
  return { id: newBlockId(), type, props: BLOCK_REGISTRY[type].defaults(), hidden: false, visibility: { desktop: true, mobile: true } };
}

const envelope = z.object({
  id: z.string().min(1).max(60),
  type: z.enum(BLOCK_TYPES as [BlockType, ...BlockType[]]),
  props: z.record(z.string(), z.unknown()),
  hidden: z.boolean(),
  visibility: z.object({ desktop: z.boolean(), mobile: z.boolean(), tablet: z.boolean().optional() }),
});

// Validates every block against its own schema. Never trusts client JSON.
export function parseBlocks(input: unknown): { ok: true; blocks: Block[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: "Blocks must be a list." };
  if (input.length > 200) return { ok: false, error: "A page can have at most 200 blocks." };
  const blocks: Block[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of input.entries()) {
    const env = envelope.safeParse(raw);
    if (!env.success) return { ok: false, error: `Block ${i + 1} is malformed.` };
    if (seen.has(env.data.id)) return { ok: false, error: `Block ${i + 1} has a duplicate id.` };
    seen.add(env.data.id);
    const props = BLOCK_SCHEMAS[env.data.type].safeParse(env.data.props);
    if (!props.success) {
      const issue = props.error.issues[0];
      return { ok: false, error: `${BLOCK_REGISTRY[env.data.type].label} block ${i + 1}: ${issue.path.join(".") || "content"} — ${issue.message}` };
    }
    blocks.push({ ...env.data, props: props.data as Record<string, unknown> });
  }
  return { ok: true, blocks };
}
