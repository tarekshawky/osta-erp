import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { SelfQuote } from "@/generated/prisma";
import { findCustomerByContact } from "@/lib/contracts/service";
import { htmlToPdf } from "@/lib/contracts/pdf";
import { addDays, byToken, fail, log, money, nextNumber, token, withNumber, type Actor, type Result } from "@/lib/acquote/common";
import { notifyAdminOfQuote, quoteUrl, sendCustomerQuoteEmail } from "@/lib/acquote/notify";
import { customerCanEdit, customerCanSubmit, displayStatus } from "@/lib/acquote/status";
import { ConfigSchema, DEFAULT_CONFIG, parseConfig, type DuctConfig } from "./config";
import { InputSchema, SpecSchema, buildDuct, type SpecInput } from "./engine";
import { renderDuctHtml, type PdfLang } from "./html";
import { buildSnapshot, type DuctCustomer, type DuctFileRef, type DuctProject, type DuctSnapshot } from "./snapshot";

// The ductwork calculator's quotations: built by the customer on the website (the server works the areas and prices out again), kept in
// versions, reviewed and revised by the team, and once approved turned into a project / work order. They share the quotation tables,
// the audit trail, the statuses and the admin screens with the AC installation calculator (told apart by `kind`).

const SETTINGS_ID = "ductwork";

export async function loadConfig(): Promise<DuctConfig> {
  const row = await prisma.acQuoteSettings.findUnique({ where: { id: SETTINGS_ID } }).catch(() => null);
  return row ? parseConfig(row.config) : DEFAULT_CONFIG;
}

export async function saveConfig(raw: unknown, adminName: string): Promise<Result> {
  const r = ConfigSchema.safeParse(raw);
  if (!r.success) return fail(`The settings are not valid: ${r.error.issues[0]?.path.join(".") ?? ""} ${r.error.issues[0]?.message ?? ""}`.trim());
  const dup = (keys: string[]) => new Set(keys).size !== keys.length;
  if (dup(r.data.systems.map((s) => s.key))) return fail("Two duct systems share the same key.");
  if (dup(r.data.accessories.map((a) => a.key))) return fail("Two components share the same key.");
  if (dup(r.data.services.map((s) => s.key))) return fail("Two services share the same key.");
  for (const a of r.data.accessories) if (!a.units.length) return fail(`${a.nameEn}: choose at least one unit.`);
  await prisma.acQuoteSettings.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID, config: r.data as never, updatedByName: adminName }, update: { config: r.data as never, updatedByName: adminName } });
  return { ok: true };
}

// ---- what the customer sends ----

const digits = (v: string) => v.replace(/\D/g, "");
export const CustomerSchema = z.object({
  name: z.string().trim().min(2).max(100), company: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(30).refine((v) => digits(v).length >= 8 && digits(v).length <= 15),
  email: z.string().trim().toLowerCase().max(120).default("").refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)),
});
export const ProjectSchema = z.object({
  projectType: z.string().trim().min(1).max(30), emirate: z.string().trim().min(1).max(40), location: z.string().trim().min(2).max(300),
  projectName: z.string().trim().max(160).default(""), siteAddress: z.string().trim().min(2).max(300), description: z.string().trim().min(3).max(3000),
});
export const DuctBody = z.object({ lang: z.enum(["en", "ar"]).default("en"), input: InputSchema, spec: SpecSchema, customer: CustomerSchema, project: ProjectSchema, uploadKey: z.string().regex(/^[a-f0-9]{16,64}$/).optional() });
export type DuctBody = z.infer<typeof DuctBody>;

type Prepared = { customer: DuctCustomer; project: DuctProject; spec: SpecInput; snapshot: DuctSnapshot; completion: Date | null };

function prepare(cfg: DuctConfig, body: DuctBody, files: DuctFileRef[]): Result<{ p: Prepared }> {
  if (!cfg.projectTypes.some((t) => t.key === body.project.projectType)) return fail("Choose the project type.");
  if (!cfg.emirates.some((e) => e.key === body.project.emirate)) return fail("Choose the emirate.");
  const built = buildDuct(cfg, body.input);
  if (!built.ok) return built;
  const spec = body.spec as SpecInput;
  const completion = spec.completionDate ? new Date(`${spec.completionDate}T12:00:00+04:00`) : null;
  if (completion && completion.getTime() < Date.now() - 864e5) return fail("The required completion date cannot be in the past.");
  const snapshot = buildSnapshot(cfg, { lang: body.lang, input: body.input, lines: built.lines, sections: built.sections, totals: built.totals, spec, manual: false, files });
  return { ok: true, p: { customer: body.customer, project: body.project, spec, snapshot, completion } };
}

