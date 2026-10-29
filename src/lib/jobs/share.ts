import type { Prisma } from "@/generated/prisma";
import { buildAdText, type AdField, type AdJob } from "./adText";
import { jobPublicUrl } from "./urls";

type JobWithCategory = Prisma.JobGetPayload<{ include: { category: { include: { fields: true } } } }>;

// The job as the ad text needs it. Only category fields flagged "show in ad" that actually have a value are included.
export function toAdJob(j: JobWithCategory): AdJob {
  const values = (j.customFields && typeof j.customFields === "object" ? j.customFields : {}) as Record<string, unknown>;
  const fields: AdField[] = [];
  for (const f of j.category.fields.filter((x) => x.showInAd && x.appliesTo.includes(j.type)).sort((a, b) => a.sortOrder - b.sortOrder)) {
    const raw = values[f.key];
    if (raw === undefined || raw === null || raw === "" || raw === false) continue;
    const opts = (Array.isArray(f.options) ? f.options : []) as { value: string; labelEn: string; labelAr: string }[];
    const opt = f.inputType === "select" ? opts.find((o) => o.value === raw) : undefined;
    const en = opt ? opt.labelEn : raw === true ? "Yes" : String(raw);
    const ar = opt ? opt.labelAr : raw === true ? "نعم" : String(raw);
    fields.push({ key: f.key, labelEn: f.labelEn, labelAr: f.labelAr, value: en, valueAr: ar });
  }
  const n = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));
  return {
    type: j.type, categoryKey: j.category.key, categoryNameEn: j.category.nameEn, categoryNameAr: j.category.nameAr, emirate: j.emirate, area: j.area, propertyType: j.propertyType,
    workersRequired: j.workersRequired, workingDays: j.workingDays, workingDaysPerWeek: j.workingDaysPerWeek, dailyHours: j.dailyHours, dailyWage: n(j.dailyWage),
    monthlySalaryMin: n(j.monthlySalaryMin), monthlySalaryMax: n(j.monthlySalaryMax), wageToBeAgreed: j.wageToBeAgreed, materialsBy: j.materialsBy, startDate: j.startDate,
    applicationDeadline: j.applicationDeadline, fields,
  };
}

export function shareTexts(j: JobWithCategory): { ar: string; en: string; url: string } | null {
  if (!j.slug) return null;
  const url = jobPublicUrl(j.slug);
  const ad = toAdJob(j);
  return { ar: buildAdText("ar", ad, url), en: buildAdText("en", ad, url), url };
}
