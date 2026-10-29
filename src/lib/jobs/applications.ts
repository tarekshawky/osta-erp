import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { emailSender } from "@/lib/emailSender";
import { hashIp } from "@/lib/forms/forms";
import { writeAudit } from "@/lib/adminGuard";
import { APPLICATION_STATUSES, EMIRATE_LABEL, type ApplicationStatusKey } from "./constants";
import { normalizePhone, phoneSearchDigits } from "./phone";
import { verifyUploadToken } from "./photos";
import type { ApplicationInput } from "./schema";
import { isOpenForApplications } from "./status";
import { createJobNotification, getJobSettings, JobError, type Actor } from "./service";
import { jobPublicUrl } from "./urls";

export const APPLY_RATE = { perIp: 5, perPhone: 5, windowMs: 60 * 60_000 };
export const UPLOADS_PER_HOUR = 40;

export const clientIp = (headers: Headers) => headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";

export type SubmitResult =
  | { ok: true; code: string }
  | { ok: false; reason: "closed" | "rate_limited" | "duplicate" | "validation" | "photos"; message: string; code?: string; fields?: Record<string, string> };

export const applicationCode = (seq: number) => `APP-${String(seq).padStart(6, "0")}`;

// Everything about a submission that needs the database. `input` has already passed the zod schema; the job is re-checked
// here so a form left open past the deadline (or a direct request) is refused.
export async function submitApplication(slug: string, raw: ApplicationInput, ip: string, now = new Date()): Promise<SubmitResult> {
  const job = await prisma.job.findUnique({ where: { slug }, include: { category: { select: { nameEn: true } } } });
  if (!job || !isOpenForApplications(job, now)) return { ok: false, reason: "closed", message: "Applications for this opportunity are closed." };

  const phone = normalizePhone(raw.phone);
  if (!phone) return { ok: false, reason: "validation", message: "Enter a valid phone number.", fields: { phone: "Enter a valid phone number." } };
  const whatsapp = raw.whatsappSameAsPhone ? phone : normalizePhone(raw.whatsapp);
  if (!whatsapp) return { ok: false, reason: "validation", message: "Enter a valid WhatsApp number.", fields: { whatsapp: "Enter a valid WhatsApp number." } };

  // Pressing submit twice (or a retry after a lost response) returns the first result.
  const same = await prisma.jobApplication.findUnique({ where: { idempotencyKey: raw.idempotencyKey }, select: { code: true } });
  if (same?.code) return { ok: true, code: same.code };

  const ipHash = hashIp(ip);
  const since = new Date(now.getTime() - APPLY_RATE.windowMs);
  const [byIp, byPhone] = await Promise.all([
    prisma.jobApplication.count({ where: { consentIpHash: ipHash, createdAt: { gte: since } } }),
    prisma.jobApplication.count({ where: { applicant: { phone }, createdAt: { gte: since } } }),
  ]);
  if (byIp >= APPLY_RATE.perIp || byPhone >= APPLY_RATE.perPhone) return { ok: false, reason: "rate_limited", message: "Too many applications. Please try again later." };

  const applicant = await prisma.jobApplicant.findUnique({ where: { phone }, select: { id: true } });
  if (applicant) {
    const already = await prisma.jobApplication.findUnique({ where: { jobId_applicantId: { jobId: job.id, applicantId: applicant.id } }, select: { code: true } });
    if (already) return { ok: false, reason: "duplicate", message: "You've already applied to this job. We'll contact you if you're selected.", code: already.code ?? undefined };
  }

  // The photos were uploaded earlier; each token is bound to this job and expires.
  const ids = [...new Set(raw.photoTokens.map((t) => verifyUploadToken(t, job.id, now.getTime())))];
  if (ids.some((i) => i === null) || ids.length !== raw.photoTokens.length) return { ok: false, reason: "photos", message: "A photo upload expired. Please add your photos again." };
  const temps = await prisma.jobUploadTemp.findMany({ where: { id: { in: ids as string[] }, jobId: job.id, usedAt: null } });
  if (temps.length !== ids.length) return { ok: false, reason: "photos", message: "A photo upload expired. Please add your photos again." };

  const snapshot = {
    fullName: raw.fullName, phone, whatsapp, preferredLang: raw.preferredLang === "other" ? raw.otherLang : raw.preferredLang, emirate: raw.emirate, area: raw.area || null,
    skills: raw.skills, otherSkills: raw.otherSkills || null, experienceYears: raw.experienceYears, notes: raw.notes || null,
  };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const person = await tx.jobApplicant.upsert({
        where: { phone },
        update: { fullName: raw.fullName, whatsapp, preferredLang: snapshot.preferredLang, emirate: raw.emirate, area: raw.area || null, skills: raw.skills, otherSkills: raw.otherSkills || null, experienceYears: raw.experienceYears, anonymizedAt: null },
        create: { fullName: raw.fullName, phone, whatsapp, preferredLang: snapshot.preferredLang, emirate: raw.emirate, area: raw.area || null, skills: raw.skills, otherSkills: raw.otherSkills || null, experienceYears: raw.experienceYears },
      });
      const app = await tx.jobApplication.create({
        data: { jobId: job.id, applicantId: person.id, notes: raw.notes || null, snapshot, consentAt: now, consentIpHash: ipHash, idempotencyKey: raw.idempotencyKey },
      });
      const code = applicationCode(app.seq);
      await tx.jobApplication.update({ where: { id: app.id }, data: { code } });
      for (const [i, t] of temps.entries()) {
        const photo = await tx.jobApplicationPhoto.create({
          data: { applicationId: app.id, storageKey: `jp_${t.id}`, mimeType: t.mimeType, sizeBytes: t.sizeBytes, width: t.width, height: t.height, sortOrder: i, data: { create: { data: t.data, thumb: t.thumb } } },
        });
        void photo;
      }
      await tx.jobUploadTemp.deleteMany({ where: { id: { in: temps.map((t) => t.id) } } });
      return { id: app.id, code, photoCount: temps.length };
    });

    const title = job.titleEn || job.titleAr || job.category.nameEn;
    await createJobNotification({ type: "new_application", jobId: job.id, applicationId: created.id, message: `${raw.fullName} applied for “${title}” (${EMIRATE_LABEL[job.emirate].en}) with ${created.photoCount} photo${created.photoCount === 1 ? "" : "s"}.`, dedupeKey: `new_application:${created.id}` });
    await emailNewApplication({ code: created.code, name: raw.fullName, phone, title, emirate: EMIRATE_LABEL[job.emirate].en, photos: created.photoCount, slug }).catch((e) => console.error("[jobs] notification email failed:", e instanceof Error ? e.message : "unknown"));
    return { ok: true, code: created.code };
  } catch (e) {
    // Two requests at once for the same person and job: the second hits the unique pair.
    if ((e as { code?: string }).code === "P2002") return { ok: false, reason: "duplicate", message: "You've already applied to this job. We'll contact you if you're selected." };
    throw e;
  }
}

