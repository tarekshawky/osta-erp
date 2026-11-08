import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { SelfQuote } from "@/generated/prisma";
import { findOrCreateCustomer } from "@/lib/customerMatch";
import { generateOrderNumber } from "@/lib/orderData";
import { findCustomerByContact } from "@/lib/contracts/service";
import { htmlToPdf } from "@/lib/contracts/pdf";
import { ConfigSchema, DEFAULT_CONFIG, parseConfig, type AcConfig } from "./config";
import { InputSchema, buildLines, linesFromEdit, type QuoteInput } from "./engine";
import { renderQuoteHtml } from "./html";
import { notifyAdminOfQuote, quoteUrl, quoteWhatsAppLink, sendCustomerQuoteEmail, type QuoteMessageKind } from "./notify";
import { buildSnapshot, withLines, type QuoteCustomer, type QuoteProject, type QuoteSnapshot } from "./snapshot";
import { addDays, byToken, fail, log, money, nextNumber, token, withNumber, type Actor, type Result } from "./common";
import { adminCanRevise, adminNextFor, canConvert, customerCanEdit, customerCanSubmit, displayStatus, type QuoteStatus } from "./status";
import { linesFromEdit as ductLinesFromEdit } from "@/lib/ductwork/engine";
import { withLines as ductWithLines, type DuctSnapshot } from "@/lib/ductwork/snapshot";
import { ductPdfName, ductQuotePdf, ductQuoteUrl, loadConfig as loadDuctConfig } from "@/lib/ductwork/service";
import type { PdfLang } from "@/lib/ductwork/html";

// A quotation's life: built by the customer on the website (the server works the prices out again), kept in versions, reviewed and revised
// by the team, and, once approved, turned into a service order. Everything is written to an audit trail.

export { log, fail, type Result, type Actor } from "./common";

// ---- the price list ----

export async function loadConfig(): Promise<AcConfig> {
  const row = await prisma.acQuoteSettings.findUnique({ where: { id: "default" } }).catch(() => null);
  return row ? parseConfig(row.config) : DEFAULT_CONFIG;
}

export async function saveConfig(raw: unknown, adminName: string): Promise<Result> {
  const r = ConfigSchema.safeParse(raw);
  if (!r.success) return fail(`The settings are not valid: ${r.error.issues[0]?.path.join(".") ?? ""} ${r.error.issues[0]?.message ?? ""}`.trim());
  const keys = r.data.capacities.map((c) => c.key);
  if (new Set(keys).size !== keys.length) return fail("Two capacities share the same key.");
  if (new Set(r.data.services.map((s) => s.key)).size !== r.data.services.length) return fail("Two services share the same key.");
  if (new Set(r.data.acTypes.map((t) => t.key)).size !== r.data.acTypes.length) return fail("Two AC types share the same key.");
  await prisma.acQuoteSettings.upsert({ where: { id: "default" }, create: { id: "default", config: r.data as never, updatedByName: adminName }, update: { config: r.data as never, updatedByName: adminName } });
  return { ok: true };
}

// ---- what the customer sends ----

const digits = (v: string) => v.replace(/\D/g, "");
export const CustomerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).refine((v) => digits(v).length >= 8 && digits(v).length <= 15),
  whatsapp: z.string().trim().max(30).default("").refine((v) => v === "" || (digits(v).length >= 8 && digits(v).length <= 15)),
  email: z.string().trim().toLowerCase().max(120).default("").refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)),
  contactMethod: z.enum(["phone", "whatsapp", "email"]).default("phone"),
  preferredDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(""),
});
const yns = z.enum(["yes", "no", "not-sure"]);
export const ProjectSchema = z.object({
  propertyType: z.string().trim().min(1).max(30), emirate: z.string().trim().min(1).max(40), location: z.string().trim().min(2).max(300),
  floors: z.number().int().min(0).max(200).default(0), existingDuct: yns.default("not-sure"), existingCopper: yns.default("not-sure"),
  ceilingType: z.enum(["false", "exposed", "other"]).default("false"), notes: z.string().trim().max(2000).default(""),
});
export const QuoteBody = z.object({ lang: z.enum(["en", "ar"]).default("en"), input: InputSchema, customer: CustomerSchema, project: ProjectSchema, uploadKey: z.string().regex(/^[a-f0-9]{16,64}$/).optional() });
export type QuoteBody = z.infer<typeof QuoteBody>;

