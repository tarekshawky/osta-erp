import { createBlock, type Block, type BlockType } from "./blocks";

// The "Add block" library: every block an admin can add, grouped in categories, with an icon, a short description and a
// wireframe for the thumbnail and the preview. Many entries are ready-made presets of one block type (for example a
// bullet list and a checkmark list are both the "list" block), so a page built from them stays editable like any block.

export type LibraryCategory = "text" | "images" | "products" | "buttons" | "trust" | "process" | "dynamic";

export const LIBRARY_CATEGORIES: { id: LibraryCategory; label: string; hint: string }[] = [
  { id: "text", label: "Text & content", hint: "Headings, text, lists, quotes and announcements" },
  { id: "images", label: "Images & layouts", hint: "Pictures, columns, galleries and sliders" },
  { id: "products", label: "Products & services", hint: "Showcases, cards, pricing and offers" },
  { id: "buttons", label: "Buttons & conversion", hint: "Book, call, WhatsApp and quote buttons" },
  { id: "trust", label: "Trust & social proof", hint: "Reviews, logos, badges and your team" },
  { id: "process", label: "How it works", hint: "Steps, timelines and processes" },
  { id: "dynamic", label: "Dynamic blocks", hint: "Filled automatically from the site's data" },
];

// ---- wireframes ----
// A wireframe is rows; a row is cells shown side by side on desktop and stacked on a phone.
//   T title · t subtitle · p paragraph · i image · I tall image · b button · bb two buttons · c card · k icon card
//   q quote · s stat · r table row · f form field · a bar · x tick list · n price card · g gallery tile · d dots
export type WireCell = "T" | "t" | "p" | "i" | "I" | "b" | "bb" | "c" | "k" | "q" | "s" | "r" | "f" | "a" | "x" | "n" | "g" | "d";
export type Wire = { rows: WireCell[][]; tone?: "light" | "dark" | "image"; center?: boolean };

const row = (...cells: WireCell[]): WireCell[] => cells;

export type LibraryEntry = {
  id: string;
  category: LibraryCategory;
  name: string;
  description: string;
  // A Lucide icon name (drawn by the library component).
  icon: string;
  type: BlockType;
  // Turns the block type's defaults into this preset.
  patch?: (props: Record<string, unknown>) => Record<string, unknown>;
  wire: Wire;
  keywords?: string;
};

const bi = (en: string, ar: string) => ({ en, ar });
const set = (extra: Record<string, unknown>) => (p: Record<string, unknown>) => ({ ...p, ...extra });
const btn = (kind: string) => ({ kind, label: { en: "", ar: "" }, url: "" });

