import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma, type Contract } from "@/generated/prisma";
import { phoneVariants } from "@/lib/authIdentity";
import { findOrCreateCustomer } from "@/lib/customerMatch";
import type { Lang } from "@/lib/maintenance/builder";
import { AGREEMENT_CHECKS, COMPANY } from "./clauses";
import { renderAddendumHtml, renderContractHtml, type ContractDocInput, type DocKind } from "./html";
import { htmlToPdf } from "./pdf";
import { agreementUrl, composeMessage, sendCustomerEmail, whatsappLink, type MessageKind } from "./notify";
import { applyAdjustments, type Adjustment, type ContractSnapshot } from "./snapshot";
import { activeTerms } from "./terms";
import { loadPublicPackages, loadServices, loadTax, toPkg } from "@/lib/maintenance/data";
import { defaultBuilder, priceRequest, type Breakdown } from "@/lib/maintenance/builder";
import { buildSnapshot } from "./snapshot";
import { ALTERNATIVE_ARRANGEMENT, REQUEST_STATUS_OF, allowedActions, displayStatus, expiryFrom, paymentProblem, type ContractAction, type ContractStatus } from "./workflow";

// The agreement's life in the ERP: created when the customer accepts and sends the request, then reviewed, approved, paid and
// activated by the admin. Every step is written to the audit trail. The agreement itself is never edited after the customer accepts
// it: a change is a new version (or an addendum) that the customer approves.

export type Actor = { type: "admin" | "customer" | "system"; id?: string; name: string };
type Db = Prisma.TransactionClient;
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const snapOf = (c: Contract) => c.snapshot as unknown as ContractSnapshot;
const r2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number | null | undefined) => `AED ${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n ?? 0) ? 0 : 2, maximumFractionDigits: 2 })}`;

export async function log(db: Db, contractId: string, kind: string, actor: Actor, note = "", data: Record<string, unknown> = {}) {
  await db.contractEvent.create({ data: { contractId, kind, actorType: actor.type, actorId: actor.id ?? null, actorName: actor.name, note: note.slice(0, 1000), data: data as never } });
}

// ---- numbers and links ----

const year = () => new Date().getUTCFullYear();
const token = () => randomBytes(24).toString("base64url");

