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
      create: async ({ data }: { data: R }) => { const q = { id: `q${++mem.seq}`, version: 1, createdAt: new Date(), internalNotes: "", rejectionReason: "", bookRequested: false, kind: "ac-install", ...data }; mem.quotes.push(q); return q; },
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

import * as split from "./service";
import * as ac from "@/lib/acquote/service";
import * as duct from "@/lib/ductwork/service";
import { adminNextFor } from "@/lib/acquote/status";
import { DEFAULT_CONFIG } from "./config";
import type { SplitSnapshot } from "./snapshot";

const admin: ac.Actor = { type: "admin", id: "a1", name: "Layla" };
const body = (over: R = {}) => ({
  lang: "en", input: { units: [{ capacity: "1.5", packageKey: "standard", qty: 2 }, { capacity: "3", packageKey: "premium", qty: 1 }], services: [] },
  customer: { name: "Sara Ahmed", phone: "+971501234567", email: "Sara@Example.com" },
  project: { propertyType: "villa", emirate: "Ajman", location: "Al Helio 2", address: "Villa 14, Street 3", notes: "Second floor" }, ...over,
});
const make = async (over: R = {}) => { const r = await split.createSplitQuote(body(over), { ip: "1.2.3.4" }); if (!r.ok) throw new Error(r.error); return r.quote as unknown as R & { id: string; accessToken: string; number: string }; };
const snap = (q: R) => q.snapshot as SplitSnapshot;
const get = (id: string) => mem.quotes.find((q) => q.id === id)!;

beforeEach(() => { for (const k of ["quotes", "versions", "events", "files", "orders", "customers", "mails"] as const) mem[k] = []; mem.settings = null; mem.seq = 0; });

describe("creating a split AC quotation", () => {
  it("works the prices out on the SERVER, saves a numbered quotation with its first version and a private link", async () => {
    const q = await make();
    expect(q.number).toBe(`OSTA-SQ-${new Date().getUTCFullYear()}-000001`); expect(String(q.accessToken)).toMatch(/^[A-Za-z0-9_-]{30,}$/);
    // 2 x 175 + 950 = 1,300 ; VAT 65 ; total 1,365
    expect(q).toMatchObject({ kind: "split-ac", status: "Generated", version: 1, subtotal: 1300, vatAmount: 65, total: 1365, rfq: false, email: "sara@example.com", emirate: "Ajman", propertyType: "villa" });
    expect(snap(q).totals.unitCount).toBe(3); expect(mem.versions).toHaveLength(1); expect(mem.events[0]).toMatchObject({ kind: "created", actorType: "customer" });
    expect((await make()).number.endsWith("000002")).toBe(true);
  });
  it("ignores any price the browser sends and refuses bad details", async () => {
    const q = await make({ total: 1, input: { units: [{ capacity: "1", packageKey: "standard", qty: 1, price: 1 }], services: [] } }); expect(q.total).toBe(157.5);
    for (const bad of [{ customer: { ...body().customer, phone: "12" } }, { customer: { ...body().customer, name: "S" } }, { project: { ...body().project, emirate: "Mars" } }, { project: { ...body().project, propertyType: "castle" } }, { project: { ...body().project, address: "" } }, { input: { units: [], services: [] } }, { input: { units: [{ capacity: "9", packageKey: "standard", qty: 1 }], services: [] } }])
      expect((await split.createSplitQuote(body(bad), { ip: "1.1.1.1" })).ok, JSON.stringify(bad).slice(0, 60)).toBe(false);
  });
  it("keeps only the packages the customer selected in the quotation, and freezes them", async () => {
    const q = await make(); expect(snap(q).packages.map((p) => p.key)).toEqual(["standard", "premium"]);
    await split.saveConfig({ ...DEFAULT_CONFIG, packages: DEFAULT_CONFIG.packages.map((p) => ({ ...p, prices: Object.fromEntries(Object.keys(p.prices).map((k) => [k, 9999])) })) }, "A");
    expect(get(q.id).total).toBe(1365); expect(snap(q).lines[0].unitPrice).toBe(175);
  });
  it("builds the PDF and emails it in the customer's language without ever failing the request", async () => {
    const q = await make({ lang: "ar" }); await split.afterCreateSplit(q.id);
    expect(mem.mails[0]).toMatchObject({ to: ["sara@example.com"], adminCopy: false }); expect((mem.mails[0].attachments as { filename: string }[])[0].filename).toBe(`OSTA-Split-AC-Quotation-${q.number}-AR.pdf`); expect(String(mem.mails[0].text)).toContain(`/split-quote/${q.accessToken}`);
  });
});

