"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEmployee } from "@/lib/auth";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import { formProblem, type FormField } from "@/lib/forms/forms";

export type ActionResult = { ok: boolean; error?: string; id?: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

export type FormInput = {
  slug: string; nameEn: string; nameAr: string; fields: FormField[]; recipients: string[];
  submitLabelEn: string; submitLabelAr: string; successEn: string; successAr: string; active: boolean;
};

// For the page-builder picker (any admin editing a page needs to see the forms).
export async function listForms(): Promise<{ slug: string; name: string; active: boolean }[]> {
  await requireEmployee("ADMIN");
  const forms = await prisma.cmsForm.findMany({ orderBy: { nameEn: "asc" }, select: { slug: true, nameEn: true, active: true } });
  return forms.map((f) => ({ slug: f.slug, name: f.nameEn, active: f.active }));
}

export async function saveForm(id: string | null, input: FormInput): Promise<ActionResult> {
  const g = await guardPermission("pages.edit");
  if (!g.ok) return fail(g.error);
  const problem = formProblem(input);
  if (problem) return fail(problem);
  if (!input.submitLabelEn.trim() || !input.submitLabelAr.trim() || !input.successEn.trim() || !input.successAr.trim()) return fail("Button and thank-you texts are required in both languages.");

  const clash = await prisma.cmsForm.findUnique({ where: { slug: input.slug } });
  if (clash && clash.id !== id) return fail("A form with this slug already exists.");

  const data = {
    slug: input.slug, nameEn: input.nameEn.trim(), nameAr: input.nameAr.trim(), fields: input.fields as never, recipients: input.recipients.map((r) => r.trim()),
    submitLabelEn: input.submitLabelEn.trim(), submitLabelAr: input.submitLabelAr.trim(), successEn: input.successEn.trim(), successAr: input.successAr.trim(), active: input.active,
  };
  const before = id ? await prisma.cmsForm.findUnique({ where: { id }, select: { slug: true, nameEn: true, active: true } }) : null;
  const saved = id ? await prisma.cmsForm.update({ where: { id }, data }) : await prisma.cmsForm.create({ data });
  await writeAudit(g.admin, id ? "form.update" : "form.create", "CmsForm", saved.id, before, { slug: data.slug, nameEn: data.nameEn, active: data.active, fields: input.fields.length });
  revalidatePath("/admin/website/forms");
  return { ok: true, id: saved.id };
}

// Forms with leads are deactivated, never deleted: leads are business records.
export async function deleteForm(id: string): Promise<ActionResult> {
  const g = await guardPermission("pages.delete");
  if (!g.ok) return fail(g.error);
  const form = await prisma.cmsForm.findUnique({ where: { id }, include: { _count: { select: { submissions: true } } } });
  if (!form) return fail("Form not found.");
  if (form._count.submissions > 0) return fail(`This form has ${form._count.submissions} lead${form._count.submissions === 1 ? "" : "s"}. Deactivate it instead of deleting.`);
  await prisma.cmsForm.delete({ where: { id } });
  await writeAudit(g.admin, "form.delete", "CmsForm", id, { slug: form.slug }, null);
  revalidatePath("/admin/website/forms");
  return { ok: true };
}

const STATUSES = ["NEW", "CONTACTED", "CLOSED", "SPAM"];

export async function updateLead(id: string, status: string, notes: string): Promise<ActionResult> {
  const g = await guardPermission("leads.view");
  if (!g.ok) return fail(g.error);
  if (!STATUSES.includes(status)) return fail("Unknown status.");
  const before = await prisma.cmsFormSubmission.findUnique({ where: { id }, select: { status: true, formId: true } });
  if (!before) return fail("Lead not found.");
  await prisma.cmsFormSubmission.update({ where: { id }, data: { status, notes: notes.trim().slice(0, 1000) } });
  // The audit trail records that a lead was triaged, never its personal contents.
  await writeAudit(g.admin, "lead.update", "CmsFormSubmission", id, { status: before.status }, { status });
  revalidatePath(`/admin/website/forms/${before.formId}/submissions`);
  return { ok: true };
}
