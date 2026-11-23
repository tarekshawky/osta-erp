import { numberSections, type LegalSection } from "./content";

// Makes Arabic and English comparable: lower case, no diacritics or tatweel, the common letter variants made equal.
export function normalize(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Words that carry no meaning in a question like "Can I cancel my AC booking?".
const STOP = new Set(["can", "i", "my", "the", "a", "an", "is", "are", "do", "does", "how", "what", "to", "of", "and", "or", "for", "in", "on", "me", "you", "your", "it", "if", "when", "will", "be", "with", "at", "هل", "ما", "ماذا", "كيف", "في", "على", "من", "الى", "عن", "او", "و", "لي", "انا", "هو", "هي"]);

export function searchTerms(q: string): string[] {
  const words = normalize(q).split(" ").filter((w) => w.length > 1 && !STOP.has(w));
  // A light, shared stem so "cancel", "cancelling" and "cancellation" meet, and Arabic "الالغاء" meets "الغاء".
  return [...new Set(words.map((w) => w.replace(/^ال/, "").replace(/(ing|ed|ation|s)$/, "")).filter((w) => w.length > 2))];
}

export type SearchDoc = { slug: string; titleEn: string; titleAr: string; categoryKey: string; countries: string[]; version: number; sections: LegalSection[]; introEn: string; introAr: string };
export type Hit = { slug: string; titleEn: string; titleAr: string; categoryKey: string; sectionId: string; number: string; headingEn: string; headingAr: string; snippet: string; score: number };

function snippetAround(text: string, terms: string[]): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const norm = normalize(flat);
  let at = -1;
  for (const t of terms) { const i = norm.indexOf(t); if (i >= 0 && (at < 0 || i < at)) at = i; }
  if (at < 0) return flat.slice(0, 160);
  // normalize() keeps lengths for the characters used here closely enough to place a window; clamp to the text.
  const start = Math.max(0, Math.min(at, flat.length) - 50);
  return (start > 0 ? "…" : "") + flat.slice(start, start + 180) + (start + 180 < flat.length ? "…" : "");
}

export function searchDocs(docs: SearchDoc[], q: string, opts: { lang: "en" | "ar"; category?: string; country?: string; limit?: number }): Hit[] {
  const terms = searchTerms(q);
  if (!terms.length) return [];
  const hits: Hit[] = [];
  for (const d of docs) {
    if (opts.category && d.categoryKey !== opts.category) continue;
    if (opts.country && !d.countries.includes(opts.country)) continue;
    const numbers = numberSections(d.sections);
    d.sections.forEach((s, i) => {
      const heading = opts.lang === "ar" ? s.headingAr : s.headingEn;
      const body = opts.lang === "ar" ? s.bodyAr : s.bodyEn;
      const nh = normalize(heading), nb = normalize(body), nt = normalize(opts.lang === "ar" ? d.titleAr : d.titleEn);
      let score = 0, matched = 0;
      for (const t of terms) {
        const inH = nh.includes(t), inB = nb.includes(t), inT = nt.includes(t);
        if (inH || inB || inT) matched += 1;
        score += (inH ? 5 : 0) + (inT ? 2 : 0) + Math.min(3, (nb.split(t).length - 1));
      }
      // A clause that matches every word of the question beats one that matches a single word.
      if (matched === 0) return;
      score += matched === terms.length ? 6 : 0;
      score += (matched / terms.length) * 4;
      hits.push({ slug: d.slug, titleEn: d.titleEn, titleAr: d.titleAr, categoryKey: d.categoryKey, sectionId: s.id, number: numbers[i], headingEn: s.headingEn, headingAr: s.headingAr, snippet: snippetAround(body || heading, terms), score });
    });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 20);
}