async function nextNumber(db: Db, kind: "agreement" | "request" | "addendum"): Promise<string> {
  const prefix = `${kind === "agreement" ? "OSTA-AGR" : kind === "request" ? "OSTA-REQ" : "OSTA-ADD"}-${year()}-`;
  let last = "";
  if (kind === "agreement") last = (await db.contract.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } }))?.number ?? "";
  else if (kind === "request") last = (await db.contract.findFirst({ where: { requestNumber: { startsWith: prefix } }, orderBy: { requestNumber: "desc" }, select: { requestNumber: true } }))?.requestNumber ?? "";
  else last = (await db.contractAddendum.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } }))?.number ?? "";
  const seq = last ? parseInt(last.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(seq + 1).padStart(6, "0")}`;
}

// Two people submitting at the same moment can draw the same number; the unique index catches it and we simply draw again.
async function withNumbers<T>(make: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await make(); }
    catch (e) {
      const dup = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && /number/i.test(String(e.meta?.target ?? ""));
      if (!dup || i >= 5) throw e;
    }
  }
}

export async function findCustomerByContact(phone: string, email: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits) {
    const byPhone = await prisma.customer.findFirst({ where: { phone: { in: phoneVariants(digits) } } });
    if (byPhone) return byPhone;
  }
  return email ? prisma.customer.findUnique({ where: { email: email.toLowerCase() } }) : null;
}

// The ERP customer behind an agreement: an existing one with the same phone or email, otherwise a new one is created on approval.
async function ensureCustomer(c: Contract, admin: Actor) {
  if (c.customerId) return c.customerId;
  const s = snapOf(c);
  const existing = await findCustomerByContact(s.customer.phone, s.customer.email);
  if (existing) return existing.id;
  const created = await findOrCreateCustomer({ type: "INDIVIDUAL", name: s.customer.name, phone: s.customer.phone.trim(), whatsapp: s.customer.whatsapp || null, emirate: s.property.emirate, leadSource: "Website" }, admin.id ?? "");
  if (s.customer.email) await prisma.customer.update({ where: { id: created.id }, data: { email: s.customer.email.toLowerCase() } }).catch(() => undefined);
  return created.id;
}

async function syncRequest(db: Db, c: { subscriptionId: string | null }, status: ContractStatus, extra: Prisma.MaintenanceSubscriptionUpdateInput = {}) {
  if (!c.subscriptionId) return;
  const label = status === "CANCELLED" ? "Cancelled" : REQUEST_STATUS_OF[status];
  await db.maintenanceSubscription.update({ where: { id: c.subscriptionId }, data: { status: label, ...extra } });
}

// ---- the PDF files ----

export const pdfName = (c: { number: string }, kind: DocKind | "addendum", suffix = "") => `OSTA-Maintenance-Service-Agreement-${c.number}-${kind === "final" ? "FINAL" : kind === "draft" ? "DRAFT" : "ADDENDUM"}${suffix}.pdf`;

export function docInputOf(c: Contract, kind: DocKind): ContractDocInput {
  return {
    snapshot: snapOf(c), lang: c.lang as Lang, kind, number: c.number, requestNumber: c.requestNumber, version: c.version, createdAt: c.createdAt,
    acceptedAt: c.acceptedAt, acceptanceMethod: c.acceptanceMethod, paymentStatus: (c.paymentStatus as ContractDocInput["paymentStatus"]) ?? "unpaid",
    paymentMethod: c.paymentMethod, paymentReference: c.paymentReference, paidAt: c.paidAt, activationDate: c.activationDate, expiryDate: c.expiryDate, approvedAt: c.approvedAt,
  };
}

async function storePdf(db: Db, contractId: string, kind: string, lang: string, pdf: Buffer, addendumId?: string) {
  return db.contractDocument.create({
    data: { contractId, kind, lang, addendumId: addendumId ?? null, bytes: new Uint8Array(pdf), size: pdf.length, sha256: createHash("sha256").update(pdf).digest("hex") },
  });
}

// Builds and keeps a PDF from the agreement as it stands now. Failing to build one never blocks the workflow: it is logged and can be
// built again from the agreement's own frozen record.
export async function generateDocument(contractId: string, kind: DocKind, actor: Actor): Promise<{ id: string; bytes: Buffer } | null> {
  const c = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!c) return null;
  try {
    const pdf = await htmlToPdf(renderContractHtml(docInputOf(c, kind)));
    const row = await storePdf(prisma, c.id, kind, c.lang, pdf);
    await log(prisma, c.id, kind === "final" ? "final_pdf" : "draft_pdf", actor, "", { documentId: row.id, version: c.version, size: pdf.length });
    return { id: row.id, bytes: pdf };
  } catch (e) {
    console.error("[contracts] PDF failed:", e instanceof Error ? e.message : "unknown");
    await log(prisma, c.id, "pdf_failed", actor, e instanceof Error ? e.message.slice(0, 300) : "PDF failed", { kind }).catch(() => undefined);
    return null;
  }
}

export async function latestDocument(contractId: string, kind: string, addendumId?: string) {
  return prisma.contractDocument.findFirst({ where: { contractId, kind, ...(addendumId ? { addendumId } : {}) }, orderBy: { createdAt: "desc" } });
}

// The file to hand out for a kind: the stored one, or one built now from the agreement's record if none exists yet.
export async function documentBytes(c: Contract, kind: DocKind, actor: Actor): Promise<Buffer | null> {
  const stored = await latestDocument(c.id, kind);
  if (stored) return Buffer.from(stored.bytes);
  return (await generateDocument(c.id, kind, actor))?.bytes ?? null;
}

// ---- 1. the customer sends the request (agreement accepted) ----

export type SubmissionInput = {
  subscriptionId: string;
  lang: Lang;
  groupKey: string;
  snapshot: ContractSnapshot;
  method: string;
  ip: string;
  agent: string;
};

export async function createFromSubmission(a: SubmissionInput) {
  const customer = await findCustomerByContact(a.snapshot.customer.phone, a.snapshot.customer.email);
  const contract = await withNumbers(() =>
    prisma.$transaction(async (tx) => {
      const [number, requestNumber] = [await nextNumber(tx, "agreement"), await nextNumber(tx, "request")];
      const created = await tx.contract.create({
        data: {
          number, requestNumber, status: "PENDING_APPROVAL", lang: a.lang, groupKey: a.groupKey, subscriptionId: a.subscriptionId, customerId: customer?.id ?? null,
          snapshot: a.snapshot as never, termsId: a.snapshot.terms.id, termsVersion: a.snapshot.terms.version, acceptedAt: new Date(), acceptanceMethod: a.method,
          acceptanceIp: a.ip.slice(0, 64), acceptanceAgent: a.agent.slice(0, 300), accessToken: token(),
        },
      });
      const who: Actor = { type: "customer", name: a.snapshot.customer.name };
      await log(tx, created.id, "submitted", who, `Request ${requestNumber} submitted for ${a.snapshot.package.nameEn}`, { total: a.snapshot.pricing.total });
      await log(tx, created.id, "accepted", who, "The customer accepted the agreement and the terms before sending the request", { method: a.method, termsVersion: a.snapshot.terms.version, statements: AGREEMENT_CHECKS.length });
      return created;
    }),
  );
  return contract;
}

// The draft PDF and the email that follow a submission. Neither can fail the customer's request.
export async function afterSubmission(contractId: string) {
  const c = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!c) return { documentId: null as string | null };
  const doc = await generateDocument(c.id, "draft", { type: "system", name: "System" });
  const s = snapOf(c);
  if (s.customer.email) {
    try {
      await sendCustomerEmail(s.customer.email, "received", { lang: c.lang as Lang, customerName: s.customer.name, number: c.number, url: agreementUrl(c.accessToken), packageName: c.lang === "ar" ? s.package.nameAr : s.package.nameEn }, doc ? [{ filename: pdfName(c, "draft"), content: doc.bytes }] : []);
      await log(prisma, c.id, "email_sent", { type: "system", name: "System" }, `Draft agreement emailed to ${s.customer.email}`);
    } catch (e) {
      await log(prisma, c.id, "email_failed", { type: "system", name: "System" }, e instanceof Error ? e.message.slice(0, 200) : "Email failed").catch(() => undefined);
    }
  }
  return { documentId: doc?.id ?? null };
}

// ---- 1b. an existing request (made before agreements, or on the simple form) gets its agreement and PDF ----

export async function createFromRequest(subscriptionId: string, admin: Actor): Promise<Result<{ id: string; number: string; created: boolean }>> {
  const sub = await prisma.maintenanceSubscription.findUnique({ where: { id: subscriptionId }, include: { contract: { select: { id: true, number: true } } } });
  if (!sub) return fail("Request not found.");
  if (sub.contract) return { ok: true, id: sub.contract.id, number: sub.contract.number, created: false };
  if (!sub.packageId) return fail("The package of this request no longer exists, so its agreement cannot be built.");
  const row = await prisma.maintenancePackage.findUnique({ where: { id: sub.packageId } });
  if (!row) return fail("The package of this request no longer exists, so its agreement cannot be built.");
  const group = sub.groupKey ? await prisma.maintenanceGroup.findUnique({ where: { key: sub.groupKey }, select: { id: true } }) : null;
  const [services, tax, pub, terms] = await Promise.all([loadServices(group?.id ?? null), loadTax(), loadPublicPackages(sub.groupKey), activeTerms(sub.groupKey)]);
  const pkg = toPkg(row);

  // The price: what the Smart builder worked out and stored, or for a simple request the package's own price (VAT per the settings).
  const stored = (sub.details as { lines?: { label?: string; qty?: number; unitPrice?: number | null; amount?: number | null; note?: Breakdown["lines"][number]["note"] }[]; vatPercent?: number; pricesIncludeVat?: boolean; quoteReasons?: string[] } | null) ?? {};
  const breakdown: Breakdown = Array.isArray(stored.lines) && stored.lines.length > 0 && sub.subtotal != null
    ? {
        packageId: pkg.id, quote: sub.quoteRequested, quoteReasons: stored.quoteReasons ?? [], subtotal: sub.subtotal, vat: sub.vatAmount ?? 0, total: sub.total ?? sub.subtotal,
        vatPercent: stored.vatPercent ?? tax.vatRatePercent, pricesIncludeVat: stored.pricesIncludeVat ?? tax.pricesIncludeVat,
        lines: stored.lines.map((l, i) => ({ key: i === 0 ? "base" : `line${i}`, labelEn: l.label ?? "", labelAr: l.label ?? "", qty: l.qty ?? 1, unitPrice: l.unitPrice ?? null, amount: l.amount ?? null, note: l.note ?? "extra" })),
      }
    : priceRequest(pkg, services, [], defaultBuilder(), tax, { acUnits: 0, handymanHours: 0, optionIds: [], extras: {} });

  const lang: Lang = /[\u0600-\u06FF]/.test(`${sub.name} ${sub.location} ${sub.message}`) ? "ar" : "en";
  const snapshot = buildSnapshot({
    groupKey: sub.groupKey,
    customer: { name: sub.name, phone: sub.phone, whatsapp: sub.whatsapp, email: sub.email },
    property: { emirate: sub.emirate, area: sub.area, address: sub.address || sub.location, type: sub.propertyType, bedrooms: sub.bedrooms, bathrooms: sub.bathrooms, floors: sub.floors, size: sub.propertySize, acUnits: sub.acUnits, notes: [sub.company ? `Company: ${sub.company}` : "", sub.message].filter(Boolean).join(" · ") },
    pkg, services, breakdown, pageTerms: pub.terms, terms,
  });
  const customer = await findCustomerByContact(sub.phone, sub.email);
  const contract = await withNumbers(() =>
    prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, "agreement");
      const requestNumber = await nextNumber(tx, "request");
      const c = await tx.contract.create({ data: { number, requestNumber, status: "DRAFT", lang, groupKey: sub.groupKey, subscriptionId: sub.id, customerId: customer?.id ?? null, snapshot: snapshot as never, termsId: terms.id, termsVersion: terms.version, accessToken: token() } });
      await log(tx, c.id, "created", admin, `Agreement created from the customer's request (${sub.packageName}); waiting for the customer's acceptance`, { subscriptionId: sub.id });
      await syncRequest(tx, c, "DRAFT");
      return c;
    }),
  );
  const doc = await generateDocument(contract.id, "draft", admin);
  await emailCustomer(contract, "invite", admin, { attach: doc ? { filename: pdfName(contract, "draft"), content: doc.bytes } : undefined });
  return { ok: true, id: contract.id, number: contract.number, created: true };
}

// The customer agreed outside the website (a WhatsApp message, a signed paper, a call). The admin records how, so the agreement can go on
// to approval; the PDF then says the acceptance was recorded by OSTA on the customer's behalf, never that the customer ticked the statements.
export async function recordAcceptance(id: string, admin: Actor, how: string): Promise<Result> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "recordAcceptance");
  if (blocked) return blocked;
  if (c.acceptedAt) return fail("The customer has already accepted this agreement.");
  if (how.trim().length < 8) return fail("Describe how and when the customer agreed (for example: WhatsApp message on 7 Nov, or signed copy received).");
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: c.id }, data: { status: "PENDING_APPROVAL", acceptedAt: new Date(), acceptanceMethod: `Recorded by ${admin.name}: ${how.trim()}`.slice(0, 400), acceptanceIp: "", acceptanceAgent: "" } });
    await log(tx, c.id, "accepted", admin, `Acceptance recorded by the admin on the customer's behalf: ${how.trim()}`, { method: "Recorded by admin", version: c.version, termsVersion: c.termsVersion });
    await syncRequest(tx, c, "PENDING_APPROVAL");
  });
  await generateDocument(c.id, "draft", admin);
  return { ok: true };
}

