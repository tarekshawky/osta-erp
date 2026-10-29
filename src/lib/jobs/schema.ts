import { z } from "zod";
import { EMIRATES, JOB_TYPES, MATERIALS_BY, PROPERTY_TYPES } from "./constants";

// Shared by the admin form (client) and the server actions, so both always agree.

const optionalText = (max: number) => z.string().max(max).optional().default("");
const optionalNumber = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().finite().nullable());
const optionalInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().int().min(min).max(max).nullable());

export const jobInputSchema = z
  .object({
    type: z.enum(JOB_TYPES),
    categoryId: z.string().min(1, "Choose a category."),
    titleEn: optionalText(160),
    titleAr: optionalText(160),
    descriptionEn: optionalText(30_000),
    descriptionAr: optionalText(30_000),
    workersRequired: z.preprocess((v) => Number(v), z.number().int().min(1, "At least 1 worker.").max(1000)),
    emirate: z.enum(EMIRATES),
    area: optionalText(120),
    propertyType: z.enum(PROPERTY_TYPES).nullable().optional().default(null),
    startDate: optionalText(10), // YYYY-MM-DD (Dubai)
    applicationDeadline: optionalText(16), // YYYY-MM-DDTHH:mm (Dubai)
    monthlySalaryMin: optionalNumber,
    monthlySalaryMax: optionalNumber,
    workingDaysPerWeek: optionalInt(1, 7),
    dailyWage: optionalNumber,
    workingDays: optionalInt(1, 365),
    dailyHours: optionalText(60),
    materialsBy: z.enum(MATERIALS_BY).nullable().optional().default(null),
    wageToBeAgreed: z.boolean().optional().default(false),
    requirementsEn: optionalText(5000),
    requirementsAr: optionalText(5000),
    customFields: z.record(z.string(), z.union([z.string().max(300), z.number(), z.boolean()])).optional().default({}),
  })
  .superRefine((v, ctx) => {
    const bad = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (v.monthlySalaryMin !== null && v.monthlySalaryMin < 0) bad("monthlySalaryMin", "Salary can't be negative.");
    if (v.monthlySalaryMax !== null && v.monthlySalaryMax < 0) bad("monthlySalaryMax", "Salary can't be negative.");
    if (v.monthlySalaryMin !== null && v.monthlySalaryMax !== null && v.monthlySalaryMin > v.monthlySalaryMax) bad("monthlySalaryMax", "The maximum salary must be at least the minimum.");
    if (v.dailyWage !== null && v.dailyWage < 0) bad("dailyWage", "The wage can't be negative.");
    if (v.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(v.startDate)) bad("startDate", "Use a valid start date.");
    if (v.applicationDeadline && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v.applicationDeadline)) bad("applicationDeadline", "Use a valid deadline (date and time).");
    if (v.wageToBeAgreed && (v.dailyWage !== null || v.monthlySalaryMin !== null || v.monthlySalaryMax !== null)) bad("wageToBeAgreed", "Clear the wage/salary or untick “To be agreed”.");
  });

export type JobInput = z.infer<typeof jobInputSchema>;
export type JobInputRaw = z.input<typeof jobInputSchema>;

// Fields missing in one language. Saving a draft with one language is fine; publishing asks for confirmation.
export function missingTranslations(v: { titleEn?: string | null; titleAr?: string | null; descriptionEn?: string | null; descriptionAr?: string | null }): string[] {
  const strip = (h?: string | null) => (h ?? "").replace(/<[^>]*>/g, "").trim();
  const out: string[] = [];
  if (!(v.titleEn ?? "").trim()) out.push("Title (English)");
  if (!(v.titleAr ?? "").trim()) out.push("Title (Arabic)");
  if (!strip(v.descriptionEn)) out.push("Description (English)");
  if (!strip(v.descriptionAr)) out.push("Description (Arabic)");
  return out;
}

// What a job needs before it can be published at all (a title and a description in at least one language).
export function publishProblems(v: { titleEn?: string | null; titleAr?: string | null; descriptionEn?: string | null; descriptionAr?: string | null; workersRequired: number }): string[] {
  const strip = (h?: string | null) => (h ?? "").replace(/<[^>]*>/g, "").trim();
  const out: string[] = [];
  if (!(v.titleEn ?? "").trim() && !(v.titleAr ?? "").trim()) out.push("Add a title in Arabic or English.");
  if (!strip(v.descriptionEn) && !strip(v.descriptionAr)) out.push("Add a description in Arabic or English.");
  if (v.workersRequired < 1) out.push("Workers required must be at least 1.");
  return out;
}

// ---- public application form ----

export const LANGS = ["ar", "en", "other"] as const;

export function applicationSchema(opts: { minPhotos: number; maxPhotos: number }) {
  return z
    .object({
      fullName: z.string().trim().min(3, "Enter your full name.").max(80, "The name is too long."),
      phone: z.string().trim().min(5, "Enter your phone number.").max(30),
      whatsappSameAsPhone: z.boolean().default(true),
      whatsapp: z.string().trim().max(30).optional().default(""),
      preferredLang: z.enum(LANGS),
      otherLang: z.string().trim().max(40).optional().default(""),
      emirate: z.enum(EMIRATES),
      area: z.string().trim().max(120).optional().default(""),
      skills: z.array(z.string().max(60)).max(30).default([]),
      otherSkills: z.string().trim().max(200).optional().default(""),
      experienceYears: optionalInt(0, 50),
      notes: z.string().trim().max(1000, "Notes can be up to 1000 characters.").optional().default(""),
      consent: z.literal(true, { message: "You must agree to continue." }),
      photoTokens: z.array(z.string().min(10).max(300)).min(opts.minPhotos, `Add at least ${opts.minPhotos} photo${opts.minPhotos === 1 ? "" : "s"} of your work.`).max(opts.maxPhotos, `You can add up to ${opts.maxPhotos} photos.`),
      idempotencyKey: z.string().min(8).max(100),
      website: z.string().max(200).optional().default(""), // honeypot
      elapsedMs: z.number().optional(),
      turnstileToken: z.string().max(4000).optional().default(""),
    })
    .superRefine((v, ctx) => {
      if (v.preferredLang === "other" && !v.otherLang) ctx.addIssue({ code: "custom", path: ["otherLang"], message: "Write your language." });
      if (!v.whatsappSameAsPhone && !v.whatsapp) ctx.addIssue({ code: "custom", path: ["whatsapp"], message: "Enter your WhatsApp number." });
    });
}
export type ApplicationInput = z.infer<ReturnType<typeof applicationSchema>>;
