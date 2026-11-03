import { z } from "zod";

// Branches (real offices) of the company, shown on the emirate pages and in structured data. Pure helpers: no database here.

// ---------- opening hours ----------
// [{ days: [0..6] (0 = Sunday), opens: "10:00", closes: "24:00" }]: one row per different schedule.
export type HoursRow = { days: number[]; opens: string; closes: string };
export const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const minutes = (t: string) => (t === "24:00" ? 1440 : Number(t.slice(0, 2)) * 60 + Number(t.slice(3)));
const validTime = (t: string, closing: boolean) => TIME.test(t) || (closing && t === "24:00");

export function hoursProblem(hours: HoursRow[]): string | null {
  if (hours.length > 14) return "Opening hours can have at most 14 rows.";
  const used = new Map<number, [number, number][]>();
  for (const [i, h] of hours.entries()) {
    const row = `Opening hours row ${i + 1}`;
    if (h.days.length === 0 || h.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) || new Set(h.days).size !== h.days.length) return `${row}: choose the days (each day once).`;
    if (!validTime(h.opens, false) || !validTime(h.closes, true)) return `${row}: times must look like 09:30 (closing can be 24:00 for midnight).`;
    if (minutes(h.closes) <= minutes(h.opens)) return `${row}: closing must be after opening (use 24:00 to close at midnight).`;
    for (const d of h.days) {
      const taken = used.get(d) ?? [];
      if (taken.some(([a, b]) => minutes(h.opens) < b && minutes(h.closes) > a)) return `${row}: ${DAYS_EN[d]} already has overlapping hours.`;
      taken.push([minutes(h.opens), minutes(h.closes)]);
      used.set(d, taken);
    }
  }
  return null;
}

// "Daily 10:00–24:00" / "Sun–Thu 09:00–18:00; Fri 14:00–18:00" (24-hour clock: no AM/PM to misread).
export function hoursSummary(hours: HoursRow[], lang: "en" | "ar"): string {
  const names = lang === "ar" ? DAYS_AR : SHORT_EN;
  return hours.map((h) => {
    const days = [...h.days].sort((a, b) => a - b);
    let label: string;
    if (days.length === 7) label = lang === "ar" ? "يومياً" : "Daily";
    else {
      const runs: number[][] = [];
      for (const d of days) { const last = runs[runs.length - 1]; if (last && d === last[last.length - 1] + 1) last.push(d); else runs.push([d]); }
      label = runs.map((r) => (r.length >= 3 ? `${names[r[0]]}–${names[r[r.length - 1]]}` : r.map((d) => names[d]).join(", "))).join(", ");
    }
    return `${label} ${h.opens}–${h.closes}`;
  }).join("; ");
}

// schema.org OpeningHoursSpecification. Midnight closing is written 23:59 (the form schema.org consumers accept).
export function schemaHours(hours: HoursRow[]) {
  return hours.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: [...h.days].sort((a, b) => a - b).map((d) => DAYS_EN[d]), opens: h.opens, closes: h.closes === "24:00" ? "23:59" : h.closes }));
}

