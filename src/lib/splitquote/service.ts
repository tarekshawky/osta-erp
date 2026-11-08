import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { SelfQuote } from "@/generated/prisma";
import { findCustomerByContact } from "@/lib/contracts/service";
import { htmlToPdf } from "@/lib/contracts/pdf";
import { addDays, byToken, fail, log, money, nextNumber, token, withNumber, type Actor, type Result } from "@/lib/acquote/common";
import { notifyAdminOfQuote, quoteUrl, sendCustomerQuoteEmail } from "@/lib/acquote/notify";
import { customerCanEdit, customerCanSubmit, displayStatus } from "@/lib/acquote/status";
import type { PdfLang } from "@/lib/ductwork/html";
import { ConfigSchema, DEFAULT_CONFIG, parseConfig, type SplitConfig } from "./config";
import { InputSchema, buildLines } from "./engine";
import { renderSplitHtml } from "./html";
import { buildSnapshot, type SplitProject, type SplitSnapshot } from "./snapshot";

// The Split AC installation quotations: built by the customer on the website (the server works the prices out again), kept in versions,
// reviewed and revised by the team, and once accepted turned into a service order. They share the quotation tables, the audit trail, the
// statuses and the admin screens with the other calculators (told apart by `kind`).

const SETTINGS_ID = "split";
const PRODUCT = { en: "split AC installation", ar: "تركيب مكيف سبليت" };

export async function loadConfig(): Promise<SplitConfig> {
  const row = await prisma.acQuoteSettings.findUnique({ where: { id: SETTINGS_ID } }).catch(() => null);
  return row ? parseConfig(row.config) : DEFAULT_CONFIG;
}

export async function saveConfig(raw: unknown, adminName: string): Promise<Result> {
  const r = ConfigSchema.safeParse(raw);
  if (!r.success) return fail(`The settings are not valid: ${r.error.issues[0]?.path.join(".") ?? ""} ${r.error.issues[0]?.message ?? ""}`.trim());
  const dup = (keys: string[]) => new Set(keys).size !== keys.length;
  if (dup(r.data.capacities.map((c) => c.key))) return fail("Two capacities share the same key.");
  if (dup(r.data.packages.map((p) => p.key))) return fail("Two packages share the same key.");
  if (dup(r.data.extras.map((e) => e.key))) return fail("Two additional services share the same key.");
  if (!r.data.packages.some((p) => p.active)) return fail("Keep at least one package switched on.");
  if (!r.data.capacities.some((c) => c.active)) return fail("Keep at least one capacity switched on.");
  // Every package needs a price for every capacity that is switched on, so a customer can never pick a combination that has no price.
  for (const p of r.data.packages) for (const c of r.data.capacities) if (c.active && typeof p.prices[c.key] !== "number") return fail(`${p.nameEn || p.key}: set a price for ${c.labelEn}.`);
  await prisma.acQuoteSettings.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID, config: r.data as never, updatedByName: adminName }, update: { config: r.data as never, updatedByName: adminName } });
  return { ok: true };
}

// ---- what the customer sends ----

const digits = (v: string) => v.replace(/\D/g, "");
export const CustomerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).refine((v) => digits(v).length >= 8 && digits(v).length <= 15),
  email: z.string().trim().toLowerCase().max(120).default("").refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)),
});
export const ProjectSchema = z.object({
  propertyType: z.string().trim().min(1).max(30), emirate: z.string().trim().min(1).max(40), location: z.string().trim().min(2).max(200),
  address: z.string().trim().min(2).max(300), notes: z.string().trim().max(2000).default(""),
});
export const SplitBody = z.object({ lang: z.enum(["en", "ar"]).default("en"), input: InputSchema, customer: CustomerSchema, project: ProjectSchema });
export type SplitBody = z.infer<typeof SplitBody>;

function prepare(cfg: SplitConfig, body: SplitBody) {
  if (!cfg.propertyTypes.some((t) => t.key === body.project.propertyType)) return fail("Choose the property type.");
  if (!cfg.emirates.some((e) => e.key === body.project.emirate)) return fail("Choose the emirate.");
  const built = buildLines(cfg, body.input);
  if (!built.ok) return built;
  return { ok: true as const, snapshot: buildSnapshot(cfg, { lang: body.lang, input: body.input, lines: built.lines, manual: false }) };
}

