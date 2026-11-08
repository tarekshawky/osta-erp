import { describe, it, expect, vi, beforeEach } from "vitest";

type R = Record<string, unknown>;
const mem = vi.hoisted(() => ({ quotes: [] as R[], versions: [] as R[], events: [] as R[], files: [] as R[], orders: [] as R[], customers: [] as R[], settings: null as R | null, mails: [] as R[], seq: 0 }));
const match = (row: R, where: R) => Object.entries(where).every(([k, v]) => (v && typeof v === "object" && "startsWith" in (v as object) ? String(row[k] ?? "").startsWith((v as { startsWith: string }).startsWith) : v && typeof v === "object" && "lt" in (v as object) ? (row[k] as Date) < (v as { lt: Date }).lt : row[k] === v));
vi.mock("@/lib/prisma", () => {
  const db: R = {
    acQuoteSettings: { findUnique: async () => mem.settings, upsert: async ({ create, update }: { create: R; update: R }) => { mem.settings = mem.settings ? { ...mem.settings, ...update } : create; return mem.settings; } },
    selfQuote: {
      findUnique: async ({ where }: { where: R }) => mem.quotes.find((q) => match(q, where)) ?? null,
      findFirst: async ({ where }: { where: R }) => [...mem.quotes.filter((q) => match(q, where))].sort((a, b) => String(b.number).localeCompare(String(a.number)))[0] ?? null,
      create: async ({ data }: { data: R }) => { const q = { id: `q${++mem.seq}`, version: 1, createdAt: new Date(), internalNotes: "", rejectionReason: "", bookRequested: false, ...data }; mem.quotes.push(q); return q; },
      update: async ({ where, data }: { where: R; data: R }) => { const q = mem.quotes.find((x) => match(x, where))!; Object.assign(q, data); return q; },
    },
    selfQuoteVersion: { create: async ({ data }: { data: R }) => { mem.versions.push(data); return data; } },
    selfQuoteEvent: { create: async ({ data }: { data: R }) => { mem.events.push(data); return data; } },
    selfQuoteFile: {
      create: async ({ data }: { data: R }) => { const f = { id: `f${++mem.seq}`, createdAt: new Date(), quoteId: null, ...data }; mem.files.push(f); return f; },
      count: async ({ where }: { where: R }) => mem.files.filter((f) => match(f, where)).length,
      findMany: async ({ where }: { where: R }) => mem.files.filter((f) => match(f, where)),
      updateMany: async ({ where, data }: { where: R; data: R }) => { const hit = mem.files.filter((f) => match(f, where)); hit.forEach((f) => Object.assign(f, data)); return { count: hit.length }; },
      deleteMany: async ({ where }: { where: R }) => { const before = mem.files.length; mem.files = mem.files.filter((f) => !match(f, where)); return { count: before - mem.files.length }; },
    },
    customer: { findUnique: async ({ where }: { where: { id: string } }) => mem.customers.find((c) => c.id === where.id) ?? null },
    order: { create: async ({ data }: { data: R }) => { const o = { id: `o${++mem.seq}`, ...data }; mem.orders.push(o); return o; } },
  };
  db.$transaction = async (cb: (tx: unknown) => unknown) => cb(db);
  return { prisma: db };
});
vi.mock("@/lib/contracts/pdf", () => ({ htmlToPdf: async () => Buffer.from("%PDF-1.7 quote") }));
vi.mock("@/lib/emailSender", () => ({ emailSender: { send: async (m: R) => { mem.mails.push(m); } } }));
vi.mock("@/lib/customerMatch", () => ({ findOrCreateCustomer: async () => ({ id: "cust-new" }) }));
vi.mock("@/lib/orderData", () => ({ generateOrderNumber: async () => "ORD-2026-000009" }));
vi.mock("@/lib/contracts/service", () => ({ findCustomerByContact: async () => mem.customers[0] ?? null }));

import * as svc from "./service";
import { DEFAULT_CONFIG } from "./config";
import type { QuoteSnapshot } from "./snapshot";