async function emailNewApplication(a: { code: string; name: string; phone: string; title: string; emirate: string; photos: number; slug: string }) {
  const settings = await getJobSettings();
  if (!settings.notifyEmail || settings.emailDigest || settings.notifyRecipients.length === 0) return;
  const text = `New job application ${a.code}\n\nApplicant: ${a.name}\nPhone: ${a.phone}\nJob: ${a.title} (${a.emirate})\nPhotos: ${a.photos}\n\nOpen the job: ${jobPublicUrl(a.slug)}`;
  await emailSender.send({ subject: `New job application: ${a.name} — ${a.title}`, text, html: `<pre style="font-family:inherit">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`, to: settings.notifyRecipients });
}

// ---------- admin: applications ----------

export type ApplicationFilters = {
  q?: string; jobId?: string; jobType?: "PERMANENT" | "DAILY"; categoryId?: string; emirate?: string; skill?: string; status?: string; from?: string; to?: string; unread?: boolean;
};
export const PAGE_SIZE = 25;

export function applicationWhere(f: ApplicationFilters): Prisma.JobApplicationWhereInput {
  const and: Prisma.JobApplicationWhereInput[] = [];
  if (f.jobId) and.push({ jobId: f.jobId });
  if (f.jobType) and.push({ job: { type: f.jobType } });
  if (f.categoryId) and.push({ job: { categoryId: f.categoryId } });
  if (f.emirate && f.emirate in EMIRATE_LABEL) and.push({ applicant: { emirate: f.emirate as keyof typeof EMIRATE_LABEL } });
  if (f.skill) and.push({ applicant: { skills: { has: f.skill } } });
  if ((APPLICATION_STATUSES as readonly string[]).includes(f.status ?? "")) and.push({ status: f.status as ApplicationStatusKey });
  if (f.unread) and.push({ isRead: false });
  const range: Prisma.DateTimeFilter = {};
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) range.gte = new Date(`${f.from}T00:00:00+04:00`);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) range.lte = new Date(`${f.to}T23:59:59+04:00`);
  if (range.gte || range.lte) and.push({ createdAt: range });
  const q = (f.q ?? "").trim();
  if (q) {
    const digits = phoneSearchDigits(q);
    const or: Prisma.JobApplicationWhereInput[] = [
      { code: { contains: q, mode: "insensitive" } },
      { applicant: { fullName: { contains: q, mode: "insensitive" } } },
    ];
    // A phone in any format ("050 123 4567", "+971501234567", "971501234567") finds the same person.
    if (digits) {
      const tail = digits.slice(-9);
      or.push({ applicant: { phone: { contains: tail.length >= 6 ? tail : digits } } }, { applicant: { whatsapp: { contains: tail.length >= 6 ? tail : digits } } });
    }
    and.push({ OR: or });
  }
  return and.length ? { AND: and } : {};
}

