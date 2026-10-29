import type { Prisma } from "@/generated/prisma";
import { EMIRATE_LABEL, MATERIALS_LABEL, PROPERTY_LABEL, type EmirateKey, type MaterialsByKey, type PropertyTypeKey } from "./constants";
import { arDays, arWorkers, enDays, enWorkers } from "./arabic";
import { formatDubaiDate } from "./dates";
import { publicState } from "./status";
import type { Lang } from "./publicText";

export type PublicJobRow = Prisma.JobGetPayload<{ include: { category: { include: { fields: true } } } }>;

export type PublicJob = {
  id: string; slug: string | null; type: "PERMANENT" | "DAILY"; state: ReturnType<typeof publicState>;
  title: string; descriptionHtml: string; requirements: string; fallbackNote: "ar-only" | "en-only" | null;
  category: string; emirate: string; area: string | null; property: string | null; workers: number; workersText: string; durationText: string | null;
  wage: { kind: "amount" | "range" | "agreed"; text: string } | null; duration: number | null; daysPerWeek: number | null; hours: string | null; materials: string | null;
  startDate: string | null; deadline: string | null; fields: { label: string; value: string }[];
};

const strip = (h: string | null) => (h ?? "").replace(/<[^>]*>/g, "").trim();
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Only what a visitor may see. No applicant data, no counts, no internal notes. Title and description fall back to the other
// language (with a small note) when one is missing.
export function toPublicJob(j: PublicJobRow, lang: Lang, now = new Date()): PublicJob {
  const hasTitle = (l: Lang) => !!(l === "ar" ? j.titleAr : j.titleEn)?.trim();
  const hasDesc = (l: Lang) => !!strip(l === "ar" ? j.descriptionAr : j.descriptionEn);
  const other: Lang = lang === "ar" ? "en" : "ar";
  const useOtherTitle = !hasTitle(lang) && hasTitle(other);
  const useOtherDesc = !hasDesc(lang) && hasDesc(other);
  const pickTitle = (l: Lang) => ((l === "ar" ? j.titleAr : j.titleEn) ?? "").trim();
  const title = pickTitle(useOtherTitle ? other : lang) || (lang === "ar" ? j.category.nameAr : j.category.nameEn);
  const desc = (useOtherDesc ? other : lang) === "ar" ? j.descriptionAr : j.descriptionEn;
  const reqs = (lang === "ar" ? j.requirementsAr : j.requirementsEn) || (lang === "ar" ? j.requirementsEn : j.requirementsAr) || "";
  const values = (j.customFields && typeof j.customFields === "object" ? j.customFields : {}) as Record<string, unknown>;

  const fields: PublicJob["fields"] = [];
  for (const f of j.category.fields.filter((x) => x.showInAd && x.appliesTo.includes(j.type)).sort((a, b) => a.sortOrder - b.sortOrder)) {
    const raw = values[f.key];
    if (raw === undefined || raw === null || raw === "" || raw === false) continue;
    const opts = (Array.isArray(f.options) ? f.options : []) as { value: string; labelEn: string; labelAr: string }[];
    const o = f.inputType === "select" ? opts.find((x) => x.value === raw) : undefined;
    fields.push({ label: lang === "ar" ? f.labelAr : f.labelEn, value: o ? (lang === "ar" ? o.labelAr : o.labelEn) : raw === true ? (lang === "ar" ? "نعم" : "Yes") : String(raw) });
  }

  let wage: PublicJob["wage"] = null;
  const n = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));
  if (j.type === "DAILY") {
    const w = n(j.dailyWage);
    wage = w !== null ? { kind: "amount", text: lang === "ar" ? `${fmt(w)} درهم / اليوم` : `AED ${fmt(w)} / day` } : { kind: "agreed", text: lang === "ar" ? "يتم الاتفاق" : "To be agreed" };
  } else {
    const lo = n(j.monthlySalaryMin);
    const hi = n(j.monthlySalaryMax);
    if (lo !== null && hi !== null && lo !== hi) wage = { kind: "range", text: lang === "ar" ? `${fmt(lo)} – ${fmt(hi)} درهم / الشهر` : `AED ${fmt(lo)} – ${fmt(hi)} / month` };
    else if (lo !== null || hi !== null) wage = { kind: "amount", text: lang === "ar" ? `${fmt((lo ?? hi)!)} درهم / الشهر` : `AED ${fmt((lo ?? hi)!)} / month` };
    else wage = { kind: "agreed", text: lang === "ar" ? "يتم الاتفاق" : "To be agreed" };
  }

  return {
    id: j.id, slug: j.slug, type: j.type, state: publicState(j, now), title, descriptionHtml: desc ?? "", requirements: reqs,
    // The page falls back to the other language when one is missing; a small note tells the visitor.
    fallbackNote: useOtherTitle || useOtherDesc ? (other === "ar" ? "ar-only" : "en-only") : null,
    category: lang === "ar" ? j.category.nameAr : j.category.nameEn, emirate: EMIRATE_LABEL[j.emirate as EmirateKey][lang], area: j.area,
    property: j.propertyType ? PROPERTY_LABEL[j.propertyType as PropertyTypeKey][lang] : null, workers: j.workersRequired,
    workersText: lang === "ar" ? arWorkers(j.workersRequired) : enWorkers(j.workersRequired), durationText: j.workingDays ? (lang === "ar" ? arDays(j.workingDays) : enDays(j.workingDays)) : null, wage, duration: j.workingDays, daysPerWeek: j.workingDaysPerWeek,
    hours: j.dailyHours, materials: j.materialsBy && j.materialsBy !== "TO_BE_AGREED" ? MATERIALS_LABEL[j.materialsBy as MaterialsByKey][lang] : null,
    startDate: j.startDate ? formatDubaiDate(j.startDate, lang) : null, deadline: j.applicationDeadline ? formatDubaiDate(j.applicationDeadline, lang, true) : null, fields,
  };
}
