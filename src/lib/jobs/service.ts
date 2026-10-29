import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { isRichHtml, plainToRichHtml, sanitizeRichHtml } from "@/lib/cms/richText";
import { DEFAULT_CATEGORIES, DEFAULT_SKILLS, PAINT_FINISH_OPTIONS, STATUS_TRANSITIONS, type JobStatusKey } from "./constants";
import { jobSlug } from "./slug";
import { dateToDubaiDay, dateToDubaiLocal, dubaiLocalToDate } from "./dates";
import { jobInputSchema, missingTranslations, publishProblems, type JobInput } from "./schema";
import { canTransition } from "./status";

export class JobError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}
export type Actor = { id: string; name: string };

// ---------- settings & seed ----------

export type SkillOption = { key: string; labelEn: string; labelAr: string; active: boolean };

// The one settings row. Created on first use with the default skills.
export async function getJobSettings() {
  const row = await prisma.jobSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default", skills: DEFAULT_SKILLS as unknown as Prisma.InputJsonValue } });
  const skills = (Array.isArray(row.skills) ? row.skills : []) as unknown as SkillOption[];
  const areas = (Array.isArray(row.areas) ? row.areas : []) as unknown as string[];
  return { ...row, skills: skills.length ? skills : DEFAULT_SKILLS, areas };
}

// Idempotent: adds the default categories (and the painting finish field) that do not exist yet. Never overwrites edits.
export async function seedJobDefaults() {
  let order = 0;
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.jobCategory.upsert({ where: { key: c.key }, update: {}, create: { ...c, sortOrder: order } });
    order++;
  }
  const painting = await prisma.jobCategory.findUnique({ where: { key: "painting" } });
  if (painting) {
    await prisma.jobCategoryField.upsert({
      where: { categoryId_key: { categoryId: painting.id, key: "paintFinish" } },
      update: {},
      create: {
        categoryId: painting.id, key: "paintFinish", labelEn: "Paint Finish", labelAr: "نوع الدهان", inputType: "select",
        options: PAINT_FINISH_OPTIONS as unknown as Prisma.InputJsonValue, appliesTo: ["PERMANENT", "DAILY"], required: false, showInAd: true, sortOrder: 0,
      },
    });
  }
  await getJobSettings();
}

export type CategoryDto = {
  id: string; key: string; nameEn: string; nameAr: string; active: boolean; sortOrder: number;
  fields: { id: string; key: string; labelEn: string; labelAr: string; inputType: string; options: { value: string; labelEn: string; labelAr: string }[]; appliesTo: ("PERMANENT" | "DAILY")[]; required: boolean; showInAd: boolean; sortOrder: number }[];
};

export async function listCategories(opts: { activeOnly?: boolean } = {}): Promise<CategoryDto[]> {
  const rows = await prisma.jobCategory.findMany({ where: opts.activeOnly ? { active: true } : {}, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], include: { fields: { orderBy: { sortOrder: "asc" } } } });
  return rows.map((c) => ({
    id: c.id, key: c.key, nameEn: c.nameEn, nameAr: c.nameAr, active: c.active, sortOrder: c.sortOrder,
    fields: c.fields.map((f) => ({ id: f.id, key: f.key, labelEn: f.labelEn, labelAr: f.labelAr, inputType: f.inputType, options: (Array.isArray(f.options) ? f.options : []) as never, appliesTo: f.appliesTo, required: f.required, showInAd: f.showInAd, sortOrder: f.sortOrder })),
  }));
}

// ---------- job <-> form ----------

export type JobDto = {
  id: string; number: number; slug: string | null; type: "PERMANENT" | "DAILY"; status: JobStatusKey; categoryId: string;
  titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string; workersRequired: number;
  emirate: JobInput["emirate"]; area: string; propertyType: JobInput["propertyType"]; startDate: string; applicationDeadline: string;
  monthlySalaryMin: number | null; monthlySalaryMax: number | null; workingDaysPerWeek: number | null; dailyWage: number | null; workingDays: number | null;
  dailyHours: string; materialsBy: JobInput["materialsBy"]; wageToBeAgreed: boolean; requirementsEn: string; requirementsAr: string; customFields: Record<string, string | number | boolean>;
  orderId: string | null; publishedAt: string | null; completedAt: string | null; createdAt: string; updatedAt: string;
};

const num = (d: Prisma.Decimal | null | undefined) => (d === null || d === undefined ? null : Number(d));