const admin: svc.Actor = { type: "admin", id: "a1", name: "Layla" };
const body = (over: R = {}) => ({
  lang: "en", input: { units: [{ acType: "ducted-split", capacity: "3", packageKey: "standard", qty: 2 }], services: [{ key: "new-duct", qty: 1 }] },
  customer: { name: "Sara Ahmed", phone: "+971501234567", whatsapp: "", email: "Sara@Example.com", contactMethod: "whatsapp", preferredDate: "" },
  project: { propertyType: "villa", emirate: "Ajman", location: "Al Helio 2, Villa 14", floors: 2, existingDuct: "yes", existingCopper: "not-sure", ceilingType: "false", notes: "" }, ...over,
});
const make = async (over: R = {}) => { const r = await svc.createQuote(body(over), { ip: "1.2.3.4" }); if (!r.ok) throw new Error(r.error); return r.quote as unknown as R & { id: string; accessToken: string; number: string }; };
const snap = (q: R) => q.snapshot as QuoteSnapshot;
const get = (id: string) => mem.quotes.find((q) => q.id === id)!;

beforeEach(() => { for (const k of ["quotes", "versions", "events", "files", "orders", "customers", "mails"] as const) mem[k] = []; mem.settings = null; mem.seq = 0; });

describe("creating a quotation", () => {
  it("works the prices out on the SERVER, saves a numbered quotation with its first version and an unguessable link", async () => {
    const q = await make();
    expect(q.number).toBe(`OSTA-DQ-${new Date().getUTCFullYear()}-000001`); expect(String(q.accessToken)).toMatch(/^[A-Za-z0-9_-]{30,}$/);
    expect(q).toMatchObject({ status: "Generated", version: 1, subtotal: 1300, vatAmount: 65, total: 1365, rfq: true, email: "sara@example.com", customerName: "Sara Ahmed" });
    expect(snap(q).totals).toMatchObject({ baseTotal: 800, plenumTotal: 500, subtotal: 1300, total: 1365 }); expect(snap(q).totals.rfqItems).toHaveLength(1);
    expect(mem.versions).toHaveLength(1); expect(mem.events[0]).toMatchObject({ kind: "created", actorType: "customer" });
    expect((await make()).number.endsWith("000002")).toBe(true);
  });
  it("ignores any price the browser sends, and refuses bad details", async () => {
    const q = await make({ total: 1, subtotal: 1, input: { units: [{ acType: "ducted-split", capacity: "3", packageKey: "standard", qty: 1, price: 1 }], services: [] } });
    expect(q.total).toBe(682.5);
    for (const bad of [{ customer: { ...body().customer, phone: "12" } }, { customer: { ...body().customer, name: "S" } }, { project: { ...body().project, emirate: "Mars" } }, { project: { ...body().project, propertyType: "castle" } }, { input: { units: [], services: [] } }, { input: { units: [{ acType: "ducted-split", capacity: "8", packageKey: "standard", qty: 1 }], services: [] } }, { customer: { ...body().customer, preferredDate: "2020-01-01" } }]) {
      expect((await svc.createQuote(body(bad), { ip: "1.1.1.1" })).ok, JSON.stringify(bad).slice(0, 60)).toBe(false);
    }
  });
  it("attaches the files uploaded earlier under its upload key, and expires after the configured validity", async () => {
    const key = "a".repeat(32); await svc.saveUpload(Buffer.from("%PDF-1.4 drawing......"), "Plan 1.pdf", key, "h");
    const q = await make({ uploadKey: key });
    expect(mem.files[0]).toMatchObject({ quoteId: q.id }); expect(Math.round(((q.expiresAt as Date).getTime() - Date.now()) / 864e5)).toBe(DEFAULT_CONFIG.validityDays);
  });
  it("links an existing customer by phone or email", async () => {
    mem.customers = [{ id: "c-old" }]; expect((await make()).customerId).toBe("c-old");
  });
  it("builds the PDF and emails it afterwards, without ever failing the request", async () => {
    const q = await make(); await svc.afterCreate(q.id);
    expect(mem.mails[0]).toMatchObject({ to: ["sara@example.com"], adminCopy: false }); expect((mem.mails[0].attachments as { filename: string }[])[0].filename).toBe(`OSTA-Quotation-${q.number}.pdf`); expect(String(mem.mails[0].text)).toContain(`/quote/${q.accessToken}`);
  });
});

