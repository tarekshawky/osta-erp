// SEO keywords are typed as one comma-separated line per language (English, Arabic) and stored as a
// cleaned comma-separated string. Accepts "," "،" ";" and new lines as separators.
export const MAX_KEYWORDS = 30;
export const MAX_KEYWORD_LENGTH = 80;

export function parseKeywords(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (raw ?? "").split(/[,،;\n\r]+/)) {
    const k = part.replace(/\s+/g, " ").trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out;
}

export function normalizeKeywords(raw: string | null | undefined): string | null {
  const list = parseKeywords(raw);
  return list.length ? list.join(", ") : null;
}

/** Validation message for a keyword line, or null when fine. */
export function keywordsProblem(raw: string | null | undefined, label = "Keywords"): string | null {
  const list = parseKeywords(raw);
  if (list.length > MAX_KEYWORDS) return `${label}: use at most ${MAX_KEYWORDS} keywords.`;
  if (list.some((k) => k.length > MAX_KEYWORD_LENGTH)) return `${label}: each keyword must be under ${MAX_KEYWORD_LENGTH} characters.`;
  return null;
}