const rowData = (body: SplitBody, snapshot: SplitSnapshot, expiresAt: Date) => ({
  customerName: body.customer.name, phone: body.customer.phone, whatsapp: "", email: body.customer.email, contactMethod: "", preferredDate: null,
  emirate: body.project.emirate, location: body.project.location, propertyType: body.project.propertyType,
  project: { address: body.project.address, notes: body.project.notes } as never,
  snapshot: snapshot as never, subtotal: snapshot.totals.subtotal, vatAmount: snapshot.totals.vat, total: snapshot.totals.total, rfq: snapshot.totals.rfq, expiresAt,
});

export async function createSplitQuote(raw: unknown, ctx: { ip: string }): Promise<Result<{ quote: SelfQuote }>> {
  const body = SplitBody.safeParse(raw);
  if (!body.success) return fail("Please check the details: some are missing or not valid.");
  const cfg = await loadConfig();
  const r = prepare(cfg, body.data);
  if (!r.ok) return r;
  const who: Actor = { type: "customer", name: body.data.customer.name };
  const found = await findCustomerByContact(body.data.customer.phone, body.data.customer.email).catch(() => null);
  const quote = await withNumber(() =>
    prisma.$transaction(async (tx) => {
      const q = await tx.selfQuote.create({ data: { kind: "split-ac", number: await nextNumber(tx, "SQ"), status: "Generated", lang: body.data.lang, accessToken: token(), customerId: found?.id ?? null, lastEditedBy: "customer", ...rowData(body.data, r.snapshot, addDays(new Date(), cfg.validityDays)) } });
      await tx.selfQuoteVersion.create({ data: { quoteId: q.id, version: 1, snapshot: r.snapshot as never, total: q.total, reason: "Created by the customer", byType: "customer", byName: who.name } });
      await log(tx, q.id, "created", who, `Quotation ${q.number} created: ${money(q.total)} incl. VAT, ${r.snapshot.totals.unitCount} AC unit(s)${q.rfq ? " + items to be quoted" : ""}`, { total: q.total, units: r.snapshot.totals.unitCount, ip: ctx.ip.slice(0, 64) });
      return q;
    }),
  );
  return { ok: true, quote };
}

export const splitQuoteUrl = (accessToken: string) => quoteUrl(accessToken, "split-quote");
export const splitPdfName = (q: { number: string; version?: number }, lang: PdfLang) => `OSTA-Split-AC-Quotation-${q.number}${q.version && q.version > 1 ? `-v${q.version}` : ""}${lang === "both" ? "-EN-AR" : lang === "ar" ? "-AR" : ""}.pdf`;

export async function splitQuotePdf(q: SelfQuote, lang: PdfLang): Promise<Buffer> {
  const cfg = await loadConfig();
  const snap = q.snapshot as unknown as SplitSnapshot;
  const proj = (q.project ?? {}) as { address?: string; notes?: string };
  const lab = (list: { key: string; en: string; ar: string }[], key: string) => list.find((x) => x.key === key) ?? { key, en: key, ar: key };
  const t = lab(cfg.propertyTypes, q.propertyType), e = lab(cfg.emirates, q.emirate);
  return htmlToPdf(renderSplitHtml({
    snapshot: snap, number: q.number, version: q.version, createdAt: q.createdAt, expiresAt: q.expiresAt,
    customer: { name: q.customerName, phone: q.phone, email: q.email },
    project: { propertyType: q.propertyType, emirate: q.emirate, location: q.location, address: proj.address ?? "", notes: proj.notes ?? "" } satisfies SplitProject,
    propertyTypeLabel: { en: t.en, ar: t.ar }, emirateLabel: { en: e.en, ar: e.ar },
  }, lang));
}

// The PDF and the email that follow creating a quotation. Neither can fail the customer's request.
export async function afterCreateSplit(quoteId: string) {
  const q = await prisma.selfQuote.findUnique({ where: { id: quoteId } });
  if (!q || !q.email) return;
  const lang: PdfLang = q.lang === "ar" ? "ar" : "en";
  try {
    const pdf = await splitQuotePdf(q, lang);
    await sendCustomerQuoteEmail(q.email, "generated", { lang, name: q.customerName, number: q.number, url: splitQuoteUrl(q.accessToken), total: money(q.total), product: PRODUCT, variant: "split" }, [{ filename: splitPdfName(q, lang), content: pdf }]);
    await log(prisma, q.id, "email_sent", { type: "system", name: "System" }, `Quotation emailed to ${q.email}`);
  } catch (e) {
    await log(prisma, q.id, "email_failed", { type: "system", name: "System" }, e instanceof Error ? e.message.slice(0, 200) : "Email failed").catch(() => undefined);
  }
}

// ---- the customer's own link ----