// ---- 2. the customer accepts a new or revised version (renewal, price change, quotation) ----

export async function acceptByLink(accessToken: string, ctx: { ip: string; agent: string }): Promise<Result<{ number: string }>> {
  const c = await prisma.contract.findUnique({ where: { accessToken } });
  if (!c) return fail("This link is not valid.");
  if (c.status !== "DRAFT" || c.acceptedAt) return fail("This agreement is not waiting for your acceptance.");
  const s = snapOf(c);
  const who: Actor = { type: "customer", name: s.customer.name };
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: c.id }, data: { status: "PENDING_APPROVAL", acceptedAt: new Date(), acceptanceMethod: "Agreement link", acceptanceIp: ctx.ip.slice(0, 64), acceptanceAgent: ctx.agent.slice(0, 300) } });
    await log(tx, c.id, "accepted", who, `The customer accepted agreement version ${c.version} and the terms`, { method: "Agreement link", version: c.version, termsVersion: c.termsVersion });
    await syncRequest(tx, c, "PENDING_APPROVAL");
  });
  await generateDocument(c.id, "draft", who);
  return { ok: true, number: c.number };
}

// ---- 3. the admin reviews ----

async function load(id: string) {
  return prisma.contract.findUnique({ where: { id } });
}
const notAllowed = (c: Contract, a: ContractAction) => (allowedActions(c).has(a) ? null : fail("This step is not available for the agreement in its current status."));

