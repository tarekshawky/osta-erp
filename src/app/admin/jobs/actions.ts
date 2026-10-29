"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/adminGuard";
import { hashPin } from "@/lib/session";
import { jobsActor } from "@/lib/jobs/guard";
import { changeJobStatus, createJob, duplicateJob, JobError, parseJobInput, updateJob, type StatusResult } from "@/lib/jobs/service";
import { addApplicationNote, anonymizeApplicant, linkApplicantToJob, logContact, setApplicationStatus } from "@/lib/jobs/applications";
import { APPLICATION_STATUSES, JOB_STATUSES, type ApplicationStatusKey, type JobStatusKey } from "@/lib/jobs/constants";

export type JobActionResult = { ok: boolean; error?: string; field?: string; id?: string; slug?: string | null; needsConfirm?: boolean; missing?: string[] };
const fail = (error: string, extra: Partial<JobActionResult> = {}): JobActionResult => ({ ok: false, error, ...extra });

function refresh(jobId?: string) {
  revalidatePath("/admin/jobs", "layout");
  if (jobId) {
    revalidatePath(`/admin/jobs/${jobId}`);
    revalidatePath("/jobs", "layout");
  }
}

// Create (id = null) or update a job from the form. Saving never publishes; a draft may have only one language.
export async function saveJob(id: string | null, raw: unknown): Promise<JobActionResult> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  const parsed = parseJobInput(raw);
  if (!parsed.ok) return fail(parsed.error, { field: parsed.field });
  try {
    const job = id ? await updateJob(id, parsed.data) : await createJob(parsed.data, g.actor);
    refresh(job.id);
    return { ok: true, id: job.id, slug: job.slug };
  } catch (e) {
    if (e instanceof JobError) return fail(e.message, { field: e.field });
    throw e;
  }
}

const toResult = (id: string, r: StatusResult): JobActionResult => (r.ok ? { ok: true, id, slug: r.slug } : { ok: false, error: r.error, needsConfirm: r.needsConfirm, missing: r.missing });

export async function setJobStatus(id: string, to: string, opts: { note?: string; confirmMissingTranslation?: boolean } = {}): Promise<JobActionResult> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  if (!(JOB_STATUSES as readonly string[]).includes(to)) return fail("Unknown status.");
  const r = await changeJobStatus(id, to as JobStatusKey, g.actor, opts);
  if (r.ok) refresh(id);
  return toResult(id, r);
}

export async function duplicateJobAction(id: string): Promise<JobActionResult> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  try {
    const copy = await duplicateJob(id, g.actor);
    refresh(copy.id);
    return { ok: true, id: copy.id };
  } catch (e) {
    if (e instanceof JobError) return fail(e.message);
    throw e;
  }
}

// ---- applications ----

export async function changeApplicationStatus(ids: string[], status: string): Promise<JobActionResult> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  if (!(APPLICATION_STATUSES as readonly string[]).includes(status)) return fail("Unknown status.");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) return fail("Choose between 1 and 500 applications.");
  await setApplicationStatus(ids, status as ApplicationStatusKey, g.actor);
  refresh();
  return { ok: true };
}

export async function markApplicationRead(id: string): Promise<void> {
  const g = await jobsActor();
  if (!g.ok) return;
  await prisma.jobApplication.updateMany({ where: { id, isRead: false }, data: { isRead: true } });
  revalidatePath("/admin/jobs", "layout");
}

export async function addNote(applicationId: string, body: string): Promise<JobActionResult> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  try {
    await addApplicationNote(applicationId, body, g.actor);
    revalidatePath(`/admin/jobs/applications/${applicationId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof JobError) return fail(e.message);
    throw e;
  }
}

export async function logContactAction(applicationId: string, channel: string, outcome: string, note: string): Promise<JobActionResult> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  try {
    await logContact(applicationId, channel, outcome, note, g.actor);
    revalidatePath(`/admin/jobs/applications/${applicationId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof JobError) return fail(e.message);
    throw e;
  }
}

export async function linkToJob(applicationId: string, jobId: string): Promise<JobActionResult> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  try {
    const created = await linkApplicantToJob(applicationId, jobId, g.actor);
    refresh();
    return { ok: true, id: created.id };
  } catch (e) {
    if (e instanceof JobError) return fail(e.message);
    throw e;
  }
}

// ---- workers ----

export async function deleteApplicantData(applicantId: string): Promise<JobActionResult> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  const done = await anonymizeApplicant(applicantId, g.actor, "requested by admin");
  refresh();
  return done ? { ok: true } : fail("Nothing to delete (already removed).");
}

// "Convert to Employee": makes an employee record from the worker's details and links it. Needs a code and a 4-digit PIN.
export async function convertToEmployee(applicantId: string, input: { code: string; jobTitle: string; pin: string }): Promise<JobActionResult> {
  const g = await jobsActor();
  if (!g.ok) return fail(g.error);
  const code = input.code.trim();
  const jobTitle = input.jobTitle.trim();
  if (!code || !jobTitle) return fail("Employee code and job title are required.");
  if (!/^\d{4}$/.test(input.pin)) return fail("PIN code must be exactly 4 digits.");
  const a = await prisma.jobApplicant.findUnique({ where: { id: applicantId } });
  if (!a || a.anonymizedAt) return fail("Worker not found.");
  if (a.employeeId) return fail("This worker is already an employee.");
  if (await prisma.employee.findUnique({ where: { code } })) return fail("An employee with this code already exists.");
  const emp = await prisma.employee.create({ data: { code, name: a.fullName, jobTitle, phone: a.phone, role: "EMPLOYEE", pinHash: hashPin(input.pin), status: "active", joinDate: new Date() } });
  await prisma.jobApplicant.update({ where: { id: applicantId }, data: { employeeId: emp.id } });
  await writeAudit(g.actor, "jobs.worker.convert-to-employee", "JobApplicant", applicantId, null, { employeeId: emp.id, code });
  revalidatePath("/admin/employees");
  refresh();
  return { ok: true, id: emp.id };
}

// ---- notifications ----

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  const g = await jobsActor();
  if (!g.ok) return;
  await prisma.jobNotification.updateMany({ where: { readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
  revalidatePath("/admin/jobs", "layout");
}
