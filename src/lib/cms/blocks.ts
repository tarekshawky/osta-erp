import { z } from "zod";

// ---- shared field schemas ----
const bi = z.object({ en: z.string().max(4000), ar: z.string().max(4000) });
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

export const BLOCK_SCHEMAS = {
  hero: z.object({
    eyebrow: bi,
    heading: bi,
    subtitle: bi,
    imageUrl: image,
    imagePosition: z.enum(["end", "start", "background"]),
    align: z.enum(["start", "center"]),
    ctas: z.array(cta).max(3),
  }),
  servicesGrid: z.object({ heading: bi, subtitle: bi, limit: z.number().int().min(1).max(12) }),
  richText: z.object({ heading: bi, body: bi, align: z.enum(["start", "center"]) }),
  imageText: z.object({
    heading: bi,
    body: bi,
    imageUrl: image,
    imageAlt: bi,
    imagePosition: z.enum(["end", "start"]),
    cta,
  }),
  faq: z.object({ heading: bi, items: z.array(z.object({ question: bi, answer: bi })).max(30) }),
  stats: z.object({ heading: bi, items: z.array(z.object({ value: z.string().max(40), label: bi })).max(8) }),
  cta: z.object({ heading: bi, subtitle: bi, button: cta }),
  form: z.object({ heading: bi, intro: bi, formSlug: z.string().max(60).regex(/^[a-z0-9-]*$/) }),
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
  | { kind: "text" | "textarea" | "url" | "image" | "number"; key: string; label: string }
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
      { kind: "image", key: "imageUrl", label: "Image" },
      {
        kind: "select",
        key: "imagePosition",
        label: "Image position",
        options: [
          { value: "end", label: "Beside text (end)" },
          { value: "start", label: "Beside text (start)" },
          { value: "background", label: "Background" },
        ],
      },
      align,
      { kind: "list", key: "ctas", label: "Buttons", itemLabel: "Button", max: 3, fields: ctaFields },
    ],
    defaults: () => ({ eyebrow: biEmpty(), heading: biEmpty(), subtitle: biEmpty(), imageUrl: "", imagePosition: "end", align: "start", ctas: [] }),
  },
  servicesGrid: {
    label: "Services grid",
    description: "Cards for your website services, pulled automatically.",
    fields: [
      { kind: "bi-text", key: "heading", label: "Heading" },
      { kind: "bi-textarea", key: "subtitle", label: "Subtitle" },
      { kind: "number", key: "limit", label: "Max services to show" },
    ],
    defaults: () => ({ heading: biEmpty(), subtitle: biEmpty(), limit: 8 }),
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
        max: 30,
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
};

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
  if (input.length > 80) return { ok: false, error: "A page can have at most 80 blocks." };
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