// ---------- links ----------
export const isGoogleMapsLink = (u: string) => /^https:\/\/((www|maps)\.)?google\.[a-z.]{2,6}\/maps(?:[/?]|$)/i.test(u) || /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.page|g\.co\/kgs|share\.google)\//i.test(u);
export const isGoogleBusinessLink = (u: string) => isGoogleMapsLink(u) || /^https:\/\/(business\.google\.com|g\.page|g\.co|search\.google\.com|www\.google\.[a-z.]{2,6})\//i.test(u);
export const isAppleMapsLink = (u: string) => /^https:\/\/maps\.apple(\.com)?\//i.test(u);
// Only Google's own embeddable map addresses: anything else could not be put in an iframe safely.
export const isEmbedUrl = (u: string) => /^https:\/\/www\.google\.com\/maps\/embed(?:[/?]|$)/i.test(u) || /^https:\/\/(www|maps)\.google\.com\/maps\?[^#]*\boutput=embed\b/i.test(u);

export const embedUrlFor = (lat: number, lng: number, lang: "en" | "ar" = "en") => `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=${lang}&output=embed`;
// Directions to the exact branch point, not to the city.
export const directionsUrlFor = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
export const whatsappUrl = (n: string) => { const d = n.replace(/\D/g, ""); return d ? `https://wa.me/${d}` : ""; };
export const telHref = (p: string) => { const t = p.replace(/[^\d+]/g, ""); return t ? `tel:${t}` : ""; };

// ---------- validation ----------
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text = (max: number) => z.string().trim().max(max);
const bi = z.object({ en: text(1000), ar: text(1000) });
const url = (check: (u: string) => boolean, what: string) => z.string().trim().max(2000).refine((v) => v === "" || check(v), `${what} is not an address this field accepts.`);
const site = z.string().trim().max(2000).refine((v) => /^(\/(?!\/)|https:\/\/)/.test(v), "An image must be a site path (/…) or an https:// address.");

// The UAE sits inside this box: it catches swapped or mistyped coordinates (the common mistake) before they reach the map or Google.
export const UAE_BOUNDS = { latMin: 22, latMax: 26.5, lngMin: 51, lngMax: 56.5 };

export const BranchInput = z.object({
  slug: z.string().trim().min(2).max(60).regex(SLUG, "The code can only contain lowercase letters, numbers and single hyphens."),
  areaId: z.string().min(1, "Choose the emirate."),
  nameEn: text(120).min(1, "The English name is required."),
  nameAr: text(120).min(1, "The Arabic name is required."),
  branchNameEn: text(120), branchNameAr: text(120), regionEn: text(80),
  streetEn: text(200), streetAr: text(200), localityEn: text(160), localityAr: text(160), postalCode: text(20),
  addressEn: text(400), addressAr: text(400),
  latitude: z.number().min(UAE_BOUNDS.latMin, "Latitude must be inside the UAE (about 22 to 26.5). Latitude comes first, then longitude.").max(UAE_BOUNDS.latMax, "Latitude must be inside the UAE (about 22 to 26.5). Latitude comes first, then longitude."),
  longitude: z.number().min(UAE_BOUNDS.lngMin, "Longitude must be inside the UAE (about 51 to 56.5).").max(UAE_BOUNDS.lngMax, "Longitude must be inside the UAE (about 51 to 56.5)."),
  mapsUrl: url(isGoogleMapsLink, "The Google Maps link"),
  mapsEmbedUrl: url(isEmbedUrl, "The embed address (it must be a Google Maps embed: …/maps/embed… or …output=embed)"),
  appleMapsUrl: url(isAppleMapsLink, "The Apple Maps link"),
  businessProfileUrl: url(isGoogleBusinessLink, "The Google Business Profile link"),
  reviewsUrl: url(isGoogleBusinessLink, "The reviews link"),
  phone: z.string().trim().max(30).regex(/^(\+?[\d\s()-]{6,30})?$/, "The phone number has characters it should not."),
  whatsapp: z.string().trim().max(30).regex(/^(\+?[\d\s()-]{6,30})?$/, "The WhatsApp number has characters it should not."),
  email: z.string().trim().max(120).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "The email address is not valid."),
  hours: z.array(z.object({ days: z.array(z.number().int()), opens: z.string(), closes: z.string() })).max(14),
  images: z.array(site).max(10),
  ratingValue: z.number().min(0).max(5).nullable(),
  ratingCount: z.number().int().min(0).max(1_000_000).nullable(),
  coverage: z.array(z.object({ nameEn: text(80).min(1), nameAr: text(80) })).max(60),
  faqs: z.array(z.object({ question: bi, answer: bi })).max(12),
  categoryIds: z.array(z.string()).max(60),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
}).superRefine((v, ctx) => {
  const h = hoursProblem(v.hours);
  if (h) ctx.addIssue({ code: "custom", message: h, path: ["hours"] });
  if ((v.ratingValue === null) !== (v.ratingCount === null)) ctx.addIssue({ code: "custom", message: "Enter both the rating and the number of reviews, or neither.", path: ["ratingValue"] });
  v.faqs.forEach((f, i) => { if (!f.question.en || !f.answer.en) ctx.addIssue({ code: "custom", message: `FAQ ${i + 1} needs an English question and answer.`, path: ["faqs"] }); });
});
export type BranchInputValue = z.infer<typeof BranchInput>;

