"use server";

import { revalidatePath } from "next/cache";
import type { Employee } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { guardPermission, writeAudit } from "@/lib/adminGuard";
import * as svc from "@/lib/contracts/service";
import * as terms from "@/lib/contracts/terms";
import { parseClauses } from "@/lib/contracts/terms";
import type { Clause } from "@/lib/contracts/clauses";
import type { Adjustment } from "@/lib/contracts/snapshot";
import { agreementUrl, sendCustomerEmail, type MessageKind } from "@/lib/contracts/notify";

// Every action here changes an agreement, so each one checks the admin's permission on the server and writes to the audit trail.
// The workflow rules themselves (what is allowed from which status) live in lib/contracts and are enforced there too.

export type CResult = { ok: boolean; error?: string; whatsapp?: string | null; url?: string; id?: string };
const fail = (error: string): CResult => ({ ok: false, error });

type Guarded = { error: string } | { actor: svc.Actor; admin: Employee };
async function guard(): Promise<Guarded> {
  const g = await guardPermission("contracts.manage");
  if (!g.ok) return { error: g.error };
  return { actor: { type: "admin", id: g.admin.id, name: g.admin.name }, admin: g.admin };
}

const refresh = (id?: string) => {
  revalidatePath("/admin/contracts");
  if (id) revalidatePath(`/admin/contracts/${id}`);
  revalidatePath("/admin/website/maintenance-packages");
};

export async function approveContract(id: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.approve(id, g.actor);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.approve", "Contract", id, null, { paymentLinkIssued: true });
  refresh(id);
  return { ok: true, whatsapp: r.whatsapp, url: r.paymentUrl };
}

// Builds the agreement and its PDF for a request that has none yet, and sends the customer the link to review and accept it.
export async function createAgreementFromRequest(subscriptionId: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.createFromRequest(subscriptionId, g.actor);
  if (!r.ok) return fail(r.error);
  if (r.created) await writeAudit(g.admin, "contract.create-from-request", "Contract", r.id, null, { subscriptionId });
  refresh(r.id);
  return { ok: true, id: r.id };
}

export async function recordCustomerAcceptance(id: string, how: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.recordAcceptance(id, g.actor, how);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.record-acceptance", "Contract", id, null, { how });
  refresh(id);
  return { ok: true };
}

export async function requestChanges(id: string, message: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.requestChanges(id, g.actor, message);
  if (!r.ok) return fail(r.error);
  refresh(id);
  return { ok: true };
}

export async function reviseContract(id: string, input: { adjustments: Adjustment[]; packagePrice?: number | null; settleOpenItems: boolean; reason: string }): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.revise(id, g.actor, input);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.revise", "Contract", id, null, { version: r.version });
  refresh(id);
  return { ok: true };
}

export async function editContractDetails(id: string, input: svc.DetailsInput, reason: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.editDetails(id, g.actor, input, reason);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.edit-details", "Contract", id, null, { version: r.version });
  refresh(id);
  return { ok: true };
}

export async function rejectContract(id: string, reason: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.reject(id, g.actor, reason);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.reject", "Contract", id, null, { reason });
  refresh(id);
  return { ok: true };
}

export async function cancelContract(id: string, reason: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.cancel(id, g.actor, reason);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.cancel", "Contract", id, null, { reason });
  refresh(id);
  return { ok: true };
}

// Recording a payment activates the agreement, so it is the most guarded step: the method needs a reference, or for an approved
// alternative arrangement a written description of who approved what.
export async function recordPayment(id: string, input: { method: string; reference: string; note: string; paidDate: string }): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.paidDate);
  const paidAt = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) : null;
  if (!paidAt || Number.isNaN(paidAt.getTime())) return fail("Enter the date the payment was received.");
  if (paidAt.getTime() > Date.now() + 36 * 3600_000) return fail("The payment date cannot be in the future.");
  const r = await svc.confirmPayment(id, g.actor, { method: input.method, reference: input.reference, note: input.note, paidAt });
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.payment", "Contract", id, null, { method: input.method, reference: input.reference });
  refresh(id);
  revalidatePath("/admin/invoices");
  return { ok: true };
}

export async function renewContract(id: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.renew(id, g.actor);
  if (!r.ok) return fail(r.error);
  refresh(id);
  return { ok: true, id: r.id };
}

export async function issueAddendum(id: string, input: svc.AddendumInput): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.issueAddendum(id, g.actor, input);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.addendum", "Contract", id, null, { number: r.number });
  refresh(id);
  return { ok: true };
}

export async function approveAddendum(contractId: string, addendumId: string, note: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.recordAddendumApproval(addendumId, g.actor, note);
  if (!r.ok) return fail(r.error);
  refresh(contractId);
  return { ok: true };
}