const rowData = (p: Prepared, expiresAt: Date) => ({
  customerName: p.customer.name, phone: p.customer.phone, whatsapp: "", email: p.customer.email, contactMethod: "", preferredDate: p.completion,
  emirate: p.project.emirate, location: p.project.location, propertyType: p.project.projectType,
  project: { company: p.customer.company, projectName: p.project.projectName, siteAddress: p.project.siteAddress, description: p.project.description } as never,
  snapshot: p.snapshot as never, subtotal: p.snapshot.totals.subtotal, vatAmount: p.snapshot.totals.vat, total: p.snapshot.totals.total, rfq: p.snapshot.totals.rfq, expiresAt,
});

async function filesOf(uploadKey: string | undefined, quoteId?: string): Promise<DuctFileRef[]> {
  const rows = await prisma.selfQuoteFile.findMany({ where: quoteId ? { quoteId } : uploadKey ? { uploadKey, quoteId: null } : { id: "none" }, select: { name: true, category: true } });
  return rows.map((f) => ({ name: f.name, category: f.category === "drawing" || f.category === "boq" ? f.category : "" }));
}

export async function createDuctQuote(raw: unknown, ctx: { ip: string }): Promise<Result<{ quote: SelfQuote }>> {
  const body = DuctBody.safeParse(raw);
  if (!body.success) return fail("Please check the details: some are missing or not valid.");
  const cfg = await loadConfig();
  const r = prepare(cfg, body.data, await filesOf(body.data.uploadKey));
  if (!r.ok) return r;
  const who: Actor = { type: "customer", name: body.data.customer.name };
  const found = await findCustomerByContact(body.data.customer.phone, body.data.customer.email).catch(() => null);
  const quote = await withNumber(() =>
    prisma.$transaction(async (tx) => {
      const q = await tx.selfQuote.create({ data: { kind: "ductwork", number: await nextNumber(tx, "DW"), status: "Generated", lang: body.data.lang, accessToken: token(), customerId: found?.id ?? null, lastEditedBy: "customer", ...rowData(r.p, addDays(new Date(), cfg.validityDays)) } });
      await tx.selfQuoteVersion.create({ data: { quoteId: q.id, version: 1, snapshot: r.p.snapshot as never, total: q.total, reason: "Created by the customer", byType: "customer", byName: who.name } });
      await log(tx, q.id, "created", who, `Quotation ${q.number} created: ${money(q.total)} incl. VAT, ${r.p.snapshot.totals.totalArea} m²${q.rfq ? " + items to be quoted" : ""}`, { total: q.total, area: r.p.snapshot.totals.totalArea, ip: ctx.ip.slice(0, 64) });
      if (body.data.uploadKey) {
        const n = await tx.selfQuoteFile.updateMany({ where: { uploadKey: body.data.uploadKey, quoteId: null }, data: { quoteId: q.id } });
        if (n.count) await log(tx, q.id, "files", who, `${n.count} drawing / BOQ file(s) attached`);
      }
      return q;
    }),
  );
  return { ok: true, quote };
}

const PRODUCT = { en: "ductwork", ar: "تصنيع وتركيب الدكت" };

// The PDF and the emails that follow creating a quotation. Neither can fail the customer's request.
export async function afterCreateDuct(quoteId: string) {
  const q = await prisma.selfQuote.findUnique({ where: { id: quoteId } });
  if (!q || !q.email) return;
  try {
    const pdf = await ductQuotePdf(q, q.lang === "ar" ? "ar" : "en");
    await sendCustomerQuoteEmail(q.email, "generated", { lang: q.lang as "en" | "ar", name: q.customerName, number: q.number, url: ductQuoteUrl(q.accessToken), total: money(q.total), product: PRODUCT, variant: "duct" }, [{ filename: ductPdfName(q, q.lang === "ar" ? "ar" : "en"), content: pdf }]);
    await log(prisma, q.id, "email_sent", { type: "system", name: "System" }, `Quotation emailed to ${q.email}`);
  } catch (e) {
    await log(prisma, q.id, "email_failed", { type: "system", name: "System" }, e instanceof Error ? e.message.slice(0, 200) : "Email failed").catch(() => undefined);
  }
}

export const ductQuoteUrl = (accessToken: string) => quoteUrl(accessToken, "duct-quote");

// ---- the PDF ----

export const ductPdfName = (q: { number: string; version?: number }, lang: PdfLang) => `OSTA-Ductwork-Quotation-${q.number}${q.version && q.version > 1 ? `-v${q.version}` : ""}${lang === "both" ? "-EN-AR" : lang === "ar" ? "-AR" : ""}.pdf`;