async function emailCustomer(c: Contract, kind: MessageKind, actor: Actor, opts: { note?: string; attach?: { filename: string; content: Buffer } } = {}) {
  const s = snapOf(c);
  if (!s.customer.email) return false;
  try {
    await sendCustomerEmail(s.customer.email, kind, { lang: c.lang as Lang, customerName: s.customer.name, number: c.number, url: agreementUrl(c.accessToken), note: opts.note, total: money(s.pricing.total), packageName: c.lang === "ar" ? s.package.nameAr : s.package.nameEn }, opts.attach ? [opts.attach] : []);
    await log(prisma, c.id, "email_sent", actor, `${kind} email sent to ${s.customer.email}`, { kind });
    return true;
  } catch (e) {
    await log(prisma, c.id, "email_failed", actor, e instanceof Error ? e.message.slice(0, 200) : "Email failed", { kind }).catch(() => undefined);
    return false;
  }
}

// The message and chat link the admin can send by WhatsApp for a given step.
export function messageFor(c: Contract, kind: MessageKind, note = "") {
  const s = snapOf(c);
  const m = composeMessage(kind, { lang: c.lang as Lang, customerName: s.customer.name, number: c.number, url: agreementUrl(c.accessToken), note, total: money(s.pricing.total), packageName: c.lang === "ar" ? s.package.nameAr : s.package.nameEn });
  return { text: m.whatsapp, link: whatsappLink(s.customer.whatsapp || s.customer.phone, m.whatsapp) };
}

export async function approve(id: string, admin: Actor): Promise<Result<{ paymentUrl: string; whatsapp: string | null }>> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "approve");
  if (blocked) return blocked;
  if (!c.acceptedAt) return fail("The customer has not accepted this agreement yet.");
  const s = snapOf(c);
  if (s.pricing.quote) return fail("Some items are still 'to be quoted'. Use Revise price to set them, so the customer approves the final price first.");
  if (!(s.pricing.total > 0)) return fail("The agreement total must be more than zero.");
  const customerId = await ensureCustomer(c, admin);
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: c.id }, data: { status: "AWAITING_PAYMENT", customerId, approvedAt: new Date(), approvedByName: admin.name, approvedTotal: s.pricing.total } });
    await log(tx, c.id, "approved", admin, `Approved at ${money(s.pricing.total)}; payment link issued`, { total: s.pricing.total, customerId });
    await syncRequest(tx, c, "AWAITING_PAYMENT");
  });
  const fresh = (await load(id))!;
  const doc = await documentBytes(fresh, "draft", admin);
  await emailCustomer(fresh, "payment", admin, { attach: doc ? { filename: pdfName(fresh, "draft"), content: doc } : undefined });
  return { ok: true, paymentUrl: agreementUrl(c.accessToken), whatsapp: messageFor(fresh, "payment").link };
}

