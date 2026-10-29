import { CATEGORY_TRADE, EMIRATE_LABEL, MATERIALS_LABEL, PROPERTY_LABEL, type EmirateKey, type JobTypeKey, type MaterialsByKey, type PropertyTypeKey } from "./constants";
import { arDays, arWorkers, enDays } from "./arabic";
import { formatDubaiDate } from "./dates";

export type AdField = { key: string; labelEn: string; labelAr: string; value: string; valueAr: string; icon?: string };

export type AdJob = {
  type: JobTypeKey;
  categoryKey: string;
  categoryNameEn: string;
  categoryNameAr: string;
  emirate: EmirateKey;
  area: string | null;
  propertyType: PropertyTypeKey | null;
  workersRequired: number;
  workingDays: number | null;
  workingDaysPerWeek: number | null;
  dailyHours: string | null;
  dailyWage: number | null;
  monthlySalaryMin: number | null;
  monthlySalaryMax: number | null;
  wageToBeAgreed: boolean;
  materialsBy: MaterialsByKey | null;
  startDate: Date | null;
  applicationDeadline: Date | null;
  // Category fields flagged "show in ad" that have a value on this job.
  fields: AdField[];
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const ICON: Record<string, string> = { paintFinish: "🎨" };

// Lines whose data is missing are left out entirely: no "undefined", no invented wage or benefits.
export function buildAdText(lang: "ar" | "en", job: AdJob, url: string): string {
  const ar = lang === "ar";
  const trade = CATEGORY_TRADE[job.categoryKey] ?? { en: job.categoryNameEn, ar: job.categoryNameAr };
  const emirate = EMIRATE_LABEL[job.emirate][lang];
  const daily = job.type === "DAILY";
  const lines: string[] = [];
  const add = (s: string | null | undefined) => { if (s) lines.push(s); };
  const blank = () => { if (lines.length && lines[lines.length - 1] !== "") lines.push(""); };

  if (ar) {
    add(daily ? `📢 مطلوب ${trade.ar} للعمل باليومية — ${emirate}` : `📢 مطلوب ${trade.ar} — وظيفة ثابتة — ${emirate}`);
    blank();
    add(daily ? "تعلن خدمات اسطا عن توفر فرصة عمل باليومية بالمواصفات التالية:" : "تعلن خدمات اسطا عن توفر وظيفة ثابتة بالمواصفات التالية:");
  } else {
    add(daily ? `📢 Daily ${trade.en} Required — ${emirate}` : `📢 ${trade.en} Required — Permanent position — ${emirate}`);
    blank();
    add(daily ? "Osta Services is hiring for the following daily work opportunity:" : "Osta Services is hiring for the following permanent position:");
  }
  blank();

  add(ar ? `🔹 المهنة: ${trade.ar}` : `🔹 Position: ${trade.en}`);
  add(job.area ? (ar ? `📍 الموقع: ${emirate} – ${job.area}` : `📍 Location: ${emirate} – ${job.area}`) : ar ? `📍 الموقع: ${emirate}` : `📍 Location: ${emirate}`);
  if (job.propertyType) add(ar ? `🏠 نوع العقار: ${PROPERTY_LABEL[job.propertyType].ar}` : `🏠 Property Type: ${PROPERTY_LABEL[job.propertyType].en}`);
  for (const f of job.fields) {
    const icon = f.icon ?? ICON[f.key] ?? "🔸";
    add(ar ? `${icon} ${f.labelAr}: ${f.valueAr || f.value}` : `${icon} ${f.labelEn}: ${f.value}`);
  }

  if (daily) {
    if (job.workingDays) add(ar ? `📅 مدة العمل: ${arDays(job.workingDays)}` : `📅 Duration: ${enDays(job.workingDays)}`);
    if (job.dailyWage !== null) add(ar ? `💰 الأجر اليومي: ${fmt(job.dailyWage)} درهم` : `💰 Daily Wage: AED ${fmt(job.dailyWage)}`);
    else if (job.wageToBeAgreed) add(ar ? "💰 الأجر اليومي: يتم الاتفاق" : "💰 Daily Wage: To be agreed");
    if (job.dailyHours) add(ar ? `⏰ ساعات العمل: ${job.dailyHours}` : `⏰ Working Hours: ${job.dailyHours}`);
    if (job.materialsBy && job.materialsBy !== "TO_BE_AGREED") add(ar ? `🧰 المواد: على ${MATERIALS_LABEL[job.materialsBy].ar}` : `🧰 Materials: provided by ${MATERIALS_LABEL[job.materialsBy].en}`);
  } else {
    const { monthlySalaryMin: lo, monthlySalaryMax: hi } = job;
    if (lo !== null && hi !== null && lo !== hi) add(ar ? `💰 الراتب الشهري: ${fmt(lo)} – ${fmt(hi)} درهم` : `💰 Monthly Salary: AED ${fmt(lo)} – ${fmt(hi)}`);
    else if (lo !== null || hi !== null) add(ar ? `💰 الراتب الشهري: ${fmt((lo ?? hi)!)} درهم` : `💰 Monthly Salary: AED ${fmt((lo ?? hi)!)}`);
    else if (job.wageToBeAgreed) add(ar ? "💰 الراتب الشهري: يتم الاتفاق" : "💰 Monthly Salary: To be agreed");
    if (job.workingDaysPerWeek) add(ar ? `📅 أيام العمل: ${job.workingDaysPerWeek} ${job.workingDaysPerWeek <= 10 ? "أيام" : "يومًا"} في الأسبوع` : `📅 Working Days: ${job.workingDaysPerWeek} per week`);
    if (job.dailyHours) add(ar ? `⏰ ساعات العمل: ${job.dailyHours}` : `⏰ Working Hours: ${job.dailyHours}`);
  }
  add(ar ? `👷 العدد المطلوب: ${arWorkers(job.workersRequired)}` : `👷 Workers Required: ${job.workersRequired}`);
  if (job.startDate) add(ar ? `🗓️ تاريخ البدء: ${formatDubaiDate(job.startDate, "ar")}` : `🗓️ Start Date: ${formatDubaiDate(job.startDate, "en")}`);
  if (job.applicationDeadline) add(ar ? `⏰ آخر موعد للتقديم: ${formatDubaiDate(job.applicationDeadline, "ar", true)}` : `⏰ Application Deadline: ${formatDubaiDate(job.applicationDeadline, "en", true)}`);

  blank();
  add(ar ? "📸 يُرجى تجهيز صور من أعمالك السابقة عند التقديم." : "📸 Please prepare photos of your previous work.");
  blank();
  add(ar ? "📝 للتقديم ورفع صور أعمالك:" : "📝 Apply and upload your work photos:");
  add(url);
  blank();
  add(ar ? "تقديم الطلب لا يضمن القبول." : "Submitting an application does not guarantee selection.");
  return lines.join("\n");
}

export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