export async function ductQuotePdf(q: SelfQuote, lang: PdfLang): Promise<Buffer> {
  const cfg = await loadConfig();
  const snap = q.snapshot as unknown as DuctSnapshot;
  const proj = (q.project ?? {}) as { company?: string; projectName?: string; siteAddress?: string; description?: string };
  const lab = <T extends { key: string; en: string; ar: string }>(list: T[], key: string) => list.find((x) => x.key === key) ?? { key, en: key, ar: key };
  const t = lab(cfg.projectTypes, q.propertyType), e = lab(cfg.emirates, q.emirate);
  return htmlToPdf(renderDuctHtml({
    snapshot: snap, number: q.number, version: q.version, createdAt: q.createdAt, expiresAt: q.expiresAt,
    customer: { name: q.customerName, company: proj.company ?? "", phone: q.phone, email: q.email },
    project: { projectType: q.propertyType, emirate: q.emirate, location: q.location, projectName: proj.projectName ?? "", siteAddress: proj.siteAddress ?? "", description: proj.description ?? "" },
    projectTypeLabel: { en: t.en, ar: t.ar }, emirateLabel: { en: e.en, ar: e.ar },
  }, lang));
}

// ---- the customer's own link ----

export async function publicDuctView(accessToken: string) {
  const q = await byToken(accessToken);
  if (!q || q.kind !== "ductwork") return null;
  const status = displayStatus(q);
  const snap = q.snapshot as unknown as DuctSnapshot;
  const files = await prisma.selfQuoteFile.findMany({ where: { quoteId: q.id }, select: { id: true, name: true, size: true, category: true } });
  const proj = (q.project ?? {}) as Record<string, string>;
  return {
    kind: "ductwork" as const, number: q.number, version: q.version, status, lang: q.lang, createdAt: q.createdAt, expiresAt: q.expiresAt, requestType: q.requestType,
    customer: { name: q.customerName, company: proj.company ?? "", phone: q.phone, email: q.email },
    project: { projectType: q.propertyType, emirate: q.emirate, location: q.location, projectName: proj.projectName ?? "", siteAddress: proj.siteAddress ?? "", description: proj.description ?? "" },
    input: snap.input, spec: snap.spec, manual: snap.manual, lines: snap.lines, sections: snap.sections, totals: snap.totals, specRows: snap.specRows, review: snap.review, systems: snap.systems,
    estimateNotice: snap.estimateNotice, straightDuctNote: snap.straightDuctNote, terms: snap.terms, validityDays: snap.validityDays,
    canEdit: customerCanEdit(status, snap.manual), canSubmit: customerCanSubmit(status) || status === "Submitted", files, rejectionReason: q.status === "Rejected" ? q.rejectionReason : "",
  };
}

export async function editDuctByCustomer(accessToken: string, raw: unknown, ctx: { ip: string }): Promise<Result<{ number: string; version: number }>> {
  const q = await byToken(accessToken);
  if (!q || q.kind !== "ductwork") return fail("This link is not valid.");
  const snap0 = q.snapshot as unknown as DuctSnapshot;
  const status = displayStatus(q);
  if (!customerCanEdit(status, snap0.manual)) return fail(snap0.manual ? "Our team has revised this quotation. Please contact us to change it." : "This quotation can no longer be changed. Please contact us.");
  const body = DuctBody.safeParse(raw);
  if (!body.success) return fail("Please check the details: some are missing or not valid.");
  const cfg = await loadConfig();
  const before = await filesOf(undefined, q.id);
  const newer = body.data.uploadKey ? await filesOf(body.data.uploadKey) : [];
  const r = prepare(cfg, body.data, [...before, ...newer]);
  if (!r.ok) return r;
  const version = q.version + 1;
  const who: Actor = { type: "customer", name: body.data.customer.name };
  const status2 = q.status === "Submitted" ? "Submitted" : "Generated";
  await prisma.$transaction(async (tx) => {
    await tx.selfQuote.update({ where: { id: q.id }, data: { ...rowData(r.p, addDays(new Date(), cfg.validityDays)), version, status: status2, lang: body.data.lang, lastEditedBy: "customer", sentAt: null } });
    await tx.selfQuoteVersion.create({ data: { quoteId: q.id, version, snapshot: r.p.snapshot as never, total: r.p.snapshot.totals.total, reason: "Changed by the customer", byType: "customer", byName: who.name } });
    await log(tx, q.id, "edited", who, `The customer changed the quotation (version ${version}): ${money(r.p.snapshot.totals.total)} incl. VAT`, { fromVersion: q.version, version, ip: ctx.ip.slice(0, 64) });
    if (body.data.uploadKey) await tx.selfQuoteFile.updateMany({ where: { uploadKey: body.data.uploadKey, quoteId: null }, data: { quoteId: q.id } });
  });
  if (status2 === "Submitted") await tellTeam(q.id).catch(() => undefined);
  return { ok: true, number: q.number, version };
}