function checkProject(cfg: AcConfig, p: z.infer<typeof ProjectSchema>): string | null {
  if (!cfg.propertyTypes.some((t) => t.key === p.propertyType)) return "Choose the property type.";
  if (!cfg.emirates.some((e) => e.key === p.emirate)) return "Choose the emirate.";
  return null;
}

type Prepared = { input: QuoteInput; customer: QuoteCustomer; project: QuoteProject; snapshot: QuoteSnapshot };
function prepare(cfg: AcConfig, body: QuoteBody): Result<{ p: Prepared }> {
  const problem = checkProject(cfg, body.project);
  if (problem) return fail(problem);
  const built = buildLines(cfg, body.input);
  if (!built.ok) return fail(built.error);
  const when = body.customer.preferredDate ? new Date(`${body.customer.preferredDate}T12:00:00+04:00`) : null;
  if (when && when.getTime() < Date.now() - 864e5) return fail("The preferred installation date cannot be in the past.");
  const { preferredDate: _d, ...c } = body.customer; void _d;
  return { ok: true, p: { input: body.input, customer: { ...c, preferredDate: when }, project: body.project, snapshot: buildSnapshot(cfg, { lang: body.lang, input: body.input, lines: built.lines, manual: false }) } };
}

const rowData = (p: Prepared, expiresAt: Date) => ({
  customerName: p.customer.name, phone: p.customer.phone, whatsapp: p.customer.whatsapp, email: p.customer.email, contactMethod: p.customer.contactMethod, preferredDate: p.customer.preferredDate,
  emirate: p.project.emirate, location: p.project.location, propertyType: p.project.propertyType, project: p.project as never,
  snapshot: p.snapshot as never, subtotal: p.snapshot.totals.subtotal, vatAmount: p.snapshot.totals.vat, total: p.snapshot.totals.total, rfq: p.snapshot.totals.rfq, expiresAt,
});

export async function createQuote(raw: unknown, ctx: { ip: string }): Promise<Result<{ quote: SelfQuote }>> {
  const body = QuoteBody.safeParse(raw);
  if (!body.success) return fail("Please check the details: some are missing or not valid.");
  const cfg = await loadConfig();
  const r = prepare(cfg, body.data);
  if (!r.ok) return r;
  const who: Actor = { type: "customer", name: body.data.customer.name };
  const found = await findCustomerByContact(body.data.customer.phone, body.data.customer.email).catch(() => null);
  const quote = await withNumber(() =>
    prisma.$transaction(async (tx) => {
      const q = await tx.selfQuote.create({
        data: { number: await nextNumber(tx, "DQ"), status: "Generated", lang: body.data.lang, accessToken: token(), customerId: found?.id ?? null, lastEditedBy: "customer", ...rowData(r.p, addDays(new Date(), cfg.validityDays)) },
      });
      await tx.selfQuoteVersion.create({ data: { quoteId: q.id, version: 1, snapshot: r.p.snapshot as never, total: q.total, reason: "Created by the customer", byType: "customer", byName: who.name } });
      await log(tx, q.id, "created", who, `Quotation ${q.number} created: ${money(q.total)} incl. VAT${q.rfq ? " + items to be quoted" : ""}`, { total: q.total, ip: ctx.ip.slice(0, 64) });
      if (body.data.uploadKey) {
        const n = await tx.selfQuoteFile.updateMany({ where: { uploadKey: body.data.uploadKey, quoteId: null }, data: { quoteId: q.id } });
        if (n.count) await log(tx, q.id, "files", who, `${n.count} file(s) attached`);
      }
      return q;
    }),
  );
  return { ok: true, quote };
}