type JobRow = Prisma.JobGetPayload<object>;
export function jobToDto(j: JobRow): JobDto {
  return {
    id: j.id, number: j.number, slug: j.slug, type: j.type, status: j.status, categoryId: j.categoryId,
    titleEn: j.titleEn ?? "", titleAr: j.titleAr ?? "", descriptionEn: j.descriptionEn ?? "", descriptionAr: j.descriptionAr ?? "", workersRequired: j.workersRequired,
    emirate: j.emirate, area: j.area ?? "", propertyType: j.propertyType, startDate: dateToDubaiDay(j.startDate), applicationDeadline: dateToDubaiLocal(j.applicationDeadline),
    monthlySalaryMin: num(j.monthlySalaryMin), monthlySalaryMax: num(j.monthlySalaryMax), workingDaysPerWeek: j.workingDaysPerWeek, dailyWage: num(j.dailyWage), workingDays: j.workingDays,
    dailyHours: j.dailyHours ?? "", materialsBy: j.materialsBy, wageToBeAgreed: j.wageToBeAgreed, requirementsEn: j.requirementsEn ?? "", requirementsAr: j.requirementsAr ?? "",
    customFields: (j.customFields && typeof j.customFields === "object" ? j.customFields : {}) as Record<string, string | number | boolean>,
    orderId: j.orderId, publishedAt: j.publishedAt?.toISOString() ?? null, completedAt: j.completedAt?.toISOString() ?? null, createdAt: j.createdAt.toISOString(), updatedAt: j.updatedAt.toISOString(),
  };
}

// Descriptions are rich text: always rebuilt through the HTML allow-list (plain text becomes paragraphs).
export function cleanDescription(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  const html = isRichHtml(t) ? sanitizeRichHtml(t) : plainToRichHtml(t);
  return html.replace(/<[^>]*>/g, "").trim() ? html : null;
}

const blankToNull = (s: string | null | undefined) => ((s ?? "").trim() || null);

// Keeps only the category fields that apply to this job type and checks select values. Required fields are enforced on publish.
async function cleanCustomFields(categoryId: string, type: "PERMANENT" | "DAILY", values: JobInput["customFields"]) {
  const fields = await prisma.jobCategoryField.findMany({ where: { categoryId, appliesTo: { has: type } } });
  const out: Record<string, string | number | boolean> = {};
  for (const f of fields) {
    const v = values[f.key];
    if (v === undefined || v === "" || v === null) continue;
    if (f.inputType === "select") {
      const opts = (Array.isArray(f.options) ? f.options : []) as { value: string }[];
      if (!opts.some((o) => o.value === v)) throw new JobError(`“${f.labelEn}” has an invalid choice.`, `customFields.${f.key}`);
    }
    if (f.inputType === "number") out[f.key] = Number(v);
    else if (f.inputType === "boolean") out[f.key] = v === true || v === "true";
    else out[f.key] = String(v);
  }
  return { values: out, fields };
}

async function dataFromInput(input: JobInput) {
  const category = await prisma.jobCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } });
  if (!category) throw new JobError("Choose a valid category.", "categoryId");
  const { values } = await cleanCustomFields(input.categoryId, input.type, input.customFields);
  const daily = input.type === "DAILY";
  return {
    type: input.type, categoryId: input.categoryId,
    titleEn: blankToNull(input.titleEn), titleAr: blankToNull(input.titleAr),
    descriptionEn: cleanDescription(input.descriptionEn), descriptionAr: cleanDescription(input.descriptionAr),
    workersRequired: input.workersRequired, emirate: input.emirate, area: blankToNull(input.area), propertyType: input.propertyType,
    startDate: dubaiLocalToDate(input.startDate), applicationDeadline: dubaiLocalToDate(input.applicationDeadline),
    // Each job type keeps only its own terms.
    monthlySalaryMin: daily ? null : input.monthlySalaryMin, monthlySalaryMax: daily ? null : input.monthlySalaryMax, workingDaysPerWeek: daily ? null : input.workingDaysPerWeek,
    dailyWage: daily ? input.dailyWage : null, workingDays: daily ? input.workingDays : null, materialsBy: daily ? input.materialsBy : null,
    dailyHours: blankToNull(input.dailyHours), wageToBeAgreed: input.wageToBeAgreed,
    requirementsEn: blankToNull(input.requirementsEn), requirementsAr: blankToNull(input.requirementsAr), customFields: values as Prisma.InputJsonValue,
  };
}

export function parseJobInput(raw: unknown): { ok: true; data: JobInput } | { ok: false; error: string; field?: string } {
  const r = jobInputSchema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  const first = r.error.issues[0];
  return { ok: false, error: first?.message ?? "Check the form.", field: first?.path.join(".") };
}

export async function createJob(input: JobInput, actor: Actor) {
  const data = await dataFromInput(input);
  const job = await prisma.job.create({ data: { ...data, createdById: actor.id, statusHistory: { create: { to: "DRAFT", note: "Created", byUserId: actor.id, byName: actor.name } } } });
  return job;
}

// The public address never changes after the first publish, so only the content is updated here.
export async function updateJob(id: string, input: JobInput) {
  const existing = await prisma.job.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!existing) throw new JobError("Job not found.");
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") throw new JobError("A completed or cancelled job can't be edited.");
  const data = await dataFromInput(input);
  return prisma.job.update({ where: { id }, data });
}

// ---------- status changes ----------

export type StatusResult = { ok: true; slug: string | null } | { ok: false; error: string; needsConfirm?: boolean; missing?: string[] };

