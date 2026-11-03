import { expand } from "./synonyms";
import { keywords, normalize } from "./text";

// Finds the services a visitor is asking about. No AI service and no key: the words of the question (and what they usually mean:
// see synonyms.ts) are matched against the service names and categories, rarer words counting for more.

export type SearchService = { slug: string; nameEn: string; nameAr: string; category: string; categoryAr: string };
export type Hit = { service: SearchService; score: number };

type Doc = { service: SearchService; name: Set<string>; category: Set<string>; nameLen: number; text: string };
export type Index = { docs: Doc[]; idf: Map<string, number>; vocabulary: Set<string> };

const NAME_WEIGHT = 3;
const CATEGORY_WEIGHT = 1;
const SYNONYM_WEIGHT = 0.5;

export function buildIndex(services: SearchService[]): Index {
  const docs: Doc[] = services.map((s) => {
    const name = new Set(keywords(`${s.nameEn} ${s.nameAr}`));
    return { service: s, name, category: new Set(keywords(`${s.category} ${s.categoryAr}`)), nameLen: name.size, text: normalize(`${s.nameEn} ${s.nameAr}`) };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set([...d.name, ...d.category])) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log(1 + docs.length / n));
  return { docs, idf, vocabulary: new Set(docs.flatMap((d) => [...d.name])) };
}

// The words of a question, each with the search terms it stands for: the word itself (full weight) and, when no service is
// named with that word, what it usually means (half weight). A word that is in the service names is trusted as it is.
// Words that name a condition, not a service ("cold" is also "Cold Room"): they count half, and what they mean is always searched.
const AMBIGUOUS = new Set(["cold", "hot", "warm", "cool", "تبريد"]);

// «مجاري» is drains, except in «مجاري الهواء» (air ducts).
const rewrite = (text: string) => normalize(text).replace(/مجاري(?!\s+(?:ال)?هواء)/g, "صرف تسليك");

export function queryWords(text: string, vocabulary: Set<string> = new Set()): Map<string, number>[] {
  return keywords(rewrite(text)).map((w) => {
    const ambiguous = AMBIGUOUS.has(w);
    const terms = new Map<string, number>([[w, ambiguous ? SYNONYM_WEIGHT : 1]]);
    if (ambiguous || !vocabulary.has(w)) for (const e of expand(w)) if (!terms.has(e)) terms.set(e, SYNONYM_WEIGHT);
    return terms;
  });
}

const EXTRA_MATCH = 0.3; // a second or third meaning of the same word also matching helps a little

// What kind of service the visitor wants: a problem to fix ("not working", «خربان»), or something new to put in. A service of that kind gets a small boost.
const WANTS_REPAIR = /\b((not|isn t|doesn t|won t|can t|never)\s+(work\w*|cool\w*|start\w*|turn\w*|heat\w*|drain\w*|flush\w*|run\w*|open\w*|clos\w*|cold|hot|on|off)|broken|break\w*|fix\w*|repair\w*|problem|issue|faulty|stopped|dead|noise|noisy|leak\w*|clog\w*|block\w*)\b|لا يبرد|لا تبرد|مش بيبرد|ما يبرد|لا يعمل|لا تعمل|لا تشتغل|لا يشتغل|مش شغال|مش شغاله|مو شغال|ما يشتغل|ما تشتغل|ما يعمل|ما تعمل|خربان|خربانه|تعطلت|خراب|عطلان|عطل|تعطل|تصليح|اصلاح|مشكله|تسرب|يسرب|مسدود|مكسور|كسر/;
const WANTS_INSTALL = /\b(install\w*|mount\w*|fitting|new)\b|تركيب|تثبيت|جديد/;
const REPAIR_NAME = /repair|fix|maintenance|unblock|unclog|اصلاح|صيانه|تسليك/;
const INSTALL_NAME = /\binstall|\bmount|fitting|تركيب|تثبيت/;
const KIND_BOOST = 1.25;
// A yearly contract or plan is rarely what is meant by a plain question: it ranks lower unless the question mentions one.
const PLAN_NAME = /contract|annual|\bplan\b|\bamc\b|package|عقد|عقود|سنوي|باقه|باقات/;
const WANTS_PLAN = /contract|annual|yearly|\bplan\b|\bamc\b|package|عقد|عقود|سنوي|باقه|باقات|اشتراك/;

export function search(index: Index, text: string, limit = 3): Hit[] {
  const words = queryWords(text, index.vocabulary);
  if (words.length === 0) return [];
  const wording = normalize(text);
  const wantsRepair = WANTS_REPAIR.test(wording);
  const wantsInstall = WANTS_INSTALL.test(wording) && !wantsRepair;
  const wantsPlan = WANTS_PLAN.test(wording);
  const scored: Hit[] = [];
  for (const d of index.docs) {
    let score = 0;
    for (const terms of words) {
      // each word of the question counts mostly by its best match, so a word with many synonyms cannot beat a service that matches the word itself
      const found: number[] = [];
      for (const [t, w] of terms) {
        const idf = index.idf.get(t);
        if (idf === undefined) continue;
        if (d.name.has(t)) found.push(w * idf * NAME_WEIGHT);
        else if (d.category.has(t)) found.push(w * idf * CATEGORY_WEIGHT);
      }
      found.sort((x, y) => y - x);
      if (found.length) score += found[0] + EXTRA_MATCH * found.slice(1).reduce((x, y) => x + y, 0);
    }
    if (score > 0) {
      const kind = (wantsRepair && REPAIR_NAME.test(d.text)) || (wantsInstall && INSTALL_NAME.test(d.text)) ? KIND_BOOST : 1;
      const plan = !wantsPlan && PLAN_NAME.test(d.text) ? 0.8 : 1;
      scored.push({ service: d.service, score: (score * kind * plan) / (1 + 0.1 * d.nameLen) });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.service.nameEn.localeCompare(b.service.nameEn));
  const top = scored[0]?.score ?? 0;
  // keep the clear matches: close to the best one, and not just a stray word in common
  return scored.filter((h) => h.score >= top * 0.55 && h.score >= 1.2).slice(0, limit);
}