export async function requestChanges(id: string, admin: Actor, message: string): Promise<Result> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "requestChanges");
  if (blocked) return blocked;
  if (message.trim().length < 5) return fail("Tell the customer what needs to change.");
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: c.id }, data: { status: "CHANGES_REQUESTED" } });
    await log(tx, c.id, "changes_requested", admin, message.trim());
    await syncRequest(tx, c, "CHANGES_REQUESTED");
  });
  await emailCustomer((await load(id))!, "changes", admin, { note: message.trim() });
  return { ok: true };
}

// A price change is never applied silently: it becomes a NEW version that the customer has to read and accept.
export async function revise(id: string, admin: Actor, input: { adjustments: Adjustment[]; packagePrice?: number | null; settleOpenItems: boolean; reason: string }): Promise<Result<{ version: number }>> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "revise");
  if (blocked) return blocked;
  if (input.reason.trim().length < 5) return fail("Write the reason for the change; the customer will see it.");
  const clean = input.adjustments.filter((a) => a.labelEn.trim() && Number.isFinite(a.amount) && a.amount !== 0).map((a) => ({ labelEn: a.labelEn.trim(), labelAr: a.labelAr.trim(), amount: r2(a.amount) }));
  if (!clean.length && input.packagePrice === undefined && !input.settleOpenItems) return fail("Add a price change first.");
  const next = applyAdjustments(snapOf(c), clean, { packagePrice: input.packagePrice, settleOpenItems: input.settleOpenItems });
  if (!(next.pricing.total >= 0)) return fail("The total cannot be negative.");
  const version = c.version + 1;
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({
      where: { id: c.id },
      data: { snapshot: next as never, version, status: "DRAFT", acceptedAt: null, acceptanceMethod: "", approvedAt: null, approvedByName: "", approvedTotal: null },
    });
    await log(tx, c.id, "revised", admin, input.reason.trim(), { fromVersion: c.version, version, before: snapOf(c).pricing.total, after: next.pricing.total });
    await syncRequest(tx, c, "DRAFT");
  });
  await generateDocument(c.id, "draft", admin);
  const fresh = (await load(id))!;
  const doc = await latestDocument(c.id, "draft");
  await emailCustomer(fresh, "review", admin, { note: input.reason.trim(), attach: doc ? { filename: pdfName(fresh, "draft"), content: Buffer.from(doc.bytes) } : undefined });
  return { ok: true, version };
}

export type DetailsInput = { customer: ContractSnapshot["customer"]; property: ContractSnapshot["property"] };

// Correcting the customer's or the property's details. While the customer has not accepted yet it simply updates the draft; once they have
// (or it is approved) it is a NEW version they must accept again, because the registered property is part of what they agreed to.
export async function editDetails(id: string, admin: Actor, input: DetailsInput, reason: string): Promise<Result<{ version: number }>> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "editDetails");
  if (blocked) return blocked;
  const { customer, property } = input;
  const digits = customer.phone.replace(/\D/g, "");
  if (customer.name.trim().length < 2) return fail("Enter the customer's name.");
  if (digits.length < 8 || digits.length > 15) return fail("Enter a valid mobile number.");
  if (customer.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) return fail("Enter a valid email address.");
  if (!property.emirate.trim()) return fail("Choose the emirate.");
  const open = c.status === "DRAFT";
  if (!open && reason.trim().length < 5) return fail("Write the reason for the change; the customer will see it.");
  const clean: DetailsInput = {
    customer: { name: customer.name.trim(), phone: customer.phone.trim(), whatsapp: customer.whatsapp.trim(), email: customer.email.trim().toLowerCase() },
    property: { emirate: property.emirate.trim(), area: property.area.trim(), address: property.address.trim(), type: property.type.trim(), bedrooms: Math.max(0, Math.floor(property.bedrooms) || 0), bathrooms: Math.max(0, Math.floor(property.bathrooms) || 0), floors: Math.max(0, Math.floor(property.floors) || 0), size: property.size && property.size > 0 ? property.size : null, acUnits: Math.max(0, Math.floor(property.acUnits) || 0), notes: property.notes.trim() },
  };
  const next: ContractSnapshot = { ...snapOf(c), ...clean };
  const version = open ? c.version : c.version + 1;
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: c.id }, data: open ? { snapshot: next as never } : { snapshot: next as never, version, status: "DRAFT", acceptedAt: null, acceptanceMethod: "", approvedAt: null, approvedByName: "", approvedTotal: null } });
    await log(tx, c.id, open ? "edited" : "revised", admin, open ? "Customer or property details corrected" : reason.trim(), { fromVersion: c.version, version, details: true });
    if (!open) await syncRequest(tx, c, "DRAFT");
  });
  await generateDocument(c.id, "draft", admin);
  if (!open) {
    const fresh = (await load(id))!;
    const doc = await latestDocument(c.id, "draft");
    await emailCustomer(fresh, "review", admin, { note: reason.trim(), attach: doc ? { filename: pdfName(fresh, "draft"), content: Buffer.from(doc.bytes) } : undefined });
  }
  return { ok: true, version };
}

