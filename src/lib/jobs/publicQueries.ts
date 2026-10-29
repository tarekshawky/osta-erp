import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { EMIRATE_LABEL, JOB_TYPES, PROPERTY_TYPES } from "./constants";

export const PUBLIC_PAGE_SIZE = 12;

export type PublicFilters = { q?: string; type?: string; category?: string; emirate?: string; area?: string; property?: string };

// Jobs that are listed publicly: published, and the deadline (if any) has not passed.
export function listedWhere(f: PublicFilters, now = new Date()): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [{ status: "PUBLISHED" }, { slug: { not: null } }, { OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }] }];
  if ((JOB_TYPES as readonly string[]).includes(f.type ?? "")) and.push({ type: f.type as "PERMANENT" | "DAILY" });
  if (f.category) and.push({ category: { key: f.category } });
  if (f.emirate && f.emirate in EMIRATE_LABEL) and.push({ emirate: f.emirate as keyof typeof EMIRATE_LABEL });
  if ((PROPERTY_TYPES as readonly string[]).includes(f.property ?? "")) and.push({ propertyType: f.property as (typeof PROPERTY_TYPES)[number] });
  const area = (f.area ?? "").trim();
  if (area) and.push({ area: { contains: area, mode: "insensitive" } });
  const q = (f.q ?? "").trim();
  if (q) and.push({ OR: [{ titleEn: { contains: q, mode: "insensitive" } }, { titleAr: { contains: q, mode: "insensitive" } }] });
  return { AND: and };
}

export async function listPublicJobs(f: PublicFilters, page: number, now = new Date()) {
  const where = listedWhere(f, now);
  const [rows, total] = await Promise.all([
    prisma.job.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (Math.max(1, page) - 1) * PUBLIC_PAGE_SIZE, take: PUBLIC_PAGE_SIZE, include: { category: { include: { fields: true } } } }),
    prisma.job.count({ where }),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE)) };
}

export const jobBySlug = (slug: string) => prisma.job.findUnique({ where: { slug }, include: { category: { include: { fields: true } } } });
export const jobById = (id: string) => prisma.job.findUnique({ where: { id }, include: { category: { include: { fields: true } } } });