describe("the customer's own link", () => {
  it("shows the quotation and what they may do; a wrong link shows nothing", async () => {
    const q = await make(); const v = await svc.publicView(q.accessToken);
    expect(v).toMatchObject({ number: q.number, status: "Generated", canEdit: true, canSubmit: true, totals: { total: 1365 } }); expect(JSON.stringify(v)).not.toContain("internalNotes");
    expect(await svc.publicView("nope")).toBeNull(); expect(await svc.publicView("x".repeat(30))).toBeNull();
  });
  it("editing keeps a NEW version, works the prices out again, and leaves the old version on record", async () => {
    const q = await make();
    const r = await svc.editByCustomer(q.accessToken, body({ input: { units: [{ acType: "concealed", capacity: "5", packageKey: "complete", qty: 1 }], services: [] } }), { ip: "1.1.1.1" });
    expect(r).toMatchObject({ ok: true, version: 2 }); expect(get(q.id)).toMatchObject({ version: 2, total: 1785, status: "Generated" });
    expect(mem.versions.map((v) => [v.version, v.total])).toEqual([[1, 1365], [2, 1785]]); expect(mem.events.some((e) => e.kind === "edited")).toBe(true);
  });
  it("cannot be edited once the team is reviewing it, after a decision, or after the team revised the lines", async () => {
    const q = await make();
    for (const s of ["Under Review", "Accepted", "Rejected", "Converted to Order"]) { get(q.id).status = s; expect((await svc.editByCustomer(q.accessToken, body(), { ip: "1" })).ok, s).toBe(false); }
    get(q.id).status = "Generated"; get(q.id).snapshot = { ...snap(q), manual: true };
    expect(await svc.editByCustomer(q.accessToken, body(), { ip: "1" })).toMatchObject({ ok: false, error: expect.stringContaining("revised") });
  });
  it("Send to Osta and Book Installation tell the team but confirm nothing", async () => {
    const q = await make(); mem.mails = [];
    expect(await svc.submitByCustomer(q.accessToken, true)).toMatchObject({ ok: true });
    expect(get(q.id)).toMatchObject({ status: "Submitted", bookRequested: true }); expect(String(mem.mails[0].subject)).toContain("booking request"); expect(mem.orders).toHaveLength(0); // no order, no appointment
    expect((await svc.submitByCustomer(q.accessToken, false)).ok).toBe(false); // already with the team
  });
  it("a quotation that was only sent can still be turned into a booking request, once", async () => {
    const q = await make(); await svc.submitByCustomer(q.accessToken, false); mem.mails = [];
    expect(get(q.id).bookRequested).toBe(false); expect((await svc.publicView(q.accessToken as string))).toMatchObject({ canSubmit: false, canBook: true });
    expect((await svc.submitByCustomer(q.accessToken, false)).ok).toBe(false); // sending twice is refused
    expect(await svc.submitByCustomer(q.accessToken, true)).toMatchObject({ ok: true }); expect(get(q.id)).toMatchObject({ status: "Submitted", bookRequested: true }); expect(String(mem.mails[0].subject)).toContain("booking request");
    expect((await svc.submitByCustomer(q.accessToken, true)).ok).toBe(false); // and the booking only once
    expect((await svc.publicView(q.accessToken as string))).toMatchObject({ canBook: false }); expect(mem.orders).toHaveLength(0);
  });
  it("an expired quotation cannot be sent, but the customer can edit it to get a fresh one", async () => {
    const q = await make(); get(q.id).expiresAt = new Date(Date.now() - 864e5);
    expect(await svc.submitByCustomer(q.accessToken, false)).toMatchObject({ ok: false, error: expect.stringContaining("expired") });
    expect((await svc.editByCustomer(q.accessToken, body(), { ip: "1" })).ok).toBe(true); expect((get(q.id).expiresAt as Date).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("the team revises, decides and converts", () => {
  const lines = (q: R) => snap(q).lines.map((l) => (l.id === "s:new-duct" ? { ...l, unitPrice: 1800 } : l));
  it("a revised quotation is a new version with the lines the team set; the total is recomputed and the old version stays", async () => {
    const q = await make();
    expect((await svc.reviseByAdmin(q.id, admin, lines(q), "no")).ok).toBe(false);
    expect(await svc.reviseByAdmin(q.id, admin, lines(q), "Priced the duct after the site visit")).toMatchObject({ ok: true, version: 2 });
    expect(get(q.id)).toMatchObject({ status: "Revised", version: 2, subtotal: 3100, vatAmount: 155, total: 3255, rfq: false, lastEditedBy: "Layla" }); expect(snap(get(q.id)).manual).toBe(true);
    expect(mem.versions[0].total).toBe(1365); expect(mem.versions[1]).toMatchObject({ byType: "admin", byName: "Layla", reason: "Priced the duct after the site visit" });
    expect((await svc.reviseByAdmin(q.id, admin, [], "Emptying everything")).ok).toBe(false);
  });
  it("only allowed status changes are possible; rejecting needs a reason the customer sees", async () => {
    const q = await make();
    expect((await svc.setStatus(q.id, admin, "Converted to Order", "")).ok).toBe(false); expect((await svc.setStatus(q.id, admin, "Rejected", "no")).ok).toBe(false);
    expect((await svc.setStatus(q.id, admin, "Under Review", "")).ok).toBe(true); expect((await svc.setStatus(q.id, admin, "Site Inspection Required", "")).ok).toBe(true);
    mem.mails = []; expect((await svc.setStatus(q.id, admin, "Rejected", "Outside our service area")).ok).toBe(true);
    expect(get(q.id)).toMatchObject({ status: "Rejected", rejectionReason: "Outside our service area" }); expect(String(mem.mails.at(-1)!.text)).toContain("Outside our service area");
    expect((await svc.setStatus(q.id, admin, "Accepted", "")).ok).toBe(false); // must be reopened first
  });
  it("sending it to the customer marks it Sent, emails the PDF and prepares the WhatsApp message", async () => {
    const q = await make(); mem.mails = [];
    const r = await svc.sendToCustomer(q.id, admin, "Updated after inspection");
    expect(r).toMatchObject({ ok: true, emailed: true }); expect(r.ok && r.whatsapp).toContain("https://wa.me/971501234567"); expect(get(q.id).status).toBe("Sent");
    expect(String(mem.mails[0].text)).toContain("Updated after inspection"); expect((mem.mails[0].attachments as unknown[]).length).toBe(1);
    get(q.id).status = "Accepted"; expect((await svc.sendToCustomer(q.id, admin, "")).ok).toBe(false);
  });
  it("only an ACCEPTED quotation becomes an order, and that order is a request: not assigned, not scheduled, not confirmed", async () => {
    const q = await make();
    expect((await svc.convertToOrder(q.id, admin)).ok).toBe(false); expect(mem.orders).toHaveLength(0);
    await svc.setStatus(q.id, admin, "Accepted", "");
    const r = await svc.convertToOrder(q.id, admin);
    expect(r).toMatchObject({ ok: true, orderNumber: "ORD-2026-000009" });
    expect(mem.orders[0]).toMatchObject({ status: "Requested", customerId: "cust-new", priceAgreed: "Yes", leadSource: "Website", createdById: "a1" }); expect(mem.orders[0].assignedToId).toBeUndefined(); expect(mem.orders[0].scheduledAt).toBeUndefined();
    expect(String(mem.orders[0].notes)).toContain(String(q.number)); expect(String(mem.orders[0].notes)).toContain("total incl. VAT AED 1,365");
    expect(get(q.id)).toMatchObject({ status: "Converted to Order", orderId: mem.orders[0].id }); expect((await svc.convertToOrder(q.id, admin)).ok).toBe(false); // once
  });
  it("internal notes are kept for the team only", async () => {
    const q = await make(); expect((await svc.addNote(q.id, admin, "x")).ok).toBe(false); expect((await svc.addNote(q.id, admin, "Call after 5pm")).ok).toBe(true);
    expect(String(get(q.id).internalNotes)).toContain("Layla"); expect(JSON.stringify(await svc.publicView(q.accessToken as string))).not.toContain("Call after 5pm");
  });
});

describe("uploaded files", () => {
  const key = "b".repeat(32);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
  it("are judged by what they really are, not by their name", () => {
    expect(svc.sniffFile(Buffer.from("%PDF-1.7 abcdefgh"))?.ext).toBe("pdf"); expect(svc.sniffFile(png)?.ext).toBe("png"); expect(svc.sniffFile(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]))?.ext).toBe("jpg");
    expect(svc.sniffFile(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(8)]))?.ext).toBe("webp");
    expect(svc.sniffFile(Buffer.from("MZ\x90\x00 this is an executable"))).toBeNull(); expect(svc.sniffFile(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull(); expect(svc.sniffFile(Buffer.alloc(3))).toBeNull();
  });
  it("accepts only PDF/JPG/PNG/WebP, renames them safely, and stops at the size and count limits", async () => {
    expect(await svc.saveUpload(Buffer.from("MZ\x90\x00 executable bytes here"), "virus.pdf", key, "h")).toMatchObject({ ok: false });
    const ok = await svc.saveUpload(png, "../../etc/passwd<script>.exe", key, "h"); expect(ok).toMatchObject({ ok: true }); expect(ok.ok && ok.name).toMatch(/^[\p{L}\p{N} _.-]+\.png$/u); expect(ok.ok && ok.name).not.toContain("/");
    expect(await svc.saveUpload(Buffer.concat([png, Buffer.alloc(9 * 1024 * 1024)]), "big.png", key, "h")).toMatchObject({ ok: false, error: expect.stringContaining("MB") });
    for (let i = 0; i < 7; i++) await svc.saveUpload(png, `p${i}.png`, key, "h");
    expect(await svc.saveUpload(png, "ninth.png", key, "h")).toMatchObject({ ok: false, error: expect.stringContaining("up to 8") });
    expect(await svc.saveUpload(png, "x.png", "not a key", "h")).toMatchObject({ ok: false });
  });
  it("files nobody attached are cleared after a day", async () => {
    mem.files = [{ id: "old", quoteId: null, uploadKey: "c".repeat(32), createdAt: new Date(Date.now() - 2 * 864e5) }];
    await svc.saveUpload(png, "new.png", key, "h"); expect(mem.files.some((f) => f.id === "old")).toBe(false);
  });
});

describe("the price list settings", () => {
  it("are checked before they are saved, and what is saved is what new quotations use", async () => {
    expect(await svc.saveConfig({ ...DEFAULT_CONFIG, vatPercent: 500 }, "Layla")).toMatchObject({ ok: false });
    expect(await svc.saveConfig({ ...DEFAULT_CONFIG, capacities: [...DEFAULT_CONFIG.capacities, DEFAULT_CONFIG.capacities[0]] }, "Layla")).toMatchObject({ ok: false, error: expect.stringContaining("share") });
    const raised = { ...DEFAULT_CONFIG, capacities: DEFAULT_CONFIG.capacities.map((c) => (c.key === "3" ? { ...c, prices: { ...c.prices, standard: 500 } } : c)) };
    expect((await svc.saveConfig(raised, "Layla")).ok).toBe(true);
    const first = await make(); expect(first.subtotal).toBe(1000 + 500); // 2 × (500 + 250)
    expect(snap(first).totals.baseTotal).toBe(1000);
  });
  it("an earlier quotation keeps the prices it was issued with after the price list changes", async () => {
    const before = await make(); expect(before.total).toBe(1365);
    await svc.saveConfig({ ...DEFAULT_CONFIG, plenum: { ...DEFAULT_CONFIG.plenum, price: 400 } }, "Layla");
    expect(get(before.id).total).toBe(1365); expect(snap(get(before.id)).totals.plenumTotal).toBe(500);
    expect((await make()).total).toBe(1680); // new quotations use the new price: 2 × (400 + 400) = 1,600, plus 5% VAT
  });
});