// Every status change goes through here: it checks the rule, applies side effects and writes the history row.
export async function changeJobStatus(id: string, to: JobStatusKey, actor: Actor, opts: { note?: string; confirmMissingTranslation?: boolean } = {}): Promise<StatusResult> {
  const job = await prisma.job.findUnique({ where: { id }, include: { category: { select: { key: true } } } });
  if (!job) return { ok: false, error: "Job not found." };
  const from = job.status as JobStatusKey;
  if (from === to) return { ok: true, slug: job.slug };
  if (!canTransition(from, to)) return { ok: false, error: `A ${from.toLowerCase().replace(/_/g, " ")} job can't move to ${to.toLowerCase().replace(/_/g, " ")}.` };

  const patch: Prisma.JobUpdateInput = { status: to };
  if (to === "PUBLISHED") {
    const problems = publishProblems({ titleEn: job.titleEn, titleAr: job.titleAr, descriptionEn: job.descriptionEn, descriptionAr: job.descriptionAr, workersRequired: job.workersRequired });
    if (problems.length) return { ok: false, error: problems.join(" ") };
    // Required category fields must be filled before the job goes public.
    const required = await prisma.jobCategoryField.findMany({ where: { categoryId: job.categoryId, required: true, appliesTo: { has: job.type } } });
    const cf = (job.customFields && typeof job.customFields === "object" ? job.customFields : {}) as Record<string, unknown>;
    const missingFields = required.filter((f) => cf[f.key] === undefined || cf[f.key] === "");
    if (missingFields.length) return { ok: false, error: `Fill in: ${missingFields.map((f) => f.labelEn).join(", ")}.` };
    const missing = missingTranslations(job);
    if (missing.length && !opts.confirmMissingTranslation) return { ok: false, error: "Some fields are missing in one language.", needsConfirm: true, missing };
    // The slug is made once, on the first publish, and never changes (links already shared keep working).
    if (!job.slug) patch.slug = jobSlug(job.category.key, job.emirate, job.number);
    if (!job.publishedAt) patch.publishedAt = new Date();
  }
  if (to === "COMPLETED") patch.completedAt = new Date();

  await prisma.$transaction([
    prisma.job.update({ where: { id }, data: patch }),
    prisma.jobStatusHistory.create({ data: { jobId: id, from, to, note: opts.note?.trim() || null, byUserId: actor.id, byName: actor.name } }),
  ]);
  return { ok: true, slug: (patch.slug as string | undefined) ?? job.slug };
}

export async function duplicateJob(id: string, actor: Actor) {
  const src = await prisma.job.findUnique({ where: { id } });
  if (!src) throw new JobError("Job not found.");
  const copy = await prisma.job.create({
    data: {
      type: src.type, categoryId: src.categoryId, titleEn: src.titleEn ? `${src.titleEn} (copy)` : null, titleAr: src.titleAr ? `${src.titleAr} (نسخة)` : null,
      descriptionEn: src.descriptionEn, descriptionAr: src.descriptionAr, workersRequired: src.workersRequired, emirate: src.emirate, area: src.area, propertyType: src.propertyType,
      startDate: src.startDate, applicationDeadline: src.applicationDeadline, monthlySalaryMin: src.monthlySalaryMin, monthlySalaryMax: src.monthlySalaryMax, workingDaysPerWeek: src.workingDaysPerWeek,
      dailyWage: src.dailyWage, workingDays: src.workingDays, dailyHours: src.dailyHours, materialsBy: src.materialsBy, wageToBeAgreed: src.wageToBeAgreed,
      requirementsEn: src.requirementsEn, requirementsAr: src.requirementsAr, customFields: (src.customFields ?? undefined) as Prisma.InputJsonValue | undefined,
      orderId: src.orderId, createdById: actor.id, statusHistory: { create: { to: "DRAFT", note: `Duplicated from job #${src.number}`, byUserId: actor.id, byName: actor.name } },
    },
  });
  return copy;
}

// Transition options for the UI buttons.
export const nextStatuses = (from: JobStatusKey) => STATUS_TRANSITIONS[from];

// ---------- notifications ----------

export async function createJobNotification(n: { type: string; jobId?: string | null; applicationId?: string | null; message: string; dedupeKey?: string }) {
  try {
    await prisma.jobNotification.create({ data: { type: n.type, jobId: n.jobId ?? null, applicationId: n.applicationId ?? null, message: n.message, dedupeKey: n.dedupeKey ?? null } });
    return true;
  } catch (e) {
    // A repeated reminder hits the unique dedupe key: that is the point, not an error.
    if ((e as { code?: string }).code === "P2002") return false;
    throw e;
  }
}
export const unreadJobNotifications = () => prisma.jobNotification.count({ where: { readAt: null } });

// Area suggestions for the job form: the areas set in Settings plus every area already used on a job.
export async function areaSuggestions(): Promise<string[]> {
  const [settings, used] = await Promise.all([getJobSettings(), prisma.job.findMany({ where: { area: { not: null } }, select: { area: true }, distinct: ["area"], take: 300 })]);
  return [...new Set([...settings.areas, ...used.map((u) => u.area!).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
}
