"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/adminGuard";
import { jobsActor } from "@/lib/jobs/guard";
import { JOB_TYPES } from "@/lib/jobs/constants";

type R = { ok: boolean; error?: string };
const fail = (error: string): R => ({ ok: false, error });
const done = (): R => {
  revalidatePath("/admin/jobs", "layout");
  return { ok: true };
};

const settingsSchema = z.object({
  minPhotos: z.number().int().min(0).max(5),
  maxPhotos: z.number().int().min(1).max(5),
  maxFileMb: z.number().int().min(1).max(20),
  notifyEmail: z.boolean(),
  notifyRecipients: z.array(z.string().email()).max(10),
  emailDigest: z.boolean(),
  retentionMonths: z.number().int().min(1).max(120),
  skills: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]{1,40}$/), labelEn: z.string().min(1).max(60), labelAr: z.string().min(1).max(60), active: z.boolean() })).max(60),
  areas: z.array(z.string().min(1).max(80)).max(300),
});

export async function saveJobSettings(raw: unknown): Promise<R> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  const p = settingsSchema.safeParse(raw);
  if (!p.success) return fail(`${p.error.issues[0]?.path.join(".") || "Settings"}: ${p.error.issues[0]?.message ?? "check the values"}`);
  const v = p.data;
  if (v.minPhotos > v.maxPhotos) return fail("The minimum number of photos can't be more than the maximum.");
  if (new Set(v.skills.map((s) => s.key)).size !== v.skills.length) return fail("Each skill needs its own key.");
  const data = { ...v, skills: v.skills as unknown as Prisma.InputJsonValue, areas: v.areas as unknown as Prisma.InputJsonValue };
  await prisma.jobSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  await writeAudit(g.actor, "jobs.settings.save", "JobSettings", "default", null, { minPhotos: v.minPhotos, maxPhotos: v.maxPhotos, maxFileMb: v.maxFileMb, retentionMonths: v.retentionMonths });
  return done();
}

const categorySchema = z.object({
  id: z.string().nullable(),
  key: z.string().regex(/^[a-z0-9-]{2,40}$/, "Key: lowercase letters, numbers and hyphens."),
  nameEn: z.string().trim().min(1).max(80),
  nameAr: z.string().trim().min(1).max(80),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

export async function saveCategory(raw: unknown): Promise<R> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  const p = categorySchema.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the category.");
  const { id, ...data } = p.data;
  const clash = await prisma.jobCategory.findUnique({ where: { key: data.key } });
  if (clash && clash.id !== id) return fail("Another category already uses this key.");
  if (id) await prisma.jobCategory.update({ where: { id }, data });
  else await prisma.jobCategory.create({ data });
  return done();
}

export async function deleteCategory(id: string): Promise<R> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  if ((await prisma.job.count({ where: { categoryId: id } })) > 0) return fail("This category has jobs. Switch it off instead of deleting it.");
  await prisma.jobCategory.delete({ where: { id } });
  return done();
}

const optionSchema = z.object({ value: z.string().regex(/^[a-z0-9-]{1,40}$/), labelEn: z.string().min(1).max(60), labelAr: z.string().min(1).max(60) });
const fieldSchema = z.object({
  id: z.string().nullable(),
  categoryId: z.string().min(1),
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{1,30}$/, "Key: letters and numbers, starting with a letter."),
  labelEn: z.string().trim().min(1).max(80),
  labelAr: z.string().trim().min(1).max(80),
  inputType: z.enum(["select", "text", "number", "boolean"]),
  options: z.array(optionSchema).max(30),
  appliesTo: z.array(z.enum(JOB_TYPES)).min(1, "Choose at least one job type."),
  required: z.boolean(),
  showInAd: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

export async function saveCategoryField(raw: unknown): Promise<R> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  const p = fieldSchema.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the field.");
  const { id, options, ...data } = p.data;
  if (data.inputType === "select" && options.length < 2) return fail("A choice field needs at least two options.");
  const clash = await prisma.jobCategoryField.findUnique({ where: { categoryId_key: { categoryId: data.categoryId, key: data.key } } });
  if (clash && clash.id !== id) return fail("This category already has a field with that key.");
  const row = { ...data, options: (data.inputType === "select" ? options : []) as unknown as Prisma.InputJsonValue };
  if (id) await prisma.jobCategoryField.update({ where: { id }, data: row });
  else await prisma.jobCategoryField.create({ data: row });
  return done();
}

export async function deleteCategoryField(id: string): Promise<R> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  await prisma.jobCategoryField.delete({ where: { id } });
  return done();
}