export async function publicSplitView(accessToken: string) {
  const q = await byToken(accessToken);
  if (!q || q.kind !== "split-ac") return null;
  const status = displayStatus(q);
  const snap = q.snapshot as unknown as SplitSnapshot;
  const proj = (q.project ?? {}) as { address?: string; notes?: string };
  return {
    kind: "split-ac" as const, number: q.number, version: q.version, status, lang: q.lang, createdAt: q.createdAt, expiresAt: q.expiresAt, bookRequested: q.bookRequested,
    customer: { name: q.customerName, phone: q.phone, email: q.email },
    project: { propertyType: q.propertyType, emirate: q.emirate, location: q.location, address: proj.address ?? "", notes: proj.notes ?? "" },
    input: snap.input, manual: snap.manual, lines: snap.lines, totals: snap.totals, packages: snap.packages, conditions: snap.conditions, technicalNote: snap.technicalNote, disclaimer: snap.disclaimer, validityDays: snap.validityDays,
    canEdit: customerCanEdit(status, snap.manual), canBook: (customerCanSubmit(status) || status === "Submitted") && !q.bookRequested, rejectionReason: q.status === "Rejected" ? q.rejectionReason : "",
  };
}

export async function editSplitByCustomer(accessToken: string, raw: unknown, ctx: { ip: string }): Promise<Result<{ number: string; version: number }>> {
  const q = await byToken(accessToken);
  if (!q || q.kind !== "split-ac") return fail("This link is not valid.");
  const snap0 = q.snapshot as unknown as SplitSnapshot;
  const status = displayStatus(q);
  if (!customerCanEdit(status, snap0.manual)) return fail(snap0.manual ? "Our team has revised this quotation. Please contact us to change it." : "This quotation can no longer be changed. Please contact us.");
  const body = SplitBody.safeParse(raw);
  if (!body.success) return fail("Please check the details: some are missing or not valid.");
  const cfg = await loadConfig();
  const r = prepare(cfg, body.data);
  if (!r.ok) return r;
  const version = q.version + 1;
  const who: Actor = { type: "customer", name: body.data.customer.name };
  const status2 = q.status === "Submitted" ? "Submitted" : "Generated";
  await prisma.$transaction(async (tx) => {
    await tx.selfQuote.update({ where: { id: q.id }, data: { ...rowData(body.data, r.snapshot, addDays(new Date(), cfg.validityDays)), version, status: status2, lang: body.data.lang, lastEditedBy: "customer", sentAt: null } });
    await tx.selfQuoteVersion.create({ data: { quoteId: q.id, version, snapshot: r.snapshot as never, total: r.snapshot.totals.total, reason: "Changed by the customer", byType: "customer", byName: who.name } });
    await log(tx, q.id, "edited", who, `The customer changed the quotation (version ${version}): ${money(r.snapshot.totals.total)} incl. VAT`, { fromVersion: q.version, version, ip: ctx.ip.slice(0, 64) });
  });
  if (status2 === "Submitted") await tellTeam(q.id).catch(() => undefined);
  return { ok: true, number: q.number, version };
}

// "Request Booking": the team is told. It does not confirm an appointment; the administration reviews and confirms.
export async function requestBooking(accessToken: string): Promise<Result<{ number: string }>> {
  const q = await byToken(accessToken);
  if (!q || q.kind !== "split-ac") return fail("This link is not valid.");
  const status = displayStatus(q);
  if (q.bookRequested) return fail("We already have your booking request.");
  if (!customerCanSubmit(status) && status !== "Submitted") return fail(status === "Expired" ? "This quotation has expired. Please edit it to get a new one, or contact us." : "This quotation can no longer be booked online. Please contact us.");
  await prisma.$transaction(async (tx) => {
    await tx.selfQuote.update({ where: { id: q.id }, data: { status: "Submitted", submittedAt: q.submittedAt ?? new Date(), bookRequested: true } });
    await log(tx, q.id, "booking_requested", { type: "customer", name: q.customerName }, "The customer asked to book the installation (not confirmed until the team approves it)");
  });
  await tellTeam(q.id).catch(() => undefined);
  return { ok: true, number: q.number };
}

async function tellTeam(id: string) {
  const q = await prisma.selfQuote.findUnique({ where: { id } });
  if (!q) return;
  const snap = q.snapshot as unknown as SplitSnapshot;
  const summary = snap.lines.filter((l) => l.kind === "unit").map((l) => `${l.qty}× ${l.capacityEn} ${l.packageEn}`).join("; ");
  await notifyAdminOfQuote({ number: q.number, version: q.version, booking: q.bookRequested, name: q.customerName, phone: q.phone, email: q.email, emirate: q.emirate, location: q.location, total: money(q.total), rfq: q.rfq, summary });
}
