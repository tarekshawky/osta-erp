// What a legal document is made of, and the plain rules for turning the editor's text into something safe to publish.
// Everything here is pure (no database), so it is tested on its own.

export type LegalSection = {
  id: string;
  // 1 = a part heading ("Section 1: General Terms", not numbered), 2 = a numbered clause, 3 = a sub-clause (1.1, 1.2...).
  level: 1 | 2 | 3;
  headingEn: string;
  headingAr: string;
  bodyEn: string;
  bodyAr: string;
};

export type LegalSeo = { titleEn?: string; titleAr?: string; descriptionEn?: string; descriptionAr?: string };

export const DOC_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];
export const DOC_KINDS = ["POLICY", "NOTICE", "INTERNAL"] as const;
export type DocKind = (typeof DOC_KINDS)[number];
export const KIND_LABEL: Record<DocKind, string> = { POLICY: "Binding policy", NOTICE: "Informational notice", INTERNAL: "Internal procedure (never shown to customers)" };

export const COUNTRIES = [
  { code: "AE", nameEn: "United Arab Emirates", nameAr: "الإمارات العربية المتحدة", live: true },
  { code: "SA", nameEn: "Saudi Arabia", nameAr: "المملكة العربية السعودية", live: false },
  { code: "GCC", nameEn: "Other GCC countries", nameAr: "دول الخليج الأخرى", live: false },
] as const;

const clean = (s: unknown) => (typeof s === "string" ? s : "");

// ---- numbering --------------------------------------------------------------------------------------------------------------------------

// "1", "2", "2.1"... for each section; part headings (level 1) get "".
export function numberSections(sections: Pick<LegalSection, "level">[]): string[] {
  let major = 0, minor = 0;
  return sections.map((s) => {
    if (s.level === 1) return "";
    if (s.level === 2) { major += 1; minor = 0; return String(major); }
    minor += 1;
    return `${major || 1}.${minor}`;
  });
}

// ---- the text inside a section ---------------------------------------------------------------------------------------------------------

export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "notice"; text: string }
  | { t: "table"; rows: string[][] };

// A small, safe writing format (no HTML): blank line = new paragraph, "- " bullet, "1. " numbered item, "> " highlighted legal notice,
// "### " small heading, "| a | b |" table row (the first row is the header).
export function parseBody(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = clean(text).replace(/\r/g, "").split("\n");
  let para: string[] = [];
  const flush = () => { if (para.length) { blocks.push({ t: "p", text: para.join(" ").trim() }); para = []; } };
  const last = () => blocks[blocks.length - 1];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^###\s+(.*)$/))) { flush(); blocks.push({ t: "h", text: m[1] }); }
    else if ((m = line.match(/^>\s?(.*)$/))) { flush(); const l = last(); if (l?.t === "notice") l.text += " " + m[1]; else blocks.push({ t: "notice", text: m[1] }); }
    else if ((m = line.match(/^[-*•]\s+(.*)$/))) { flush(); const l = last(); if (l?.t === "ul") l.items.push(m[1]); else blocks.push({ t: "ul", items: [m[1]] }); }
    else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { flush(); const l = last(); if (l?.t === "ol") l.items.push(m[1]); else blocks.push({ t: "ol", items: [m[1]] }); }
    else if (line.startsWith("|")) {
      flush();
      const cells = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // the |---|---| line
      const l = last(); if (l?.t === "table") l.rows.push(cells); else blocks.push({ t: "table", rows: [cells] });
    } else para.push(line);
  }
  flush();
  return blocks;
}

export type Inline = { t: "text"; text: string } | { t: "bold"; text: string } | { t: "link"; text: string; href: string };

// Only links that go to a page of the site, a secure web address, an email or a phone are kept; anything else stays plain text.
export const safeHref = (h: string) => /^(\/(?!\/)|https:\/\/|mailto:|tel:)/i.test(h.trim());

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let i = 0, m: RegExpExecArray | null;
  const s = clean(text);
  while ((m = re.exec(s))) {
    if (m.index > i) out.push({ t: "text", text: s.slice(i, m.index) });
    if (m[1] !== undefined) out.push({ t: "bold", text: m[1] });
    else if (safeHref(m[3])) out.push({ t: "link", text: m[2], href: m[3] });
    else out.push({ t: "text", text: m[2] });
    i = m.index + m[0].length;
  }
  if (i < s.length) out.push({ t: "text", text: s.slice(i) });
  return out;
}