export const REQUEST_TYPES = ["inspection", "final", "inquiry"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
const REQUEST_LABEL: Record<RequestType, { log: string; mail: string }> = {
  inspection: { log: "The customer asked for a site inspection", mail: "Site inspection requested" },
  final: { log: "The customer asked for the final quotation", mail: "Final quotation requested" },
  inquiry: { log: "The customer submitted the project inquiry", mail: "Project inquiry submitted" },
};

// "Request Site Inspection", "Request Final Quotation" or "Submit Project Inquiry": the team is told. None of them confirms anything.
export async function submitDuct(accessToken: string, type: RequestType): Promise<Result<{ number: string }>> {
  const q = await byToken(accessToken);
  if (!q || q.kind !== "ductwork") return fail("This link is not valid.");
  const status = displayStatus(q);
  const again = status === "Submitted" && q.requestType !== type; // a different request on a quotation already sent
  if (!customerCanSubmit(status) && !again) return fail(status === "Expired" ? "This quotation has expired. Please edit it to get a new one, or contact us." : "We already have this request.");
  await prisma.$transaction(async (tx) => {
    await tx.selfQuote.update({ where: { id: q.id }, data: { status: "Submitted", submittedAt: q.submittedAt ?? new Date(), requestType: type } });
    await log(tx, q.id, `request_${type}`, { type: "customer", name: q.customerName }, REQUEST_LABEL[type].log);
  });
  await tellTeam(q.id).catch(() => undefined);
  return { ok: true, number: q.number };
}

async function tellTeam(id: string) {
  const q = await prisma.selfQuote.findUnique({ where: { id } });
  if (!q) return;
  const snap = q.snapshot as unknown as DuctSnapshot;
  const type = (REQUEST_TYPES as readonly string[]).includes(q.requestType) ? (q.requestType as RequestType) : "inquiry";
  const summary = snap.totals.areas.map((a) => `${a.area} m² ${a.nameEn}`).join("; ");
  await notifyAdminOfQuote({ number: q.number, version: q.version, booking: false, label: REQUEST_LABEL[type].mail, name: q.customerName, phone: q.phone, email: q.email, emirate: q.emirate, location: q.location, total: money(q.total), rfq: q.rfq, summary: summary || "-" });
}

// ---- files: drawings and BOQ ----

export type Sniffed = { mime: string; ext: string };
// A file is judged by what it really is (its first bytes), never by its name or the type the browser claims: PDF and images, plus the
// spreadsheet and drawing formats a BOQ or a drawing usually comes in. Files are only ever offered back as downloads.
export function sniffDuctFile(b: Buffer, name: string): Sniffed | null {
  if (b.length < 12) return null;
  if (b.subarray(0, 4).toString("latin1") === "%PDF") return { mime: "application/pdf", ext: "pdf" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) && /\.xls$/i.test(name)) return { mime: "application/vnd.ms-excel", ext: "xls" };
  // .xlsx is a zip; macro-enabled workbooks (which carry a vbaProject) are refused.
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 && /\.xlsx$/i.test(name) && !b.includes(Buffer.from("vbaProject"))) return { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" };
  if (/^AC10\d\d/.test(b.subarray(0, 6).toString("latin1")) && /\.dwg$/i.test(name)) return { mime: "application/acad", ext: "dwg" };
  return null;
}

export async function saveDuctUpload(buf: Buffer, originalName: string, uploadKey: string, category: string, ipHash: string): Promise<Result<{ id: string; name: string; size: number }>> {
  const cfg = await loadConfig();
  if (!/^[a-f0-9]{16,64}$/.test(uploadKey)) return fail("The upload is not valid.");
  if (category !== "drawing" && category !== "boq") return fail("Say whether the file is a drawing or a BOQ.");
  if (buf.length === 0) return fail("The file is empty.");
  if (buf.length > cfg.uploads.maxMb * 1024 * 1024) return fail(`Each file can be up to ${cfg.uploads.maxMb} MB.`);
  const kind = sniffDuctFile(buf, originalName);
  if (!kind) return fail("Only PDF, JPG, PNG, WebP, XLSX, XLS and DWG files can be uploaded.");
  if ((await prisma.selfQuoteFile.count({ where: { uploadKey } })) >= cfg.uploads.maxFiles) return fail(`You can attach up to ${cfg.uploads.maxFiles} files.`);
  await prisma.selfQuoteFile.deleteMany({ where: { quoteId: null, createdAt: { lt: new Date(Date.now() - 864e5) } } }).catch(() => undefined);
  const base = originalName.replace(/\.[^.]*$/, "").replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 60) || "file";
  const name = `${base}.${kind.ext}`;
  const row = await prisma.selfQuoteFile.create({ data: { uploadKey, category, ipHash, name, mime: kind.mime, size: buf.length, bytes: new Uint8Array(buf) }, select: { id: true } });
  return { ok: true, id: row.id, name, size: buf.length };
}