export async function reject(id: string, admin: Actor, reason: string): Promise<Result> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "reject");
  if (blocked) return blocked;
  if (reason.trim().length < 5) return fail("Write the reason for rejecting; the customer will see it.");
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: c.id }, data: { status: "REJECTED", rejectionReason: reason.trim() } });
    await log(tx, c.id, "rejected", admin, reason.trim());
    await syncRequest(tx, c, "REJECTED");
  });
  await emailCustomer((await load(id))!, "rejected", admin, { note: reason.trim() });
  return { ok: true };
}

export async function cancel(id: string, admin: Actor, reason: string): Promise<Result> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "cancel");
  if (blocked) return blocked;
  if (reason.trim().length < 5) return fail("Write the reason for cancelling.");
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: c.id }, data: { status: "CANCELLED", rejectionReason: reason.trim() } });
    await log(tx, c.id, "cancelled", admin, reason.trim(), { wasPaid: c.paymentStatus === "paid", note: "Refunds, if any, follow the agreement's non-refundable clause and UAE law and are handled separately." });
    await syncRequest(tx, c, "CANCELLED");
  });
  return { ok: true };
}

// Putting an active agreement on hold (for example unpaid or disputed) and back. The expiry date does not move: time on hold is not added.
export async function suspend(id: string, admin: Actor, reason: string): Promise<Result> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "suspend");
  if (blocked) return blocked;
  if (reason.trim().length < 5) return fail("Write the reason for suspending (the customer will see it).");
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: c.id }, data: { status: "SUSPENDED" } });
    await log(tx, c.id, "suspended", admin, reason.trim());
    await syncRequest(tx, c, "SUSPENDED");
  });
  await emailCustomer((await load(id))!, "suspended", admin, { note: reason.trim() });
  return { ok: true };
}

export async function reactivate(id: string, admin: Actor, note: string): Promise<Result> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "reactivate");
  if (blocked) return blocked;
  await prisma.$transaction(async (tx) => {
    await tx.contract.update({ where: { id: c.id }, data: { status: "ACTIVE" } });
    await log(tx, c.id, "reactivated", admin, note.trim());
    await syncRequest(tx, c, "ACTIVE");
  });
  await emailCustomer((await load(id))!, "reactivated", admin, { note: note.trim() });
  return { ok: true };
}

export async function addNote(id: string, admin: Actor, note: string): Promise<Result> {
  const text = note.trim();
  if (text.length < 2) return fail("Write a note first.");
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  await prisma.contract.update({ where: { id }, data: { adminNotes: `${c.adminNotes ? `${c.adminNotes}\n\n` : ""}[${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${admin.name}] ${text}`.slice(-8000) } });
  await log(prisma, id, "note", admin, text);
  return { ok: true };
}

// ---- 4. payment, the ERP invoice, activation ----

export type PaymentInput = { method: string; reference: string; note: string; paidAt: Date };

async function createInvoice(tx: Db, c: Contract, admin: Actor, customerId: string, p: PaymentInput, paid: boolean) {
  const s = snapOf(c);
  const pr = s.pricing;
  const items: { serviceName: string; description: string | null; qty: number; unitPrice: number }[] = [];
  if (pr.packagePrice) items.push({ serviceName: `${s.package.nameEn} – Annual Maintenance Agreement`, description: `Agreement ${c.number}`, qty: 1, unitPrice: pr.packagePrice });
  for (const e of s.extras) if (!e.included && e.amount != null && e.amount > 0) items.push({ serviceName: e.labelEn, description: `Agreement ${c.number}`, qty: 1, unitPrice: e.amount });
  if (pr.discount > 0) items.push({ serviceName: "Discount", description: `Agreement ${c.number}`, qty: 1, unitPrice: -pr.discount });
  if (!pr.pricesIncludeVat && pr.vat > 0) items.push({ serviceName: `VAT (${pr.vatPercent}%)`, description: `Agreement ${c.number}`, qty: 1, unitPrice: pr.vat });
  const date = new Date(Date.UTC(p.paidAt.getUTCFullYear(), p.paidAt.getUTCMonth(), p.paidAt.getUTCDate(), 12));
  const prefix = `INV-${date.getUTCFullYear()}-`;
  const last = await tx.invoice.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" } });
  const number = `${prefix}${String((last ? parseInt(last.number.slice(prefix.length), 10) : 0) + 1).padStart(6, "0")}`;
  const invoice = await tx.invoice.create({
    data: {
      number, date, customerId, serviceType: "Annual Maintenance Agreement", category: "AMC", payment: p.method, amount: pr.total,
      status: paid ? "Paid" : "Unpaid", paidAmount: paid ? pr.total : 0, paymentDate: paid ? p.paidAt : null, paymentLink: agreementUrl(c.accessToken),
      leadSource: "Website", createdById: admin.id ?? "", items: { create: items },
    },
  });
  await tx.invoicePayment.create({
    data: { invoiceId: invoice.id, kind: "Invoice Created", previousStatus: "—", newStatus: invoice.status, amount: invoice.paidAmount, paidAfter: invoice.paidAmount, method: p.method, paymentDate: invoice.paymentDate, note: `Agreement ${c.number}${p.reference ? ` · ref ${p.reference}` : ""}`, changedById: admin.id ?? "" },
  });
  return invoice;
}