export const applicationListInclude = {
  applicant: { select: { id: true, fullName: true, phone: true, whatsapp: true, skills: true, emirate: true, area: true } },
  job: { select: { id: true, number: true, slug: true, titleEn: true, titleAr: true, emirate: true, type: true, category: { select: { nameEn: true } } } },
  photos: { select: { id: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.JobApplicationInclude;

export async function listApplications(filters: ApplicationFilters, page = 1) {
  const where = applicationWhere(filters);
  const [rows, total] = await Promise.all([
    prisma.jobApplication.findMany({ where, include: applicationListInclude, orderBy: { createdAt: "desc" }, skip: (Math.max(1, page) - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.jobApplication.count({ where }),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function setApplicationStatus(ids: string[], status: ApplicationStatusKey, actor: Actor) {
  if (!APPLICATION_STATUSES.includes(status)) throw new JobError("Unknown status.");
  const res = await prisma.jobApplication.updateMany({ where: { id: { in: ids } }, data: { status, isRead: true } });
  await writeAudit(actor, "jobs.application.status", "JobApplication", ids.length === 1 ? ids[0] : null, null, { ids: ids.slice(0, 50), count: ids.length, status });
  return res.count;
}

export async function addApplicationNote(applicationId: string, body: string, actor: Actor) {
  const text = body.trim();
  if (!text) throw new JobError("Write a note first.");
  if (text.length > 2000) throw new JobError("Notes can be up to 2000 characters.");
  return prisma.jobApplicationNote.create({ data: { applicationId, body: text, byUserId: actor.id, byName: actor.name } });
}

export const CONTACT_CHANNELS = ["call", "whatsapp"] as const;
export const CONTACT_OUTCOMES = ["reached", "no_answer", "interested", "not_interested", "other"] as const;

export async function logContact(applicationId: string, channel: string, outcome: string, note: string, actor: Actor) {
  if (!(CONTACT_CHANNELS as readonly string[]).includes(channel)) throw new JobError("Choose call or WhatsApp.");
  if (!(CONTACT_OUTCOMES as readonly string[]).includes(outcome)) throw new JobError("Choose an outcome.");
  const log = await prisma.jobContactLog.create({ data: { applicationId, channel, outcome, note: note.trim().slice(0, 1000) || null, byUserId: actor.id, byName: actor.name } });
  // Having reached out moves a new application along.
  await prisma.jobApplication.updateMany({ where: { id: applicationId, status: { in: ["NEW", "UNDER_REVIEW", "SHORTLISTED"] } }, data: { status: "CONTACTED" } });
  return log;
}

// The same person gets a new application on another open job. No second applicant record; the photos are copied.
export async function linkApplicantToJob(applicationId: string, jobId: string, actor: Actor) {
  const [src, job] = await Promise.all([
    prisma.jobApplication.findUnique({ where: { id: applicationId }, include: { photos: { include: { data: true } } } }),
    prisma.job.findUnique({ where: { id: jobId } }),
  ]);
  if (!src || !job) throw new JobError("Application or job not found.");
  if (!isOpenForApplications(job)) throw new JobError("Choose a job that is open for applications.");
  const exists = await prisma.jobApplication.findUnique({ where: { jobId_applicantId: { jobId, applicantId: src.applicantId } }, select: { code: true } });
  if (exists) throw new JobError(`This person already has an application for that job (${exists.code}).`);
  const created = await prisma.$transaction(async (tx) => {
    const app = await tx.jobApplication.create({ data: { jobId, applicantId: src.applicantId, notes: src.notes, snapshot: src.snapshot as Prisma.InputJsonValue, consentAt: src.consentAt, consentIpHash: null } });
    const code = applicationCode(app.seq);
    await tx.jobApplication.update({ where: { id: app.id }, data: { code } });
    for (const p of src.photos) {
      await tx.jobApplicationPhoto.create({
        data: { applicationId: app.id, storageKey: `jp_${p.id}_${app.seq}`, mimeType: p.mimeType, sizeBytes: p.sizeBytes, width: p.width, height: p.height, sortOrder: p.sortOrder, ...(p.data ? { data: { create: { data: p.data.data, thumb: p.data.thumb } } } : {}) },
      });
    }
    return { id: app.id, code };
  });
  await writeAudit(actor, "jobs.application.link", "JobApplication", created.id, { from: src.code }, { jobId, code: created.code });
  return created;
}

// ---------- data deletion & retention ----------

// Removes a person's photos and personal details. Their applications stay (anonymised) so job statistics stay right.
export async function anonymizeApplicant(applicantId: string, actor: Actor | null, reason: string) {
  const a = await prisma.jobApplicant.findUnique({ where: { id: applicantId }, select: { id: true, anonymizedAt: true } });
  if (!a || a.anonymizedAt) return false;
  await prisma.$transaction([
    prisma.jobApplicationPhoto.deleteMany({ where: { application: { applicantId } } }), // JobPhotoData goes with it
    prisma.jobApplicationNote.deleteMany({ where: { application: { applicantId } } }),
    prisma.jobContactLog.updateMany({ where: { application: { applicantId } }, data: { note: null } }),
    prisma.jobApplication.updateMany({ where: { applicantId }, data: { snapshot: {}, notes: null, consentIpHash: null, idempotencyKey: null } }),
    prisma.jobApplicant.update({ where: { id: applicantId }, data: { fullName: "Deleted applicant", phone: `deleted-${applicantId}`, whatsapp: null, area: null, skills: [], otherSkills: null, experienceYears: null, anonymizedAt: new Date() } }),
  ]);
  if (actor) await writeAudit(actor, "jobs.applicant.delete-data", "JobApplicant", applicantId, null, { reason });
  else await prisma.auditLog.create({ data: { actorName: "System (retention)", action: "jobs.applicant.delete-data", entity: "JobApplicant", entityId: applicantId, after: { reason } } });
  return true;
}

// Scheduled cleanup: for jobs finished more than `retentionMonths` ago, anonymise applicants who were never accepted.
export async function runRetention(now = new Date()) {
  const { retentionMonths } = await getJobSettings();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  const applicants = await prisma.jobApplicant.findMany({
    where: {
      anonymizedAt: null,
      applications: { some: {}, none: { OR: [{ status: "ACCEPTED" }, { job: { NOT: { status: { in: ["COMPLETED", "CANCELLED"] } } } }, { job: { completedAt: { gt: cutoff } } }, { job: { status: "CANCELLED", updatedAt: { gt: cutoff } } }] } },
    },
    select: { id: true },
    take: 200,
  });
  let done = 0;
  for (const a of applicants) if (await anonymizeApplicant(a.id, null, `retention ${retentionMonths} months`)) done++;
  // Photos uploaded but never submitted.
  const orphans = await prisma.jobUploadTemp.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 24 * 3_600_000) } } });
  return { anonymized: done, orphanUploads: orphans.count };
}

// ---------- workers ----------

export async function listWorkers(f: { q?: string; skill?: string; emirate?: string }, page = 1) {
  const and: Prisma.JobApplicantWhereInput[] = [{ anonymizedAt: null }];
  if (f.skill) and.push({ skills: { has: f.skill } });
  if (f.emirate && f.emirate in EMIRATE_LABEL) and.push({ emirate: f.emirate as keyof typeof EMIRATE_LABEL });
  const q = (f.q ?? "").trim();
  if (q) {
    const digits = phoneSearchDigits(q);
    and.push({ OR: [{ fullName: { contains: q, mode: "insensitive" } }, ...(digits ? [{ phone: { contains: digits.slice(-9) } }] : [])] });
  }
  const where: Prisma.JobApplicantWhereInput = { AND: and };
  const [rows, total] = await Promise.all([
    prisma.jobApplicant.findMany({
      where, orderBy: { updatedAt: "desc" }, skip: (Math.max(1, page) - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { applications: { select: { status: true, createdAt: true } } },
    }),
    prisma.jobApplicant.count({ where }),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