// The PDF and the emails that follow creating a quotation. Neither can fail the customer's request.
export async function afterCreate(quoteId: string) {
  const q = await prisma.selfQuote.findUnique({ where: { id: quoteId } });
  if (!q || !q.email) return;
  try {
    const pdf = await quotePdf(q);
    await sendCustomerQuoteEmail(q.email, "generated", { lang: q.lang as "en" | "ar", name: q.customerName, number: q.number, url: quoteUrl(q.accessToken), total: money(q.total) }, [{ filename: pdfName(q), content: pdf }]);
    await log(prisma, q.id, "email_sent", { type: "system", name: "System" }, `Quotation emailed to ${q.email}`);
  } catch (e) {
    await log(prisma, q.id, "email_failed", { type: "system", name: "System" }, e instanceof Error ? e.message.slice(0, 200) : "Email failed").catch(() => undefined);
  }
}

// ---- the PDF ----

export const pdfName = (q: { number: string; version?: number; kind?: string }, lang?: PdfLang) =>
  q.kind === "ductwork" ? ductPdfName(q, lang ?? "en") : `OSTA-Quotation-${q.number}${q.version && q.version > 1 ? `-v${q.version}` : ""}.pdf`;

// Either calculator's quotation as a PDF (the ductwork one can also be bilingual; an AC one follows its own language).
export async function quotePdf(q: SelfQuote, lang?: PdfLang): Promise<Buffer> {
  if (q.kind === "ductwork") return ductQuotePdf(q, lang ?? (q.lang === "ar" ? "ar" : "en"));
  const cfg = await loadConfig();
  const snap = q.snapshot as unknown as QuoteSnapshot;
  const proj = q.project as unknown as QuoteProject;
  const lab = (list: { key: string; en: string; ar: string }[], key: string) => list.find((x) => x.key === key) ?? { key, en: key, ar: key };
  const t = lab(cfg.propertyTypes, q.propertyType), e = lab(cfg.emirates, q.emirate);
  return htmlToPdf(renderQuoteHtml({
    snapshot: snap, lang: lang === "en" || lang === "ar" ? lang : (q.lang as "en" | "ar"), number: q.number, version: q.version, createdAt: q.createdAt, expiresAt: q.expiresAt,
    customer: { name: q.customerName, phone: q.phone, whatsapp: q.whatsapp, email: q.email, contactMethod: q.contactMethod, preferredDate: q.preferredDate },
    project: { ...proj, propertyType: q.propertyType, emirate: q.emirate, location: q.location },
    propertyTypeLabel: { en: t.en, ar: t.ar }, emirateLabel: { en: e.en, ar: e.ar },
  }));
}

// ---- the customer's own link ----

export async function publicView(accessToken: string) {
  const q = await byToken(accessToken);
  if (!q || q.kind === "ductwork") return null;
  const status = displayStatus(q);
  const snap = q.snapshot as unknown as QuoteSnapshot;
  const files = await prisma.selfQuoteFile.findMany({ where: { quoteId: q.id }, select: { id: true, name: true, size: true } });
  return {
    number: q.number, version: q.version, status, lang: q.lang, createdAt: q.createdAt, expiresAt: q.expiresAt, bookRequested: q.bookRequested,
    customer: { name: q.customerName, phone: q.phone, whatsapp: q.whatsapp, email: q.email, contactMethod: q.contactMethod, preferredDate: q.preferredDate?.toISOString().slice(0, 10) ?? "" },
    project: { ...(q.project as object), propertyType: q.propertyType, emirate: q.emirate, location: q.location },
    input: snap.input, manual: snap.manual, lines: snap.lines, totals: snap.totals, packages: snap.packages, disclaimer: snap.disclaimer, exclusions: snap.exclusions, validityDays: snap.validityDays,
    canEdit: customerCanEdit(status, snap.manual), canSubmit: customerCanSubmit(status), canBook: customerCanSubmit(status) || (status === "Submitted" && !q.bookRequested), files, rejectionReason: q.status === "Rejected" ? q.rejectionReason : "",
  };
}

