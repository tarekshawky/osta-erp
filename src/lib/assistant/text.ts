// Text helpers for the free services assistant: the same cleaning for what a visitor types and for the service names it is matched
// against, in English and Arabic (diacritics, letter variants, "ال", plurals), so "المكيفات" finds "المكيف" and "leaking" finds "leak".

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[ً-ٰٟـ]/g, "") // diacritics, tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const AR_PREFIX = /^(وال|بال|كال|فال|لل|ال)(?=.{3,})/;

export function stem(word: string): string {
  if (/[\u0600-\u06FF]/.test(word)) {
    let a = word.replace(AR_PREFIX, "");
    if (a.length > 4) a = a.replace(/(ات|ان|ين|ون)$/, ""); // plurals: الثلاجات
    if (a.length > 3 && a.endsWith("ه")) a = a.slice(0, -1); // ثلاجة / ثلاجه
    return a;
  }
  let w = word;
  if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("es") && /(ch|sh|x|ss)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 7 && w.endsWith("ation")) w = w.slice(0, -5); // installation / install
  else if (w.length > 6 && w.endsWith("ment")) w = w.slice(0, -4); // replacement / replace
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2); // cleaned / clean
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1); // move / moving, tile / tiling
  return w;
}

const STOP = new Set(
  ("a an the is are was were be been am my me i we you your our it its this that these those to of for in on at and or with from by as do does did can could would should will " +
    "please need want have has had get got there how what which where when why who not no yes some any very just also about into out up new service services offer offers provide provides " +
    "في من على الي عن هل ما ماذا خدمه خدمات تقدمون عندكم انا انت لي لك له لا مش ما جديد جديده هذا هذه ذلك اريد ابغي ابي محتاج احتاج عندي عند يا مع او و ثم كل بعض جدا فقط").split(" ")
);

export const tokens = (text: string): string[] => normalize(text).split(" ").filter(Boolean);
// Stemmed words without the filler words.
export const keywords = (text: string): string[] => tokens(text).filter((t) => !STOP.has(t)).map(stem).filter((t) => t.length > 1);