export const LIBRARY: LibraryEntry[] = [
  // ---- A. Text & content ----
  { id: "simple-text", category: "text", name: "Simple text", description: "A paragraph of plain text.", icon: "Type", type: "richText", wire: { rows: [row("p"), row("p")] },
    patch: set({ body: bi("Write your text here.", "اكتب نصك هنا.") }), keywords: "paragraph" },
  { id: "rich-text", category: "text", name: "Rich text editor", description: "Headings, colours, lists, links and pictures in one text.", icon: "PenLine", type: "richText", wire: { rows: [row("T"), row("p"), row("x")] }, keywords: "wysiwyg formatted" },
  { id: "heading-subtitle", category: "text", name: "Heading & subtitle", description: "A section title with a small label and a subtitle.", icon: "Heading", type: "heading", wire: { rows: [row("t"), row("T"), row("t")], center: true } },
  { id: "bullet-list", category: "text", name: "Bullet list", description: "A simple list with bullets.", icon: "List", type: "list", wire: { rows: [row("T"), row("x")] }, patch: set({ variant: "bullet" }) },
  { id: "check-list", category: "text", name: "Checkmark features list", description: "Features with tick or custom icons, in one or two columns.", icon: "ListChecks", type: "list", wire: { rows: [row("T"), row("x", "x")] }, patch: set({ variant: "check", columns: "2" }), keywords: "features ticks" },
  { id: "quote", category: "text", name: "Quote", description: "A pull-quote with the author's name.", icon: "Quote", type: "quote", wire: { rows: [row("q")], center: true }, patch: set({ variant: "quote" }) },
  { id: "highlight", category: "text", name: "Highlight box", description: "A coloured note that stands out from the text.", icon: "Highlighter", type: "quote", wire: { rows: [row("q")] }, patch: set({ variant: "highlight" }), keywords: "callout note" },
  { id: "announcement", category: "text", name: "Announcement bar", description: "A thin bar with one line of news or an offer.", icon: "Megaphone", type: "announcement", wire: { rows: [row("a")] }, keywords: "banner notice offer" },

  // ---- B. Images & layouts ----
  { id: "image-only", category: "images", name: "Image only", description: "One picture with an optional caption and link.", icon: "Image", type: "image", wire: { rows: [row("I")] } },
  { id: "image-text", category: "images", name: "Image + text", description: "A picture on the start side, text and a button next to it.", icon: "PanelLeft", type: "imageText", wire: { rows: [row("i", "p")] }, patch: set({ imagePosition: "start" }) },
  { id: "text-image", category: "images", name: "Text + image", description: "Text and a button first, the picture on the other side.", icon: "PanelRight", type: "imageText", wire: { rows: [row("p", "i")] }, patch: set({ imagePosition: "end" }) },
  {
    id: "two-columns", category: "images", name: "Two columns", description: "Two blocks of text side by side; stacks on phones.", icon: "Columns2", type: "columns", wire: { rows: [row("p", "p")] },
    patch: (p) => ({ ...p, columns: [0, 1].map(() => ({ kind: "text", heading: bi("", ""), body: bi("", ""), cta: { label: bi("", ""), url: "" }, imageUrl: "", imageAlt: bi("", "") })) }),
  },
  {
    id: "three-columns", category: "images", name: "Three columns", description: "Three blocks side by side; stacks on phones.", icon: "Columns3", type: "columns", wire: { rows: [row("p", "p", "p")] },
    patch: (p) => ({ ...p, columns: [0, 1, 2].map(() => ({ kind: "text", heading: bi("", ""), body: bi("", ""), cta: { label: bi("", ""), url: "" }, imageUrl: "", imageAlt: bi("", "") })) }),
  },
  { id: "gallery", category: "images", name: "Image gallery", description: "A grid of pictures with captions.", icon: "GalleryHorizontal", type: "gallery", wire: { rows: [row("g", "g", "g"), row("g", "g", "g")] } },
  { id: "slider", category: "images", name: "Image slider", description: "Pictures that slide one after another.", icon: "GalleryThumbnails", type: "slider", wire: { rows: [row("I"), row("d")] }, keywords: "carousel" },
  { id: "bg-section", category: "images", name: "Background image section", description: "A full-width banner with a picture behind a heading and button.", icon: "ImagePlus", type: "bgSection", wire: { rows: [row("T"), row("t"), row("b")], tone: "image", center: true }, keywords: "banner parallax" },

  // ---- C. Products & services ----
  { id: "product-showcase", category: "products", name: "Product showcase", description: "A product with picture, price, features, rating and buttons.", icon: "ShoppingBag", type: "showcase", wire: { rows: [row("I", "T"), row("x"), row("bb")] }, patch: set({ kind: "product", name: bi("Product name", "اسم المنتج") }) },
  { id: "service-showcase", category: "products", name: "Service showcase", description: "A service shown in full, typed by hand or filled from the Service Catalogue.", icon: "Wrench", type: "showcase", wire: { rows: [row("I", "T"), row("x"), row("bb")] }, patch: set({ kind: "service" }), keywords: "catalogue" },
  { id: "featured-product", category: "products", name: "Featured product", description: "A compact highlighted product card with a badge.", icon: "Star", type: "showcase", wire: { rows: [row("i"), row("T"), row("bb")], center: true }, patch: set({ kind: "product", layout: "card", imagePosition: "top", badge: "featured", name: bi("Featured product", "المنتج المميز") }) },
  { id: "product-cards", category: "products", name: "Product cards grid", description: "A grid of product cards with price and button.", icon: "LayoutGrid", type: "cardsGrid", wire: { rows: [row("c", "c", "c")] }, patch: set({ kind: "product" }) },
  { id: "service-cards", category: "products", name: "Service cards grid", description: "A grid of service cards with price and button.", icon: "Grid2x2", type: "cardsGrid", wire: { rows: [row("c", "c", "c")] }, patch: set({ kind: "service" }) },
  { id: "benefits", category: "products", name: "Features & benefits", description: "Icon cards: a title and a line for each benefit.", icon: "BadgeCheck", type: "benefits", wire: { rows: [row("T"), row("k", "k", "k")] } },
  { id: "pricing", category: "products", name: "Pricing cards", description: "Plans side by side; one can be highlighted.", icon: "CircleDollarSign", type: "pricing", wire: { rows: [row("n", "n", "n")] }, keywords: "plans packages" },
  { id: "comparison", category: "products", name: "Product comparison", description: "A table comparing 2–4 options row by row.", icon: "Table", type: "comparison", wire: { rows: [row("T"), row("r"), row("r"), row("r")] } },
  { id: "before-after", category: "products", name: "Before & after", description: "Two pictures of the same job with a comparison slider.", icon: "SplitSquareHorizontal", type: "beforeAfter", wire: { rows: [row("i", "i")] } },
  { id: "promo", category: "products", name: "Promotional offer", description: "A highlighted offer with price, picture and a countdown.", icon: "BadgePercent", type: "promo", wire: { rows: [row("T", "i"), row("b")], tone: "dark" }, keywords: "discount sale countdown" },

  // ---- D. Buttons & conversion ----
  { id: "book-now", category: "buttons", name: "Book now", description: "A big button that opens the booking page.", icon: "CalendarCheck", type: "ctaButtons", wire: { rows: [row("T"), row("b")], center: true }, patch: set({ heading: bi("Ready to book?", "جاهز للحجز؟"), buttons: [btn("book")] }) },
  { id: "call-now", category: "buttons", name: "Call now", description: "A button that calls the official Osta number.", icon: "Phone", type: "ctaButtons", wire: { rows: [row("T"), row("b")], center: true }, patch: set({ heading: bi("Prefer to talk?", "تفضّل الاتصال؟"), buttons: [btn("call")] }) },
  { id: "whatsapp", category: "buttons", name: "WhatsApp", description: "A button that opens WhatsApp with the official number.", icon: "MessageCircle", type: "ctaButtons", wire: { rows: [row("T"), row("b")], center: true }, patch: set({ heading: bi("Chat with us", "تواصل معنا"), buttons: [btn("whatsapp")] }) },
  { id: "request-quote", category: "buttons", name: "Request a quote", description: "A button that sends the visitor to the contact page.", icon: "FileText", type: "ctaButtons", wire: { rows: [row("T"), row("b")], center: true }, patch: set({ heading: bi("Need a price?", "تحتاج عرض سعر؟"), buttons: [btn("quote")] }), keywords: "estimate" },
  { id: "multi-cta", category: "buttons", name: "Multiple CTA buttons", description: "Book, call and WhatsApp buttons together.", icon: "MousePointerClick", type: "ctaButtons", wire: { rows: [row("T"), row("bb")], center: true }, patch: set({ buttons: [btn("book"), btn("call"), btn("whatsapp")] }) },
  { id: "contact-banner", category: "buttons", name: "Contact banner", description: "A strong banner inviting the visitor to book, call or WhatsApp.", icon: "Headset", type: "contactBanner", wire: { rows: [row("T", "bb")], tone: "dark" } },
  { id: "cta", category: "buttons", name: "Call to action", description: "A heading, a line of text and one button of your choice.", icon: "Rocket", type: "cta", wire: { rows: [row("T"), row("t"), row("b")], center: true } },

  // ---- Trust, process and extras ----
  { id: "testimonials", category: "trust", name: "Customer testimonials", description: "Customer reviews with stars, names and photos.", icon: "MessagesSquare", type: "testimonials", wire: { rows: [row("T"), row("q", "q", "q")] }, keywords: "reviews feedback" },
  { id: "google-reviews", category: "trust", name: "Google reviews", description: "Your Google rating, review count and chosen reviews, with links to see all or write one.", icon: "Star", type: "googleReviews", wire: { rows: [row("s"), row("q", "q", "q")] }, keywords: "rating stars testimonials" },
  { id: "star-rating", category: "trust", name: "Star rating display", description: "Just your Google rating and review count, with the buttons.", icon: "Star", type: "googleReviews", wire: { rows: [row("s"), row("bb")], center: true }, patch: set({ reviews: [] }), keywords: "google rating" },
  { id: "reviews-carousel", category: "trust", name: "Reviews carousel", description: "Customer reviews that slide across.", icon: "GalleryHorizontal", type: "testimonials", wire: { rows: [row("q"), row("d")] }, patch: set({ layout: "carousel" }), keywords: "testimonials" },
  { id: "logos", category: "trust", name: "Brands & partners", description: "A row of partner or customer logos.", icon: "Building2", type: "logos", wire: { rows: [row("g", "g", "g", "g")] }, keywords: "clients" },
  { id: "trust-badges", category: "trust", name: "Trust badges", description: "Icon badges such as warranty, licensed and guaranteed.", icon: "ShieldCheck", type: "logos", wire: { rows: [row("k", "k", "k")] }, keywords: "certifications licenses warranty" },
  { id: "why-choose", category: "trust", name: "Why choose us", description: "Four reasons to pick Osta, as icon cards.", icon: "ThumbsUp", type: "benefits", wire: { rows: [row("T"), row("k", "k", "k", "k")] }, patch: (p) => ({ ...p, columns: "4", heading: bi("Why choose Osta", "لماذا أوستا"), items: [{ icon: "BadgeCheck", title: bi("Verified technicians", "فنيون موثّقون"), text: bi("", "") }, { icon: "Clock", title: bi("On time", "في الموعد"), text: bi("", "") }, { icon: "ShieldCheck", title: bi("Warranty", "ضمان"), text: bi("", "") }, { icon: "Award", title: bi("Quality", "جودة"), text: bi("", "") }] }) },
  { id: "team", category: "trust", name: "Team members", description: "Photos, names and roles of your people.", icon: "Users", type: "team", wire: { rows: [row("k", "k", "k")] } },
  { id: "how-it-works", category: "process", name: "How it works", description: "Numbered steps with icons, as cards.", icon: "Workflow", type: "steps", wire: { rows: [row("T"), row("k", "k", "k")] } },
  { id: "timeline", category: "process", name: "Timeline", description: "Steps one under the other along a line.", icon: "GitCommitVertical", type: "steps", wire: { rows: [row("r"), row("r"), row("r")] }, patch: set({ variant: "timeline" }), keywords: "journey process" },
  { id: "numbered-list", category: "text", name: "Numbered list", description: "A list with numbers.", icon: "ListOrdered", type: "list", wire: { rows: [row("T"), row("x")] }, patch: set({ variant: "number" }) },
  { id: "divider", category: "text", name: "Divider", description: "A line, dots or space between two parts.", icon: "Minus", type: "divider", wire: { rows: [row("a")] }, keywords: "separator spacer" },
  { id: "video", category: "images", name: "Video player", description: "A YouTube or Vimeo video, or a video file.", icon: "CirclePlay", type: "video", wire: { rows: [row("I")] }, keywords: "youtube vimeo mp4" },

  // ---- E. Dynamic blocks (filled from the site's data) ----
  { id: "hero", category: "dynamic", name: "Hero", description: "Big heading, subtitle, image and up to 3 buttons.", icon: "PanelTop", type: "hero", wire: { rows: [row("T", "I"), row("bb")], tone: "dark" } },
  { id: "maintenance-packages", category: "dynamic", name: "Maintenance packages", description: "Annual packages with prices, comparison table, terms and a Subscribe form, edited under Maintenance Packages.", icon: "CalendarCheck", type: "maintenancePackages", wire: { rows: [row("T"), row("n", "n", "n", "n"), row("r"), row("r")] }, keywords: "annual plans amc subscription pricing gold silver" },
  { id: "ducted-calculator", category: "dynamic", name: "AC installation calculator", description: "Installation packages, price table and a calculator that builds a quotation PDF, edited under Self-Service Quotations.", icon: "Calculator", type: "ductedCalculator", wire: { rows: [row("T"), row("n", "n", "n"), row("r"), row("r")] }, keywords: "ducted concealed semi central installation quotation quote price calculator plenum" },
  { id: "duct-quote-calculator", category: "dynamic", name: "Ductwork quotation calculator", description: "Duct systems, prices and a ten-step calculator that builds a ductwork quotation PDF, edited under Self-Service Quotations.", icon: "Calculator", type: "ductQuoteCalculator", wire: { rows: [row("T"), row("n", "n", "n"), row("r"), row("r")] }, keywords: "ductwork duct fabrication installation insulation galvanized fiberglass pir hvac quotation calculator boq" },
  { id: "services-grid", category: "dynamic", name: "Services grid", description: "Service cards pulled from the Service Catalogue.", icon: "Layers", type: "servicesGrid", wire: { rows: [row("c", "c", "c"), row("c", "c", "c")] } },
  { id: "blog-posts", category: "dynamic", name: "Blog posts", description: "The latest blog posts.", icon: "Newspaper", type: "blogPreview", wire: { rows: [row("c", "c", "c")] } },
  { id: "open-jobs", category: "dynamic", name: "Open jobs", description: "Vacancies from Jobs & Workforce.", icon: "BriefcaseBusiness", type: "jobsList", wire: { rows: [row("r"), row("r"), row("r")] } },
  { id: "sub-pages", category: "dynamic", name: "Sub pages", description: "Cards linking to this page's child pages.", icon: "Network", type: "subPages", wire: { rows: [row("k", "k", "k")] } },
  { id: "service-catalogue", category: "dynamic", name: "Service catalogue", description: "The catalogue's categories and services.", icon: "BookOpen", type: "serviceCatalog", wire: { rows: [row("T"), row("k", "k", "k")] } },
  { id: "homepage-sections", category: "dynamic", name: "Homepage sections", description: "The sections you edit under Homepage Sections.", icon: "House", type: "homeSections", wire: { rows: [row("T"), row("i", "p")] } },
  { id: "faq", category: "dynamic", name: "FAQ", description: "Questions and answers that open and close.", icon: "CircleHelp", type: "faq", wire: { rows: [row("T"), row("r"), row("r"), row("r")] } },
  { id: "statistics", category: "dynamic", name: "Statistics", description: "Big numbers with labels.", icon: "ChartNoAxesColumn", type: "stats", wire: { rows: [row("s", "s", "s", "s")], tone: "dark" } },
  { id: "form", category: "dynamic", name: "Form", description: "One of your forms from Website → Forms.", icon: "ClipboardList", type: "form", wire: { rows: [row("T"), row("f"), row("f"), row("b")] } },
  { id: "contact-cards", category: "dynamic", name: "Contact cards", description: "WhatsApp, phone and email cards with address and hours.", icon: "Contact", type: "contactCards", wire: { rows: [row("k", "k", "k")] } },
  { id: "price-calculator", category: "dynamic", name: "Price calculator & booking", description: "The live calculator with a Book button.", icon: "Calculator", type: "bookingCalculator", wire: { rows: [row("f", "f"), row("f", "f"), row("b")] } },
  { id: "weather", category: "dynamic", name: "Weather", description: "Live weather for the UAE, with a hot-weather tip.", icon: "CloudSun", type: "weather", wire: { rows: [row("s", "s", "s", "s")] } },
  { id: "ai-finder", category: "dynamic", name: "AI service finder", description: "The visitor describes a problem; AI suggests the service.", icon: "Sparkles", type: "aiServiceFinder", wire: { rows: [row("f"), row("b"), row("c", "c", "c")] } },
  { id: "services-assistant", category: "dynamic", name: "Services assistant", description: "A chat-style helper that answers service questions.", icon: "Bot", type: "servicesAssistant", wire: { rows: [row("p"), row("f")] } },
  { id: "locations", category: "dynamic", name: "Our locations", description: "The emirates and areas we serve.", icon: "MapPin", type: "locations", wire: { rows: [row("k", "k", "k", "k")] } },
];

export function createFromLibrary(entry: LibraryEntry): Block {
  const b = createBlock(entry.type);
  return entry.patch ? { ...b, props: entry.patch(b.props) } : b;
}

export function searchLibrary(query: string, category: LibraryCategory | "all"): LibraryEntry[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return LIBRARY.filter((e) => {
    if (category !== "all" && e.category !== category) return false;
    const hay = `${e.name} ${e.description} ${e.type} ${e.keywords ?? ""} ${LIBRARY_CATEGORIES.find((c) => c.id === e.category)?.label ?? ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

export const LIBRARY_ICON_NAMES = Array.from(new Set(LIBRARY.map((e) => e.icon)));