export async function editByCustomer(accessToken: string, raw: unknown, ctx: { ip: string }): Promise<Result<{ number: string; version: number }>> {
  const q = await byToken(accessToken);
  if (!q || q.kind === "ductwork") return fail("This link is not valid.");
  const snap0 = q.snapshot as unknown as QuoteSnapshot;
  const status = displayStatus(q);
  if (!customerCanEdit(status, snap0.manual)) return fail(snap0.manual ? "Our team has revised this quotation. Please contact us to change it." : "This quotation can no longer be changed. Please contact us.");
  const body = QuoteBody.safeParse(raw);
  if (!body.success) return fail("Please check the details: some are missing or not valid.");
  const cfg = await loadConfig();
  const r = prepare(cfg, body.data);
  if (!r.ok) return r;
  const version = q.version + 1;
  const who: Actor = { type: "customer", name: body.data.customer.name };
  // Once the team has the quotation, a customer's change keeps it in their queue; otherwise it goes back to "Generated".
  const status2: QuoteStatus = q.status === "Submitted" ? "Submitted" : "Generated";
  await prisma.$transaction(async (tx) => {
    await tx.selfQuote.update({ where: { id: q.id }, data: { ...rowData(r.p, addDays(new Date(), cfg.validityDays)), version, status: status2, lang: body.data.lang, lastEditedBy: "customer", sentAt: null } });
    await tx.selfQuoteVersion.create({ data: { quoteId: q.id, version, snapshot: r.p.snapshot as never, total: r.p.snapshot.totals.total, reason: "Changed by the customer", byType: "customer", byName: who.name } });
    await log(tx, q.id, "edited", who, `The customer changed the quotation (version ${version}): ${money(r.p.snapshot.totals.total)} incl. VAT`, { fromVersion: q.version, version, ip: ctx.ip.slice(0, 64) });
    if (body.data.uploadKey) await tx.selfQuoteFile.updateMany({ where: { uploadKey: body.data.uploadKey, quoteId: null }, data: { quoteId: q.id } });
  });
  if (status2 === "Submitted") await tellTeam(q.id, false).catch(() => undefined);
  return { ok: true, number: q.number, version };
}

// "Send to Osta" or "Book Installation": the team is told. Neither confirms an appointment; the administration reviews and confirms.
export async function submitByCustomer(accessToken: string, book: boolean): Promise<Result<{ number: string }>> {
  const q = await byToken(accessToken);
  if (!q || q.kind === "ductwork") return fail("This link is not valid.");
  const status = displayStatus(q);
  // A quotation already sent to us can still be turned into a booking request (once).
  const upgrade = book && status === "Submitted" && !q.bookRequested;
  if (!customerCanSubmit(status) && !upgrade) return fail(status === "Expired" ? "This quotation has expired. Please edit it to get a new one, or contact us." : "This quotation has already been sent to us.");
  await prisma.$transaction(async (tx) => {
    await tx.selfQuote.update({ where: { id: q.id }, data: { status: "Submitted", submittedAt: q.submittedAt ?? new Date(), bookRequested: q.bookRequested || book } });
    await log(tx, q.id, book ? "booking_requested" : "submitted", { type: "customer", name: q.customerName }, book ? "The customer asked to book the installation (not confirmed until the team approves it)" : "The customer sent the quotation to OSTA");
  });
  await tellTeam(q.id, book).catch(() => undefined);
  return { ok: true, number: q.number };
}

async function tellTeam(id: string, booking: boolean) {
  const q = await prisma.selfQuote.findUnique({ where: { id } });
  if (!q) return;
  const snap = q.snapshot as unknown as QuoteSnapshot;
  const summary = snap.lines.filter((l) => l.kind === "unit").map((l) => `${l.qty}× ${l.labelEn}`).join("; ");
  await notifyAdminOfQuote({ number: q.number, version: q.version, booking: booking || q.bookRequested, name: q.customerName, phone: q.phone, email: q.email, emirate: q.emirate, location: q.location, total: money(q.total), rfq: q.rfq, summary });
}

// ---- the team ----

const load = (id: string) => prisma.selfQuote.findUnique({ where: { id } });