// ---- {{fields}}: commercial decisions that are filled in once, in one place -------------------------------------------------------------

const FIELD_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export function fieldKeysIn(text: string): string[] {
  return [...new Set([...clean(text).matchAll(FIELD_RE)].map((m) => m[1].toLowerCase()))];
}

export function sectionFieldKeys(doc: { draftIntroEn?: string; draftIntroAr?: string; sections: LegalSection[] }): string[] {
  const all = [doc.draftIntroEn, doc.draftIntroAr, ...doc.sections.flatMap((s) => [s.headingEn, s.headingAr, s.bodyEn, s.bodyAr])].map(clean);
  return [...new Set(all.flatMap(fieldKeysIn))];
}

export type FieldValue = { valueEn: string; valueAr: string; confirmed: boolean };

export function fillFields(text: string, values: Record<string, string>): string {
  return clean(text).replace(FIELD_RE, (_m, k: string) => values[k.toLowerCase()] ?? "");
}

// Like fillFields, but a {{field}} with no value is left as it is (so a preview can still highlight what is open).
export function fillKnownFields(text: string, values: Record<string, string>): string {
  return clean(text).replace(FIELD_RE, (m, k: string) => (values[k.toLowerCase()] ? values[k.toLowerCase()] : m));
}

// ---- reading what the editor sends (never trust it) -----------------------------------------------------------------------------------

export const MAX_SECTIONS = 400;
export const MAX_BODY = 20000;
export const MAX_HEADING = 300;

