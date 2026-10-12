import type { Block } from "@/lib/cms/blocks";
import { stripInline } from "@/lib/cms/inlineLinks";

// Near-duplicate detection for area pages: search engines treat "same page with the city name swapped" as thin,
// duplicate content, so area pages must say something genuinely different.
export const NEAR_DUPLICATE_BLOCK = 0.8;
export const NEAR_DUPLICATE_WARN = 0.6;

export function pageText(blocks: Block[], lang: "en" | "ar"): string {
  let text = "";
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.en === "string" && typeof o.ar === "string") text += ` ${stripInline(o[lang] as string)}`;
      else Object.values(o).forEach(walk);
    }
  };
  blocks.filter((b) => !b.hidden && (b.visibility.desktop || b.visibility.mobile)).forEach((b) => walk(b.props));
  return text.replace(/\s+/g, " ").trim();
}

// Swap the page's own place names for a placeholder so "AC repair in Ajman" and "AC repair in Sharjah" compare as equal.
export function maskNames(text: string, names: string[]): string {
  let out = text;
  for (const name of names.filter((n) => n.trim().length > 1)) {
    out = out.replace(new RegExp(name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " areaname ");
  }
  return out;
}

const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export function shingles(text: string, n = 3): Set<string> {
  const w = words(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}

// Jaccard similarity of 3-word shingles: 0 = nothing shared, 1 = identical. Texts under 3 words can't be compared.
export function similarity(a: string, b: string): number {
  const sa = shingles(a);
  const sb = shingles(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const s of sa) if (sb.has(s)) shared++;
  return shared / (sa.size + sb.size - shared);
}

export function closestMatch(text: string, others: { label: string; text: string }[]): { label: string; score: number } | null {
  let best: { label: string; score: number } | null = null;
  for (const o of others) {
    const score = similarity(text, o.text);
    if (!best || score > best.score) best = { label: o.label, score };
  }
  return best;
}