// ---------- what visitors and structured data get ----------
export type PublicBranch = {
  slug: string; areaSlug: string; areaNameEn: string; areaNameAr: string;
  nameEn: string; nameAr: string; branchNameEn: string; branchNameAr: string;
  addressEn: string; addressAr: string; streetEn: string; streetAr: string; localityEn: string; localityAr: string; postalCode: string;
  latitude: number; longitude: number;
  mapsUrl: string; embedUrl: string; directionsUrl: string; appleMapsUrl: string; businessProfileUrl: string; reviewsUrl: string;
  phone: string; telHref: string; whatsapp: string; whatsappUrl: string; email: string;
  hours: HoursRow[]; hoursSummary: { en: string; ar: string };
  images: string[]; rating: { value: number; count: number } | null;
  coverage: { nameEn: string; nameAr: string }[];
  faqs: { question: { en: string; ar: string }; answer: { en: string; ar: string } }[];
  categories: { nameEn: string; nameAr: string; href: string | null }[];
};

type Row = {
  slug: string; nameEn: string; nameAr: string; branchNameEn: string; branchNameAr: string; streetEn: string; streetAr: string; localityEn: string; localityAr: string; postalCode: string;
  addressEn: string; addressAr: string; latitude: number; longitude: number; mapsUrl: string; mapsEmbedUrl: string; appleMapsUrl: string; businessProfileUrl: string; reviewsUrl: string;
  phone: string; whatsapp: string; email: string; hours: unknown; images: string[]; ratingValue: number | null; ratingCount: number | null; coverage: unknown; faqs: unknown;
};

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// The full address visitors see: the one typed in, or street + district + emirate built from the parts.
export const fullAddress = (b: Pick<Row, "addressEn" | "addressAr" | "streetEn" | "streetAr" | "localityEn" | "localityAr">, emirate: { nameEn: string; nameAr: string }, lang: "en" | "ar") => {
  const typed = lang === "ar" ? b.addressAr || b.addressEn : b.addressEn || b.addressAr;
  if (typed) return typed;
  const parts = lang === "ar" ? [b.streetAr || b.streetEn, b.localityAr || b.localityEn, emirate.nameAr, "الإمارات العربية المتحدة"] : [b.streetEn || b.streetAr, b.localityEn || b.localityAr, emirate.nameEn, "UAE"];
  return parts.filter(Boolean).join(lang === "ar" ? "، " : ", ");
};

export function toPublicBranch(b: Row, ctx: { area: { slug: string; nameEn: string; nameAr: string }; categories: { nameEn: string; nameAr: string; href: string | null }[] }): PublicBranch {
  const hours = arr<HoursRow>(b.hours).filter((h) => h && Array.isArray(h.days));
  return {
    slug: b.slug, areaSlug: ctx.area.slug, areaNameEn: ctx.area.nameEn, areaNameAr: ctx.area.nameAr,
    nameEn: b.nameEn, nameAr: b.nameAr, branchNameEn: b.branchNameEn, branchNameAr: b.branchNameAr,
    addressEn: fullAddress(b, ctx.area, "en"), addressAr: fullAddress(b, ctx.area, "ar"),
    streetEn: b.streetEn, streetAr: b.streetAr, localityEn: b.localityEn, localityAr: b.localityAr, postalCode: b.postalCode,
    latitude: b.latitude, longitude: b.longitude,
    mapsUrl: b.mapsUrl, embedUrl: b.mapsEmbedUrl || embedUrlFor(b.latitude, b.longitude), directionsUrl: directionsUrlFor(b.latitude, b.longitude),
    appleMapsUrl: b.appleMapsUrl, businessProfileUrl: b.businessProfileUrl, reviewsUrl: b.reviewsUrl,
    phone: b.phone, telHref: telHref(b.phone), whatsapp: b.whatsapp, whatsappUrl: whatsappUrl(b.whatsapp || b.phone), email: b.email,
    hours, hoursSummary: { en: hoursSummary(hours, "en"), ar: hoursSummary(hours, "ar") },
    images: b.images, rating: b.ratingValue !== null && b.ratingCount !== null && b.ratingCount > 0 ? { value: b.ratingValue, count: b.ratingCount } : null,
    coverage: arr<{ nameEn: string; nameAr: string }>(b.coverage).filter((c) => c && typeof c.nameEn === "string"),
    faqs: arr<PublicBranch["faqs"][number]>(b.faqs).filter((f) => f?.question?.en && f?.answer?.en),
    categories: ctx.categories,
  };
}