export async function suspendContract(id: string, reason: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.suspend(id, g.actor, reason);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.suspend", "Contract", id, null, { reason });
  refresh(id);
  return { ok: true };
}

export async function reactivateContract(id: string, note: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.reactivate(id, g.actor, note);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.reactivate", "Contract", id, null, { note });
  refresh(id);
  return { ok: true };
}

export async function addContractNote(id: string, note: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await svc.addNote(id, g.actor, note);
  if (!r.ok) return fail(r.error);
  refresh(id);
  return { ok: true };
}

// Builds the PDF again from the agreement's own frozen record (never from the live package).
export async function regenerateDocument(id: string, kind: "draft" | "final"): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const c = await prisma.contract.findUnique({ where: { id } });
  if (!c) return fail("Agreement not found.");
  if (kind === "final" && c.status !== "ACTIVE" && c.status !== "SUSPENDED") return fail("The final agreement exists only once the agreement is active.");
  const doc = await svc.generateDocument(id, kind, g.actor);
  if (!doc) return fail("The PDF could not be built. Try again in a moment.");
  refresh(id);
  return { ok: true };
}

// Sends the customer's email again (agreement link, payment link or the final agreement).
export async function resendMessage(id: string, kind: "agreement" | "payment" | "final"): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const c = await prisma.contract.findUnique({ where: { id } });
  if (!c) return fail("Agreement not found.");
  const map: Record<string, MessageKind> = { agreement: c.status === "DRAFT" ? "review" : "received", payment: "payment", final: "final" };
  if (kind === "payment" && c.status !== "AWAITING_PAYMENT") return fail("The payment link is available once the agreement is approved and until it is paid.");
  if (kind === "final" && c.status !== "ACTIVE") return fail("The final agreement is available once the agreement is active.");
  const snap = c.snapshot as unknown as { customer: { email: string; name: string } };
  if (!snap.customer.email) return fail("This customer has no email address.");
  const doc = kind === "final" ? await svc.documentBytes(c, "final", g.actor) : await svc.documentBytes(c, "draft", g.actor);
  try {
    await sendCustomerEmail(snap.customer.email, map[kind], { lang: c.lang as "en" | "ar", customerName: snap.customer.name, number: c.number, url: agreementUrl(c.accessToken) }, doc ? [{ filename: svc.pdfName(c, kind === "final" ? "final" : "draft"), content: doc }] : []);
  } catch (e) {
    return fail(e instanceof Error ? `The email could not be sent: ${e.message.slice(0, 120)}` : "The email could not be sent.");
  }
  await svc.log(prisma, id, "resent", g.actor, `${kind} email sent again to ${snap.customer.email}`, { kind });
  refresh(id);
  return { ok: true };
}

// ---- Terms & Conditions ----

export async function createTermsDraft(groupKey: string, clauses: Clause[], note: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const parsed = parseClauses(clauses);
  if (!parsed.length || parsed.length !== clauses.length) return fail("Every clause needs a key, a title and its text in both languages.");
  const row = await terms.createDraft(groupKey, parsed, note, { id: g.admin.id, name: g.admin.name });
  revalidatePath("/admin/contracts/terms");
  return { ok: true, id: row.id };
}

export async function saveTermsDraft(id: string, clauses: Clause[], note: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const parsed = parseClauses(clauses);
  if (!parsed.length || parsed.length !== clauses.length) return fail("Every clause needs a key, a title and its text in both languages.");
  const r = await terms.updateDraft(id, parsed, note);
  if (!r.ok) return fail(r.error);
  revalidatePath("/admin/contracts/terms");
  return { ok: true };
}

export async function publishTerms(id: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await terms.publish(id);
  if (!r.ok) return fail(r.error);
  await writeAudit(g.admin, "contract.terms.publish", "ContractTerms", id, null, null);
  revalidatePath("/admin/contracts/terms");
  return { ok: true };
}

export async function deleteTermsDraft(id: string): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const r = await terms.removeDraft(id);
  if (!r.ok) return fail(r.error);
  revalidatePath("/admin/contracts/terms");
  return { ok: true };
}

// ---- payment instructions ----

export async function saveContractSettings(input: { paymentInstructionsEn: string; paymentInstructionsAr: string; renewalWindowDays: number }): Promise<CResult> {
  const g = await guard();
  if ("error" in g) return fail(g.error);
  const days = Math.round(input.renewalWindowDays);
  if (!Number.isFinite(days) || days < 0 || days > 365) return fail("The renewal window must be between 0 and 365 days.");
  const data = { paymentInstructionsEn: input.paymentInstructionsEn.trim().slice(0, 2000), paymentInstructionsAr: input.paymentInstructionsAr.trim().slice(0, 2000), renewalWindowDays: days };
  await prisma.contractSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  revalidatePath("/admin/contracts/settings");
  return { ok: true };
}
