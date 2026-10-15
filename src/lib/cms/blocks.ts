import { z } from "zod";
import { hasUnsafeInlineLink } from "./inlineLinks";

// ---- shared field schemas ----
// Text may contain [link text](address){flags}; the address must be a site path, https://, tel: or mailto:.
// No practical limit on how much text a field can hold (long articles are fine); this only guards against absurd input.
const text = z.string().max(200_000).refine((v) => !hasUnsafeInlineLink(v), "A link in this text has an address that is not allowed. Use a site path (/…), https://, tel: or mailto:.");
const bi = z.object({ en: text, ar: text });
// Links: site paths, http(s), tel: and mailto: only -- never javascript: or data:.
const link = z
  .string()
  .max(2000)
  .refine((v) => v === "" || /^(\/|https?:\/\/|tel:|mailto:)/.test(v), "Use a site path (/…), https:// link, tel: or mailto:.");
// Images: site paths, http(s) or an uploaded raster data URL. No SVG (can carry script).
const image = z
  .string()
  .max(3_000_000)
  .refine((v) => v === "" || /^(\/|https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/.test(v), "Invalid image.");
const cta = z.object({ label: bi, url: link });

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
  servicesGrid: z.object({ heading: bi, subtitle: bi, limit: z.number().int().min(1).max(24), eyebrow: bi.optional(), viewAllLabel: bi.optional(), viewAllUrl: link.optional() }),
  blogPreview: z.object({ eyebrow: bi, heading: bi, limit: z.number().int().min(1).max(12), viewAllLabel: bi, viewAllUrl: link }),
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
  faq: z.object({ heading: bi, items: z.array(z.object({ question: bi, answer: bi })).max(200) }),
  stats: z.object({ heading: bi, items: z.array(z.object({ value: z.string().max(40), label: bi, icon: z.string().max(40).regex(/^[A-Za-z0-9]*$/).optional() })).max(8) }),
  cta: z.object({ heading: bi, subtitle: bi, button: cta }),
  form: z.object({ heading: bi, intro: bi, formSlug: z.string().max(60).regex(/^[a-z0-9-]*$/) }),
  // Phone / WhatsApp / email cards, address and hours, all read from Website → Site & Contact.
  contactCards: z.object({ heading: bi, subtitle: bi, whatsappButtonLabel: bi }),
  // The live price calculator: emirate, service, quantity, booking type, summary, agreement and Book.
  bookingCalculator: z.object({ heading: bi, subtitle: bi }),
} as const;

// Any section can have its own background: an image under a dark overlay, or a plain colour.
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #050b1a.");
const sectionStyle = z.object({
  bgImage: image.optional(),
  overlay: z.number().int().min(0).max(100).optional(),
  overlayColor: hex.optional(),
  bgColor: hex.optional(),
});
const withStyle = <T extends z.ZodRawShape>(s: z.ZodObject<T>) => s.extend({ style: sectionStyle.optional() });

export const BLOCK_SCHEMAS = {
  hero: withStyle(RAW_SCHEMAS.hero),
  servicesGrid: withStyle(RAW_SCHEMAS.servicesGrid),
  blogPreview: withStyle(RAW_SCHEMAS.blogPreview),
  homeSections: withStyle(RAW_SCHEMAS.homeSections),
  richText: withStyle(RAW_SCHEMAS.richText),
  imageText: withStyle(RAW_SCHEMAS.imageText),
  faq: withStyle(RAW_SCHEMAS.faq),
  stats: withStyle(RAW_SCHEMAS.stats),
  cta: withStyle(RAW_SCHEMAS.cta),
  form: withStyle(RAW_SCHEMAS.form),
  contactCards: withStyle(RAW_SCHEMAS.contactCards),
  bookingCalculator: withStyle(RAW_SCHEMAS.bookingCalculator),
} as const;

export type BlockType = keyof typeof BLOCK_SCHEMAS;
export const BLOCK_TYPES = Object.keys(BLOCK_SCHEMAS) as BlockType[];

export type Block = {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  hidden: boolean;
  visibility: { desktop: boolean; mobile: boolean };
};

// ---- editor field definitions (drive the generic block form) ----
export type FieldDef =
  | { kind: "bi-text" | "bi-textarea"; key: string; label: string }
  | { kind: "text" | "textarea" | "url" | "image" | "number" | "color"; key: string; label: string }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: "form-select"; key: string; label: string }
  | { kind: "group"; key: string; label: string; fields: FieldDef[] }
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
const biEmpty = () => ({ en: "", ar: "" });
const ctaEmpty = () => ({ label: biEmpty(), url: "" });

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
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle" },
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
    description: "Cards for your website services, pulled automatically.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle" },
      { kind: "number", key: "limit", label: "Max services to show" },
      { kind: "bi-text", key: "eyebrow", label: "Small label above heading (optional)" },
      { kind: "bi-text", key: "viewAllLabel", label: "“View all” link text (optional)" },
      { kind: "url", key: "viewAllUrl", label: "“View all” link" },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty(), limit: 8, eyebrow: biEmpty(), viewAllLabel: biEmpty(), viewAllUrl: "" }),
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
  homeSections: {
    label: "Homepage sections",
    description: "Shows the sections you edit under “Homepage Sections” (sustainability, brands, areas, prime membership…). Edit their content there.",
    fields: [],
    defaults: () => ({}),
  },
  richText: {
    label: "Text",
    description: "A heading and paragraphs. Leave a blank line between paragraphs.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "body", label: "Body" },
      align,
    ],
    defaults: () => ({ heading: biEmpty(), body: biEmpty(), align: "start" }),
  },
  imageText: {
    label: "Image + text",
    description: "An image next to a heading, text and optional button.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "body", label: "Body" },
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
          { kind: "bi-textarea", key: "answer", label: "Answer" },
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
      { kind: "bi-textarea", key: "intro", label: "Intro text" },
      { kind: "form-select", key: "formSlug", label: "Which form" },
    ],
    defaults: () => ({ heading: biEmpty(), intro: biEmpty(), formSlug: "" }),
  },
  cta: {
    label: "Call to action",
    description: "A heading and a booking/contact button.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle" },
      { kind: "group", key: "button", label: "Button", fields: ctaFields },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty(), button: ctaEmpty() }),
  },
  contactCards: {
    label: "Contact cards",
    description: "WhatsApp, phone and email cards plus address and hours. The details come from Website → Site & Contact.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle" },
      { kind: "bi-text", key: "whatsappButtonLabel", label: "WhatsApp button text (leave empty to hide the button)" },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty(), whatsappButtonLabel: biEmpty() }),
  },
  bookingCalculator: {
    label: "Price calculator & booking",
    description: "The live calculator: emirate, service, quantity, booking type, price summary, agreement and a Book button. Prices come from Dynamic Pricing.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle" },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty() }),
  },
};

// Every block (except the hero, which has its own background controls) can take a section background.
const STYLE_FIELD: FieldDef = {
  kind: "group",
  key: "style",
  label: "Section background (optional)",
  fields: [
    { kind: "image", key: "bgImage", label: "Background image" },
    { kind: "number", key: "overlay", label: "Overlay strength over the image, 0–100 (higher = darker)" },
    { kind: "color", key: "overlayColor", label: "Overlay colour" },
    { kind: "color", key: "bgColor", label: "Plain background colour (used when there is no image)" },
  ],
};
for (const type of Object.keys(BLOCK_REGISTRY) as BlockType[]) if (type !== "hero") BLOCK_REGISTRY[type].fields.push(STYLE_FIELD);

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
  visibility: z.object({ desktop: z.boolean(), mobile: z.boolean() }),
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