export async function reviseByAdmin(id: string, admin: Actor, rawLines: unknown, reason: string): Promise<Result<{ version: number }>> {
  const q = await load(id);
  if (!q) return fail("Quotation not found.");
  if (!adminCanRevise(displayStatus(q))) return fail(q.kind === "ductwork" ? "This quotation has become a project and can no longer be revised." : "This quotation has become an order and can no longer be revised.");
  if (reason.trim().length < 5) return fail("Write the reason for the change (it is kept in the record).");
  const duct = q.kind === "ductwork";
  const edited = duct ? ductLinesFromEdit(rawLines) : linesFromEdit(rawLines);
  if (!edited.ok) return edited;
  const cfg = duct ? await loadDuctConfig() : await loadConfig();
  const snap = duct ? ductWithLines(q.snapshot as unknown as DuctSnapshot, edited.lines as never) : withLines(q.snapshot as unknown as QuoteSnapshot, edited.lines as never);
  const version = q.version + 1;
  await prisma.$transaction(async (tx) => {
    await tx.selfQuote.update({ where: { id }, data: { snapshot: snap as never, subtotal: snap.totals.subtotal, vatAmount: snap.totals.vat, total: snap.totals.total, rfq: snap.totals.rfq, version, status: "Revised", expiresAt: addDays(new Date(), cfg.validityDays), lastEditedBy: admin.name, sentAt: null } });
    await tx.selfQuoteVersion.create({ data: { quoteId: id, version, snapshot: snap as never, total: snap.totals.total, reason: reason.trim(), byType: "admin", byName: admin.name } });
    await log(tx, id, "revised", admin, reason.trim(), { fromVersion: q.version, version, before: q.total, after: snap.totals.total });
  });
  return { ok: true, version };
}

export async function setStatus(id: string, admin: Actor, to: QuoteStatus, note: string): Promise<Result> {
  const q = await load(id);
  if (!q) return fail("Quotation not found.");
  const from = displayStatus(q);
  if (!adminNextFor(q.kind, from).includes(to)) return fail(`A quotation that is "${from}" cannot be moved to "${to}".`);
  if (to === "Rejected" && note.trim().length < 5) return fail("Write the reason for rejecting (the customer will see it).");
  await prisma.$transaction(async (tx) => {
    await tx.selfQuote.update({ where: { id }, data: { status: to, ...(to === "Accepted" || to === "Rejected" ? { decidedAt: new Date() } : {}), ...(to === "Rejected" ? { rejectionReason: note.trim() } : {}), ...(from === "Expired" ? { expiresAt: addDays(new Date(), 14) } : {}) } });
    await log(tx, id, "status", admin, `${from} → ${to}${note.trim() ? `: ${note.trim()}` : ""}`, { from, to });
  });
  if (q.email && (to === "Accepted" || to === "Rejected")) {
    await sendCustomerQuoteEmail(q.email, to === "Accepted" ? "accepted" : "rejected", { lang: q.lang as "en" | "ar", name: q.customerName, number: q.number, url: urlOf(q), note: note.trim(), product: productOf(q) }).catch(() => undefined);
  }
  return { ok: true };
}

const urlOf = (q: SelfQuote) => (q.kind === "ductwork" ? ductQuoteUrl(q.accessToken) : quoteUrl(q.accessToken));
const productOf = (q: SelfQuote) => (q.kind === "ductwork" ? { en: "ductwork", ar: "تصنيع وتركيب الدكت" } : undefined);

export function messageLink(q: SelfQuote, kind: QuoteMessageKind, note = "") {
  return quoteWhatsAppLink(q.whatsapp || q.phone, kind, { lang: q.lang as "en" | "ar", name: q.customerName, number: q.number, url: urlOf(q), total: money(q.total), note, product: productOf(q) });
}