export function readSections(input: unknown): LegalSection[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input.slice(0, MAX_SECTIONS).map((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    let id = clean(r.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || `s${i + 1}`;
    while (seen.has(id)) id += "x";
    seen.add(id);
    const lv = Number(r.level);
    return {
      id,
      level: (lv === 1 || lv === 3 ? lv : 2) as 1 | 2 | 3,
      headingEn: clean(r.headingEn).slice(0, MAX_HEADING),
      headingAr: clean(r.headingAr).slice(0, MAX_HEADING),
      bodyEn: clean(r.bodyEn).slice(0, MAX_BODY),
      bodyAr: clean(r.bodyAr).slice(0, MAX_BODY),
    };
  });
}

export function readSeo(input: unknown): LegalSeo {
  const r = (input ?? {}) as Record<string, unknown>;
  return { titleEn: clean(r.titleEn).slice(0, 120), titleAr: clean(r.titleAr).slice(0, 120), descriptionEn: clean(r.descriptionEn).slice(0, 320), descriptionAr: clean(r.descriptionAr).slice(0, 320) };
}

export const readUrlList = (input: unknown): { label: string; url: string }[] =>
  Array.isArray(input)
    ? input.slice(0, 20).map((a) => ({ label: clean((a as Record<string, unknown>)?.label).slice(0, 120), url: clean((a as Record<string, unknown>)?.url).trim().slice(0, 500) })).filter((a) => a.url && /^(\/|https:\/\/)/i.test(a.url))
    : [];

// ---- publishing -------------------------------------------------------------------------------------------------------------------------

export type DraftDoc = {
  titleEn: string; titleAr: string; summaryEn: string; summaryAr: string;
  draftIntroEn: string; draftIntroAr: string; sections: LegalSection[]; seo: LegalSeo;
};

export type Snapshot = {
  titleEn: string; titleAr: string; summaryEn: string; summaryAr: string; introEn: string; introAr: string;
  sections: LegalSection[]; seo: LegalSeo;
};

const readable = (s: string) => s.trim().length > 0;

// Everything that must be true before a draft may be published. Returns the reasons it can not (empty list = ready).
export function publishProblems(doc: DraftDoc, fields: Record<string, FieldValue | undefined>): string[] {
  const out: string[] = [];
  if (!readable(doc.titleEn)) out.push("The English title is empty.");
  if (!readable(doc.titleAr)) out.push("The Arabic title is empty.");
  const body = doc.sections.filter((s) => s.level !== 1 || readable(s.headingEn) || readable(s.headingAr));
  if (!doc.sections.some((s) => s.level !== 1)) out.push("The document has no clauses yet.");
  doc.sections.forEach((s, i) => {
    const where = `Section ${i + 1}`;
    if (readable(s.headingEn) !== readable(s.headingAr)) out.push(`${where}: the heading is missing in ${readable(s.headingEn) ? "Arabic" : "English"}.`);
    if (s.level !== 1 && readable(s.bodyEn) !== readable(s.bodyAr)) out.push(`${where}: the text is missing in ${readable(s.bodyEn) ? "Arabic" : "English"}.`);
    if (s.level !== 1 && !readable(s.bodyEn) && !readable(s.bodyAr) && !readable(s.headingEn)) out.push(`${where} is empty. Fill it in or remove it.`);
  });
  void body;
  if (readable(doc.draftIntroEn) !== readable(doc.draftIntroAr)) out.push(`The introduction is missing in ${readable(doc.draftIntroEn) ? "Arabic" : "English"}.`);
  for (const key of sectionFieldKeys({ draftIntroEn: doc.draftIntroEn, draftIntroAr: doc.draftIntroAr, sections: doc.sections })) {
    const f = fields[key];
    if (!f) out.push(`It uses {{${key}}}, which does not exist. Add it under Decisions to confirm, or remove it.`);
    else if (!f.confirmed || !readable(f.valueEn) || !readable(f.valueAr)) out.push(`{{${key}}} is not confirmed yet (needs a confirmed English and Arabic value).`);
  }
  return out;
}

// The final text, with every {{field}} replaced by its confirmed value in the right language. Call only when publishProblems is empty.
export function buildSnapshot(doc: DraftDoc, fields: Record<string, FieldValue | undefined>): Snapshot {
  const en: Record<string, string> = {}, ar: Record<string, string> = {};
  for (const [k, f] of Object.entries(fields)) if (f) { en[k] = f.valueEn; ar[k] = f.valueAr; }
  return {
    titleEn: doc.titleEn.trim(), titleAr: doc.titleAr.trim(), summaryEn: doc.summaryEn.trim(), summaryAr: doc.summaryAr.trim(),
    introEn: fillFields(doc.draftIntroEn, en).trim(), introAr: fillFields(doc.draftIntroAr, ar).trim(),
    sections: doc.sections.map((s) => ({ id: s.id, level: s.level, headingEn: fillFields(s.headingEn, en).trim(), headingAr: fillFields(s.headingAr, ar).trim(), bodyEn: fillFields(s.bodyEn, en).trim(), bodyAr: fillFields(s.bodyAr, ar).trim() })),
    seo: doc.seo,
  };
}

// Share of the document that has an Arabic text (for the translation progress shown in the admin).
export function arabicProgress(doc: { draftIntroEn?: string; draftIntroAr?: string; titleAr: string; sections: LegalSection[] }): number {
  const parts = [doc.titleAr, ...(doc.draftIntroEn ? [doc.draftIntroAr ?? ""] : []), ...doc.sections.flatMap((s) => (s.level === 1 ? [s.headingAr] : [s.headingAr, s.bodyAr]))];
  const wanted = [doc.titleAr, ...(doc.draftIntroEn ? [doc.draftIntroEn] : []), ...doc.sections.flatMap((s) => (s.level === 1 ? [s.headingEn] : [s.headingEn, s.bodyEn]))];
  let need = 0, have = 0;
  wanted.forEach((w, i) => { if (readable(w) || i === 0) { need += 1; if (readable(parts[i] ?? "")) have += 1; } });
  return need ? Math.round((have / need) * 100) : 0;
}

// Roughly 200 words a minute. Arabic is counted by words too.
export function readingMinutes(text: string): number {
  const words = clean(text).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