// The single door through which an agreement becomes active. The admin's "Record payment" uses it, and so will a payment gateway's
// webhook once one is connected (after verifying the gateway's signature).
export async function confirmPayment(id: string, actor: Actor, input: PaymentInput): Promise<Result<{ number: string }>> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "recordPayment");
  if (blocked) return blocked;
  const problem = paymentProblem(input);
  if (problem) return fail(problem);
  if (c.paymentStatus === "paid") return fail("This agreement is already paid.");
  const s = snapOf(c);
  const arrangement = input.method === ALTERNATIVE_ARRANGEMENT;
  const customerId = await ensureCustomer(c, actor);
  // The term starts on the date the customer asked for, or today if that has passed.
  const sub = c.subscriptionId ? await prisma.maintenanceSubscription.findUnique({ where: { id: c.subscriptionId }, select: { activationDate: true } }) : null;
  const now = new Date();
  const activation = sub?.activationDate && sub.activationDate.getTime() > now.getTime() ? sub.activationDate : now;
  const expiry = expiryFrom(activation, s.package.durationMonths || COMPANY.durationMonths);
  await prisma.$transaction(async (tx) => {
    const invoice = c.invoiceId ? null : s.pricing.total > 0 ? await createInvoice(tx, c, actor, customerId, input, !arrangement) : null;
    await tx.contract.update({
      where: { id: c.id },
      data: {
        status: "ACTIVE", customerId, invoiceId: invoice?.id ?? c.invoiceId, paymentStatus: arrangement ? "arrangement" : "paid", paidAt: arrangement ? null : input.paidAt,
        paymentMethod: input.method, paymentReference: input.reference.trim(), paymentNote: input.note.trim(), activationDate: activation, expiryDate: expiry,
      },
    });
    await log(tx, c.id, "payment_recorded", actor, `${input.method}${input.reference ? ` · ${input.reference}` : ""}${input.note ? ` · ${input.note}` : ""}`, { method: input.method, reference: input.reference, amount: s.pricing.total, invoiceNumber: invoice?.number ?? null, arrangement });
    await log(tx, c.id, "activated", actor, `Agreement active from ${activation.toISOString().slice(0, 10)} to ${expiry.toISOString().slice(0, 10)}`, { activation, expiry });
    await syncRequest(tx, c, "ACTIVE", { activationDate: activation });
  });
  const fresh = (await load(id))!;
  const doc = await generateDocument(c.id, "final", actor);
  await emailCustomer(fresh, "final", actor, { attach: doc ? { filename: pdfName(fresh, "final"), content: doc.bytes } : undefined });
  return { ok: true, number: c.number };
}

// ---- 5. renewal and addenda ----

export async function renew(id: string, admin: Actor): Promise<Result<{ id: string; number: string }>> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "renew");
  if (blocked) return blocked;
  const terms = await activeTerms(c.groupKey);
  const s = { ...snapOf(c), terms: { id: terms.id, version: terms.version, clauses: terms.clauses } };
  const created = await withNumbers(() =>
    prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, "agreement");
      const requestNumber = await nextNumber(tx, "request");
      const n = await tx.contract.create({
        data: { number, requestNumber, status: "DRAFT", lang: c.lang, groupKey: c.groupKey, customerId: c.customerId, renewedFromId: c.id, snapshot: s as never, termsId: terms.id, termsVersion: terms.version, accessToken: token() },
      });
      await log(tx, n.id, "created", admin, `Renewal of ${c.number}`, { renewedFrom: c.number });
      await log(tx, c.id, "renewed", admin, `Renewal agreement ${number} created`, { renewal: number });
      return n;
    }),
  );
  await generateDocument(created.id, "draft", admin);
  await emailCustomer(created, "renewal", admin);
  return { ok: true, id: created.id, number: created.number };
}

export type AddendumInput = { titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; amountChange: number };