describe("the customer's own link", () => {
  it("shows the quotation to its owner only; the calculators never open each other's links", async () => {
    const q = await make(); const v = await split.publicSplitView(q.accessToken);
    expect(v).toMatchObject({ number: q.number, status: "Generated", canEdit: true, canBook: true, totals: { total: 1365 } });
    expect(await split.publicSplitView("nope")).toBeNull(); expect(await ac.publicView(q.accessToken)).toBeNull(); expect(await duct.publicDuctView(q.accessToken)).toBeNull();
    mem.quotes.push({ id: "d1", kind: "ductwork", accessToken: "D".repeat(30), status: "Generated", expiresAt: new Date(Date.now() + 864e5), snapshot: {}, project: {} }); expect(await split.publicSplitView("D".repeat(30))).toBeNull();
  });
  it("editing keeps a NEW version, recomputes everything and keeps the original on record", async () => {
    const q = await make(); const r = await split.editSplitByCustomer(q.accessToken, body({ input: { units: [{ capacity: "5", packageKey: "complete", qty: 1 }], services: [] } }), { ip: "1.1.1.1" });
    expect(r).toMatchObject({ ok: true, version: 2 }); expect(get(q.id)).toMatchObject({ version: 2, total: 1155, status: "Generated" }); expect(mem.versions.map((v) => [v.version, v.total])).toEqual([[1, 1365], [2, 1155]]);
  });
  it("cannot be edited once decided or after the team revised it", async () => {
    const q = await make(); for (const s of ["Accepted", "Rejected", "Converted to Order"]) { get(q.id).status = s; expect((await split.editSplitByCustomer(q.accessToken, body(), { ip: "1" })).ok, s).toBe(false); }
    get(q.id).status = "Generated"; get(q.id).snapshot = { ...snap(q), manual: true }; expect(await split.editSplitByCustomer(q.accessToken, body(), { ip: "1" })).toMatchObject({ ok: false, error: expect.stringContaining("revised") });
  });
  it("Request Booking tells the team but confirms nothing, and works once", async () => {
    const q = await make(); mem.mails = [];
    expect(await split.requestBooking(q.accessToken)).toMatchObject({ ok: true }); expect(get(q.id)).toMatchObject({ status: "Submitted", bookRequested: true }); expect(String(mem.mails[0].subject)).toContain("booking request"); expect(mem.orders).toHaveLength(0);
    expect((await split.requestBooking(q.accessToken)).ok).toBe(false); expect(await split.publicSplitView(q.accessToken)).toMatchObject({ canBook: false });
  });
  it("an expired quotation cannot be booked, but can be edited into a fresh one", async () => {
    const q = await make(); get(q.id).expiresAt = new Date(Date.now() - 864e5);
    expect(await split.requestBooking(q.accessToken)).toMatchObject({ ok: false, error: expect.stringContaining("expired") });
    expect((await split.editSplitByCustomer(q.accessToken, body(), { ip: "1" })).ok).toBe(true); expect((get(q.id).expiresAt as Date).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("the team", () => {
  it("edits the lines into a new version and keeps the original", async () => {
    const q = await make(); const lines = snap(q).lines.map((l) => ({ ...l, unitPrice: 160 }));
    expect(await ac.reviseByAdmin(q.id, admin, lines, "no")).toMatchObject({ ok: false });
    expect(await ac.reviseByAdmin(q.id, admin, lines, "Agreed rate by phone")).toMatchObject({ ok: true, version: 2 });
    expect(get(q.id)).toMatchObject({ status: "Revised", version: 2, subtotal: 480, total: 504 }); expect(snap(get(q.id)).manual).toBe(true);
    expect(mem.versions.map((v) => [v.version, v.total])).toEqual([[1, 1365], [2, 504]]); expect(((mem.versions[0].snapshot as SplitSnapshot).lines[0]).unitPrice).toBe(175);
  });
  it("uses the Split AC statuses only, and the Draft, Generated, Sent, Accepted, Rejected and Expired flow", async () => {
    expect(adminNextFor("split-ac", "Generated")).toEqual(["Sent", "Accepted", "Rejected"]); expect(adminNextFor("split-ac", "Accepted")).toEqual(["Rejected"]); expect(adminNextFor("split-ac", "Converted to Order")).toEqual([]);
    const q = await make(); expect(await ac.setStatus(q.id, admin, "Under Review", "")).toMatchObject({ ok: false }); expect(await ac.setStatus(q.id, admin, "Rejected", "no")).toMatchObject({ ok: false });
    expect(await ac.setStatus(q.id, admin, "Rejected", "Customer chose another company")).toMatchObject({ ok: true }); expect(await ac.setStatus(q.id, admin, "Generated", "")).toMatchObject({ ok: true });
  });
  it("sends the quotation with its PDF, accepts it and converts it to a service order request only once accepted", async () => {
    const q = await make(); mem.mails = [];
    expect(await ac.convertToOrder(q.id, admin)).toMatchObject({ ok: false });
    const sent = await ac.sendToCustomer(q.id, admin, "Please review"); expect(sent).toMatchObject({ ok: true, emailed: true });
    expect((mem.mails[0].attachments as { filename: string }[])[0].filename).toBe(`OSTA-Split-AC-Quotation-${q.number}.pdf`); expect(String(sent.ok && sent.whatsapp)).toContain(encodeURIComponent("/split-quote/"));
    expect(await ac.setStatus(q.id, admin, "Accepted", "")).toMatchObject({ ok: true });
    const c = await ac.convertToOrder(q.id, admin); expect(c).toMatchObject({ ok: true, orderNumber: "ORD-2026-000009" });
    expect(get(q.id)).toMatchObject({ status: "Converted to Order", orderId: expect.any(String) }); expect(mem.orders[0]).toMatchObject({ status: "Requested" }); expect(String(mem.orders[0].notes)).toContain("Villa 14");
    expect(await ac.reviseByAdmin(q.id, admin, snap(get(q.id)).lines, "Too late now")).toMatchObject({ ok: false });
  });
  it("duplicates a quotation as a new draft with its own number and link, leaving the original untouched", async () => {
    const q = await make(); const before = JSON.stringify(get(q.id).snapshot);
    const d = await ac.duplicateQuote(q.id, admin); expect(d).toMatchObject({ ok: true, number: expect.stringMatching(/-SQ-.*000002$/) });
    const copy = mem.quotes.find((x) => x.id === (d.ok ? d.id : ""))!; expect(copy).toMatchObject({ kind: "split-ac", status: "Draft", version: 1, total: 1365, customerName: "Sara Ahmed" }); expect(copy.accessToken).not.toBe(q.accessToken);
    expect(JSON.stringify(get(q.id).snapshot)).toBe(before); expect(mem.versions.at(-1)).toMatchObject({ reason: expect.stringContaining("Duplicated from") });
  });
  it("saves the pricing only when it is complete and valid", async () => {
    expect(await split.saveConfig({ ...DEFAULT_CONFIG, vatPercent: 500 }, "A")).toMatchObject({ ok: false });
    expect(await split.saveConfig({ ...DEFAULT_CONFIG, packages: [DEFAULT_CONFIG.packages[0], DEFAULT_CONFIG.packages[0]] }, "A")).toMatchObject({ ok: false });
    expect(await split.saveConfig({ ...DEFAULT_CONFIG, packages: DEFAULT_CONFIG.packages.map((p) => (p.key === "premium" ? { ...p, prices: { "1": 600 } } : p)) }, "A")).toMatchObject({ ok: false, error: expect.stringContaining("set a price") });
    expect(await split.saveConfig({ ...DEFAULT_CONFIG, packages: DEFAULT_CONFIG.packages.map((p) => ({ ...p, active: false })) }, "A")).toMatchObject({ ok: false });
    const added = { ...DEFAULT_CONFIG.packages[0], key: "basic-plus", nameEn: "Basic Plus", active: true };
    expect(await split.saveConfig({ ...DEFAULT_CONFIG, packages: [...DEFAULT_CONFIG.packages, added] }, "A")).toMatchObject({ ok: true }); expect((await split.loadConfig()).packages).toHaveLength(4);
  });
});
