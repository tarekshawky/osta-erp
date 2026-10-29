import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { EMIRATE_LABEL, JOB_STATUSES, JOB_TYPES } from "./constants";
import { PAGE_SIZE } from "./applications";

const DAY = 86_400_000;

export async function overviewData(now = new Date()) {
  const [total, published, permanent, daily, unread, review, accepted, completed, recent, deadlines, notifications, unreadNotifications, perJobRaw] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: "PUBLISHED", OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }] } }),
    prisma.job.count({ where: { type: "PERMANENT" } }),
    prisma.job.count({ where: { type: "DAILY" } }),
    prisma.jobApplication.count({ where: { isRead: false } }),
    prisma.jobApplication.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.jobApplication.count({ where: { status: "ACCEPTED" } }),
    prisma.job.count({ where: { status: "COMPLETED" } }),
    prisma.jobApplication.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { applicant: { select: { fullName: true, phone: true } }, job: { select: { id: true, number: true, titleEn: true, titleAr: true, category: { select: { nameEn: true } } } }, photos: { select: { id: true } } } }),
    prisma.job.findMany({ where: { status: "PUBLISHED", applicationDeadline: { gt: now, lte: new Date(now.getTime() + 2 * DAY) } }, orderBy: { applicationDeadline: "asc" }, select: { id: true, number: true, titleEn: true, titleAr: true, applicationDeadline: true, category: { select: { nameEn: true } } } }),
    prisma.jobNotification.findMany({ orderBy: { createdAt: "desc" }, take: 12, select: { id: true, type: true, message: true, readAt: true, createdAt: true, jobId: true, applicationId: true } }),
    prisma.jobNotification.count({ where: { readAt: null } }),
    prisma.jobApplication.groupBy({ by: ["jobId"], where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY) } }, _count: { _all: true }, orderBy: { _count: { jobId: "desc" } }, take: 8 }),
  ]);
  const jobs = perJobRaw.length ? await prisma.job.findMany({ where: { id: { in: perJobRaw.map((r) => r.jobId) } }, select: { id: true, number: true, titleEn: true, titleAr: true, category: { select: { nameEn: true } } } }) : [];
  const perJob = perJobRaw.map((r) => {
    const j = jobs.find((x) => x.id === r.jobId);
    return { jobId: r.jobId, label: j ? `#${j.number} ${j.titleEn || j.titleAr || j.category.nameEn}` : r.jobId, count: r._count._all };
  });
  return { total, published, permanent, daily, unread, review, accepted, completed, recent, deadlines, notifications, unreadNotifications, perJob };
}

export type JobFilters = { q?: string; type?: string; categoryId?: string; status?: string; emirate?: string; from?: string; to?: string };

export function jobWhere(f: JobFilters): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [];
  if ((JOB_TYPES as readonly string[]).includes(f.type ?? "")) and.push({ type: f.type as "PERMANENT" | "DAILY" });
  if (f.categoryId) and.push({ categoryId: f.categoryId });
  if ((JOB_STATUSES as readonly string[]).includes(f.status ?? "")) and.push({ status: f.status as never });
  if (f.emirate && f.emirate in EMIRATE_LABEL) and.push({ emirate: f.emirate as keyof typeof EMIRATE_LABEL });
  const range: Prisma.DateTimeFilter = {};
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) range.gte = new Date(`${f.from}T00:00:00+04:00`);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) range.lte = new Date(`${f.to}T23:59:59+04:00`);
  if (range.gte || range.lte) and.push({ createdAt: range });
  const q = (f.q ?? "").trim();
  if (q) {
    const n = Number(q.replace(/^#/, ""));
    and.push({ OR: [{ titleEn: { contains: q, mode: "insensitive" } }, { titleAr: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { area: { contains: q, mode: "insensitive" } }, ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : [])] });
  }
  return and.length ? { AND: and } : {};
}

export async function listJobs(f: JobFilters, page = 1) {
  const where = jobWhere(f);
  const [rows, total] = await Promise.all([
    prisma.job.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (Math.max(1, page) - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { category: { select: { nameEn: true, nameAr: true, key: true } }, _count: { select: { applications: true } } },
    }),
    prisma.job.count({ where }),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function jobDetail(id: string) {
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      category: { include: { fields: { orderBy: { sortOrder: "asc" } } } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      applications: { orderBy: { createdAt: "desc" }, include: { applicant: { select: { id: true, fullName: true, phone: true, whatsapp: true, skills: true } }, photos: { select: { id: true } } } },
    },
  });
  return job;
}

// ---------- reports ----------

export async function reportsData(from: Date, to: Date, now = new Date()) {
  const [published, byType, perJob, accRej, completed, underStaffed] = await Promise.all([
    prisma.job.findMany({ where: { publishedAt: { gte: from, lte: to } }, select: { publishedAt: true, type: true } }),
    prisma.job.groupBy({ by: ["type"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
    prisma.job.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { id: true, number: true, titleEn: true, titleAr: true, status: true, category: { select: { nameEn: true } }, _count: { select: { applications: true } } }, orderBy: { number: "desc" }, take: 200 }),
    prisma.jobApplication.groupBy({ by: ["status"], where: { createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
    prisma.job.findMany({ where: { status: "COMPLETED", completedAt: { gte: from, lte: to } }, select: { id: true, number: true, titleEn: true, titleAr: true, completedAt: true, category: { select: { nameEn: true } } }, orderBy: { completedAt: "desc" } }),
    // Deadline passed and fewer accepted workers than required.
    prisma.job.findMany({
      where: { applicationDeadline: { lt: now }, status: { in: ["PUBLISHED", "APPLICATIONS_CLOSED", "IN_PROGRESS"] } },
      select: { id: true, number: true, titleEn: true, titleAr: true, workersRequired: true, applicationDeadline: true, category: { select: { nameEn: true } }, applications: { where: { status: "ACCEPTED" }, select: { id: true } } },
      orderBy: { applicationDeadline: "desc" }, take: 200,
    }),
  ]);
  const byMonth = new Map<string, { permanent: number; daily: number }>();
  for (const j of published) {
    const key = j.publishedAt!.toISOString().slice(0, 7);
    const cur = byMonth.get(key) ?? { permanent: 0, daily: 0 };
    if (j.type === "PERMANENT") cur.permanent++;
    else cur.daily++;
    byMonth.set(key, cur);
  }
  return {
    publishedByMonth: [...byMonth].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v })),
    byType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])) as Record<string, number>,
    perJob, accepted: accRej.find((r) => r.status === "ACCEPTED")?._count._all ?? 0, rejected: accRej.find((r) => r.status === "REJECTED")?._count._all ?? 0, completed,
    underStaffed: underStaffed.filter((j) => j.applications.length < j.workersRequired).map((j) => ({ ...j, accepted: j.applications.length })),
  };
}

// The report period from ?from=&to= (default: the last 90 days).
export function periodFrom(sp: { from?: string; to?: string }, now = new Date()) {
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? new Date(`${sp.to}T23:59:59+04:00`) : now;
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? new Date(`${sp.from}T00:00:00+04:00`) : new Date(to.getTime() - 90 * 86_400_000);
  return { from, to };
}