// Sends the quotation (as it now stands) to the customer with its PDF, and marks it "Sent".
export async function sendToCustomer(id: string, admin: Actor, note: string): Promise<Result<{ whatsapp: string | null; emailed: boolean }>> {
  const q = await load(id);
  if (!q) return fail("Quotation not found.");
  const from = displayStatus(q);
  if (["Accepted", "Rejected", "Converted to Order", "Converted to Project"].includes(from)) return fail(`A quotation that is "${from}" cannot be sent again.`);
  const cfg = q.kind === "ductwork" ? await loadDuctConfig() : await loadConfig();
  await prisma.$transaction(async (tx) => {
    await tx.selfQuote.update({ where: { id }, data: { status: "Sent", sentAt: new Date(), ...(from === "Expired" ? { expiresAt: addDays(new Date(), cfg.validityDays) } : {}) } });
    await log(tx, id, "sent", admin, note.trim() || "Quotation sent to the customer");
  });
  const fresh = (await load(id))!;
  let emailed = false;
  if (fresh.email) {
    try {
      const pdf = await quotePdf(fresh);
      await sendCustomerQuoteEmail(fresh.email, "sent", { lang: fresh.lang as "en" | "ar", name: fresh.customerName, number: fresh.number, url: urlOf(fresh), total: money(fresh.total), note: note.trim(), product: productOf(fresh) }, [{ filename: pdfName(fresh, fresh.lang === "ar" ? "ar" : "en"), content: pdf }]);
      await log(prisma, id, "email_sent", admin, `Quotation emailed to ${fresh.email}`);
      emailed = true;
    } catch (e) {
      await log(prisma, id, "email_failed", admin, e instanceof Error ? e.message.slice(0, 200) : "Email failed").catch(() => undefined);
    }
  }
  return { ok: true, whatsapp: messageLink(fresh, "sent", note.trim()), emailed };
}

export async function addNote(id: string, admin: Actor, note: string): Promise<Result> {
  const text = note.trim();
  if (text.length < 2) return fail("Write a note first.");
  const q = await load(id);
  if (!q) return fail("Quotation not found.");
  await prisma.selfQuote.update({ where: { id }, data: { internalNotes: `${q.internalNotes ? `${q.internalNotes}\n\n` : ""}[${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${admin.name}] ${text}`.slice(-8000) } });
  await log(prisma, id, "note", admin, text);
  return { ok: true };
}

// An accepted quotation becomes a service order. The order is created as a REQUEST ("Requested"): an administrator still assigns the team
// and confirms the appointment, so nothing is booked automatically.
export async function convertToOrder(id: string, admin: Actor): Promise<Result<{ orderId: string; orderNumber: string }>> {
  const q = await load(id);
  if (!q) return fail("Quotation not found.");
  if (!canConvert(displayStatus(q))) return fail(q.kind === "ductwork" ? "Only an accepted quotation can be turned into a project." : "Only an accepted quotation can be turned into an order.");
  if (q.kind === "ductwork") return convertDuct(q, admin);
  const snap = q.snapshot as unknown as QuoteSnapshot;
  const customer = q.customerId ? await prisma.customer.findUnique({ where: { id: q.customerId } }) : await findCustomerByContact(q.phone, q.email);
  const customerId = customer?.id ?? (await findOrCreateCustomer({ type: "INDIVIDUAL", name: q.customerName, phone: q.phone.trim(), whatsapp: q.whatsapp || null, emirate: q.emirate, leadSource: "Website" }, admin.id ?? "")).id;
  const items = snap.lines.map((l) => `${l.qty}× ${l.labelEn}${l.amount == null ? " (to be quoted)" : ` = ${money(l.amount)}`}`).join("\n");
  const notes = [`Self-service quotation ${q.number} (v${q.version}) — accepted.`, items, `Subtotal ${money(q.subtotal)}, VAT ${money(q.vatAmount)}, total incl. VAT ${money(q.total)}${q.rfq ? " + items still to be quoted" : ""}.`, `Project: ${q.location}${q.preferredDate ? `; preferred date ${q.preferredDate.toISOString().slice(0, 10)}` : ""}.`, "Confirm the appointment with the customer."].join("\n");
  const number = await generateOrderNumber();
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({ data: { number, date: new Date(), customerId, orderType: "New Order", priceAgreed: "Yes", customerLanguage: q.lang === "ar" ? "Arabic" : "English", leadSource: "Website", notes, status: "Requested", createdById: admin.id ?? null } });
    await tx.selfQuote.update({ where: { id }, data: { status: "Converted to Order", orderId: o.id, customerId } });
    await log(tx, id, "converted", admin, `Converted to order ${o.number}`, { orderId: o.id });
    return o;
  });
  return { ok: true, orderId: order.id, orderNumber: order.number };
}

// ---- files ----