export async function issueAddendum(id: string, admin: Actor, input: AddendumInput): Promise<Result<{ number: string }>> {
  const c = await load(id);
  if (!c) return fail("Agreement not found.");
  const blocked = notAllowed(c, "addendum");
  if (blocked) return blocked;
  if (input.titleEn.trim().length < 3 || (input.bodyEn.trim().length < 10 && input.bodyAr.trim().length < 10)) return fail("Add a title and describe the change.");
  if (!Number.isFinite(input.amountChange) || Math.abs(input.amountChange) > 1_000_000) return fail("The price change is not valid.");
  const s = snapOf(c);
  const row = await withNumbers(() =>
    prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, "addendum");
      const a = await tx.contractAddendum.create({ data: { contractId: c.id, number, titleEn: input.titleEn.trim(), titleAr: input.titleAr.trim(), bodyEn: input.bodyEn.trim(), bodyAr: input.bodyAr.trim(), amountChange: r2(input.amountChange), issuedByName: admin.name } });
      await log(tx, c.id, "addendum_issued", admin, `${number}: ${input.titleEn.trim()}`, { number, amountChange: r2(input.amountChange) });
      return a;
    }),
  );
  try {
    const pdf = await htmlToPdf(renderAddendumHtml({ contractNumber: c.number, number: row.number, lang: c.lang as Lang, issuedAt: row.createdAt, titleEn: row.titleEn, titleAr: row.titleAr, bodyEn: row.bodyEn, bodyAr: row.bodyAr, amountChange: row.amountChange, customerName: s.customer.name, propertyAddress: [s.property.area, s.property.address].filter(Boolean).join(", "), currency: s.pricing.currency, acceptedAt: null }));
    await storePdf(prisma, c.id, "addendum", c.lang, pdf, row.id);
    await emailCustomer(c, "addendum", admin, { note: row.titleEn, attach: { filename: `OSTA-Contract-Addendum-${row.number}.pdf`, content: pdf } });
  } catch (e) {
    await log(prisma, c.id, "pdf_failed", admin, e instanceof Error ? e.message.slice(0, 200) : "PDF failed", { addendum: row.number }).catch(() => undefined);
  }
  return { ok: true, number: row.number };
}

export async function recordAddendumApproval(addendumId: string, admin: Actor, note: string): Promise<Result> {
  const a = await prisma.contractAddendum.findUnique({ where: { id: addendumId } });
  if (!a) return fail("Addendum not found.");
  if (a.status !== "issued") return fail("This addendum is not waiting for approval.");
  if (note.trim().length < 3) return fail("Say how the customer approved it (for example WhatsApp or email, and when).");
  await prisma.$transaction(async (tx) => {
    await tx.contractAddendum.update({ where: { id: a.id }, data: { status: "accepted", acceptedAt: new Date(), acceptedNote: note.trim() } });
    await log(tx, a.contractId, "addendum_accepted", admin, `${a.number}: ${note.trim()}`, { number: a.number });
  });
  return { ok: true };
}

// ---- reading ----

export const CONTRACT_INCLUDE = { events: { orderBy: { createdAt: "desc" as const } }, addenda: { orderBy: { createdAt: "desc" as const } }, documents: { select: { id: true, kind: true, lang: true, size: true, createdAt: true, addendumId: true }, orderBy: { createdAt: "desc" as const } } };

// What the customer's own link shows (no internal notes, no other customers' data).
export async function publicView(accessToken: string) {
  const c = await prisma.contract.findUnique({ where: { accessToken }, include: { events: { where: { kind: { in: ["changes_requested", "revised", "rejected", "suspended"] } }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!c) return null;
  const s = snapOf(c);
  const settings = await prisma.contractSettings.findUnique({ where: { id: "default" } });
  const status = displayStatus(c);
  return {
    number: c.number, requestNumber: c.requestNumber, version: c.version, lang: c.lang as Lang, status, createdAt: c.createdAt,
    needsAcceptance: c.status === "DRAFT" && !c.acceptedAt, acceptedAt: c.acceptedAt, paid: c.paymentStatus === "paid", awaitingPayment: c.status === "AWAITING_PAYMENT",
    customerName: s.customer.name, packageEn: s.package.nameEn, packageAr: s.package.nameAr,
    property: { emirate: s.property.emirate, area: s.property.area, address: s.property.address, type: s.property.type },
    pricing: s.pricing, lines: s.package.lines.map((l) => ({ serviceEn: l.serviceEn, serviceAr: l.serviceAr, quantityEn: l.quantityEn, quantityAr: l.quantityAr })),
    extras: s.extras, termsVersion: c.termsVersion, note: c.events[0]?.note ?? "", rejectionReason: c.status === "REJECTED" ? c.rejectionReason : "",
    paymentInstructions: c.status === "AWAITING_PAYMENT" ? { en: settings?.paymentInstructionsEn ?? "", ar: settings?.paymentInstructionsAr ?? "" } : null,
    activationDate: c.activationDate, expiryDate: c.expiryDate, checks: AGREEMENT_CHECKS, clauses: s.terms.clauses,
  };
}

// A customer's own agreements (shown in their account).
export async function listForCustomer(customerId: string) {
  const rows = await prisma.contract.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 100 });
  return rows.map((c) => {
    const s = snapOf(c);
    return { id: c.id, number: c.number, status: displayStatus(c), packageEn: s.package.nameEn, packageAr: s.package.nameAr, total: s.pricing.total, currency: s.pricing.currency, createdAt: c.createdAt, activationDate: c.activationDate, expiryDate: c.expiryDate, paid: c.paymentStatus === "paid", accessToken: c.status === "DRAFT" || c.status === "AWAITING_PAYMENT" ? c.accessToken : null };
  });
}