export type Sniffed = { mime: string; ext: string };
export function sniffFile(b: Buffer): Sniffed | null {
  if (b.length < 12) return null;
  if (b.subarray(0, 4).toString("latin1") === "%PDF") return { mime: "application/pdf", ext: "pdf" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

// A file is judged by what it really is (its first bytes), never by its name or the type the browser claims.
export async function saveUpload(buf: Buffer, originalName: string, uploadKey: string, ipHash: string): Promise<Result<{ id: string; name: string; size: number }>> {
  const cfg = await loadConfig();
  if (!/^[a-f0-9]{16,64}$/.test(uploadKey)) return fail("The upload is not valid.");
  if (buf.length === 0) return fail("The file is empty.");
  if (buf.length > cfg.uploads.maxMb * 1024 * 1024) return fail(`Each file can be up to ${cfg.uploads.maxMb} MB.`);
  const kind = sniffFile(buf);
  if (!kind) return fail("Only PDF, JPG, PNG and WebP files can be uploaded.");
  const have = await prisma.selfQuoteFile.count({ where: { uploadKey } });
  if (have >= cfg.uploads.maxFiles) return fail(`You can attach up to ${cfg.uploads.maxFiles} files.`);
  // Files nobody attached to a quotation are removed after a day.
  await prisma.selfQuoteFile.deleteMany({ where: { quoteId: null, createdAt: { lt: new Date(Date.now() - 864e5) } } }).catch(() => undefined);
  const base = originalName.replace(/\.[^.]*$/, "").replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 60) || "file";
  const name = `${base}.${kind.ext}`;
  const row = await prisma.selfQuoteFile.create({ data: { uploadKey, ipHash, name, mime: kind.mime, size: buf.length, bytes: new Uint8Array(buf) }, select: { id: true } });
  return { ok: true, id: row.id, name, size: buf.length };
}

// An accepted ductwork quotation becomes a project / work order: created as a REQUEST, with the systems, the areas and the totals in its
// notes, so the team can plan it. Nothing is scheduled automatically.
async function convertDuct(q: SelfQuote, admin: Actor): Promise<Result<{ orderId: string; orderNumber: string }>> {
  const snap = q.snapshot as unknown as DuctSnapshot;
  const proj = (q.project ?? {}) as { company?: string; projectName?: string; siteAddress?: string };
  const customer = q.customerId ? await prisma.customer.findUnique({ where: { id: q.customerId } }) : await findCustomerByContact(q.phone, q.email);
  const customerId = customer?.id ?? (await findOrCreateCustomer({ type: proj.company ? "COMPANY" : "INDIVIDUAL", name: proj.company || q.customerName, phone: q.phone.trim(), whatsapp: null, emirate: q.emirate, leadSource: "Website" }, admin.id ?? "")).id;
  const items = snap.lines.map((l) => `${l.labelEn} — ${l.qty} ${l.unit}${l.amount == null ? " (to be quoted)" : ` = ${l.kind === "discount" ? "− " : ""}${money(l.amount)}`}`).join("\n");
  const notes = [
    `Ductwork quotation ${q.number} (v${q.version}) — accepted.`,
    `Project: ${proj.projectName || "-"} — ${proj.siteAddress || q.location}, ${q.emirate}. Contact: ${q.customerName}${proj.company ? ` (${proj.company})` : ""}.`,
    `Total area ${snap.totals.totalArea} m².`, items,
    `Subtotal ${money(q.subtotal)}, VAT ${money(q.vatAmount)}, total incl. VAT ${money(q.total)}${q.rfq ? " + items still to be quoted" : ""}.`,
    snap.review.length ? `Subject to technical review: ${snap.review.map((r) => r.en).join("; ")}.` : "",
    "Plan the project and confirm the schedule with the customer.",
  ].filter(Boolean).join("\n");
  const number = await generateOrderNumber();
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({ data: { number, date: new Date(), customerId, orderType: "New Order", priceAgreed: "Yes", customerLanguage: q.lang === "ar" ? "Arabic" : "English", leadSource: "Website", notes, status: "Requested", createdById: admin.id ?? null } });
    await tx.selfQuote.update({ where: { id: q.id }, data: { status: "Converted to Project", orderId: o.id, customerId } });
    await log(tx, q.id, "converted", admin, `Converted to project / work order ${o.number}`, { orderId: o.id });
    return o;
  });
  return { ok: true, orderId: order.id, orderNumber: order.number };
}
