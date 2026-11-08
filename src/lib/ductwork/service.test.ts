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

import * as duct from "./service";
import * as ac from "@/lib/acquote/service";
import { DEFAULT_CONFIG, type DuctConfig } from "./config";
import type { DuctSnapshot } from "./snapshot";

const admin: ac.Actor = { type: "admin", id: "a1", name: "Layla" };
const section = (over: R = {}) => ({ id: "s1", method: "area", system: "gi", mode: "supply-fabricate-install", area: 100, sections: 4, ...over });
const body = (over: R = {}) => ({
  lang: "en", input: { sections: [section()], accessories: [], services: [] }, spec: {},
  customer: { name: "Omar Khalid", company: "Khalid Contracting", phone: "+971501234567", email: "Omar@Example.com" },
  project: { projectType: "commercial", emirate: "Sharjah", location: "Industrial Area 4", projectName: "Warehouse B", siteAddress: "Plot 12, Industrial Area 4", description: "Supply duct for a new warehouse" }, ...over,
});
const make = async (over: R = {}) => { const r = await duct.createDuctQuote(body(over), { ip: "1.2.3.4" }); if (!r.ok) throw new Error(r.error); return r.quote as unknown as R & { id: string; accessToken: string; number: string }; };
const snap = (q: R) => q.snapshot as DuctSnapshot;
const get = (id: string) => mem.quotes.find((q) => q.id === id)!;
const priced = (): DuctConfig => ({
  ...DEFAULT_CONFIG,
  accessories: DEFAULT_CONFIG.accessories.map((a) => (a.key === "supply-diffuser" ? { ...a, prices: { PCS: 250 } } : a)),
  services: DEFAULT_CONFIG.services.map((s) => (s.key === "site-measurement" ? { ...s, price: 500, rfq: false } : s)),
});

beforeEach(() => { for (const k of ["quotes", "versions", "events", "files", "orders", "customers", "mails"] as const) mem[k] = []; mem.settings = null; mem.seq = 0; });

describe("creating a ductwork quotation", () => {
  it("works the areas and prices out on the SERVER and saves a numbered quotation, its first version and an unguessable link", async () => {
    const q = await make();
    expect(q.number).toBe(`OSTA-DW-${new Date().getUTCFullYear()}-000001`); expect(String(q.accessToken)).toMatch(/^[A-Za-z0-9_-]{30,}$/);
    // 100 m2 GI at the configured 130 = 13,000; VAT 5% once = 650
    expect(q).toMatchObject({ kind: "ductwork", status: "Generated", version: 1, subtotal: 13000, vatAmount: 650, total: 13650, rfq: false, email: "omar@example.com", customerName: "Omar Khalid", emirate: "Sharjah" });
    expect(snap(q).totals).toMatchObject({ totalArea: 100, ductSubtotal: 13000 }); expect(mem.versions).toHaveLength(1); expect(mem.events[0]).toMatchObject({ kind: "created", actorType: "customer" });
    expect((await make()).number.endsWith("000002")).toBe(true);
  });
  it("computes rectangular and circular sections itself, and ignores any price or area the browser sends", async () => {
    const q = await make({ total: 1, input: { sections: [section({ id: "a", method: "rect", area: 1, price: 1, widthMm: 500, heightMm: 300, lengthM: 10, qty: 2 }), section({ id: "b", method: "round", system: "pir", diameterMm: 400, lengthM: 5, qty: 1 })], accessories: [], services: [] } });
    // rect: 2 x (0.5+0.3) x 10 x 2 = 32 m2 -> 4,160 ; round: PI x 0.4 x 5 = 6.28 m2 -> 1,004.8
    expect(snap(q).totals.totalArea).toBe(38.28); expect(q.subtotal).toBe(5164.8);
  });
  it("adds priced accessories and services, keeps unpriced ones out of the totals as 'request for quotation'", async () => {
    await duct.saveConfig(priced(), "Admin");
    const q = await make({ input: { sections: [section()], accessories: [{ key: "supply-diffuser", unit: "PCS", qty: 4 }, { key: "fire-damper", unit: "PCS", qty: 2 }], services: [{ key: "site-measurement", qty: 1 }] } });
    expect(q).toMatchObject({ subtotal: 14500, vatAmount: 725, total: 15225, rfq: true }); expect(snap(q).totals.rfqItems.map((i) => i.en)).toEqual(["Fire Damper"]);
  });
  it("refuses a work mode the administrator has not offered, an unknown system, bad details and a missing project", async () => {
    for (const bad of [
      { input: { sections: [section({ mode: "install-only" })], accessories: [], services: [] } }, { input: { sections: [section({ system: "nope" })], accessories: [], services: [] } },
      { input: { sections: [], accessories: [], services: [] } }, { input: { sections: [section({ area: 0 })], accessories: [], services: [] } },
      { customer: { ...body().customer, phone: "12" } }, { project: { ...body().project, emirate: "Mars" } }, { project: { ...body().project, projectType: "castle" } }, { project: { ...body().project, description: "" } },
      { spec: { completionDate: "2020-01-01" } },
    ]) expect((await duct.createDuctQuote(body(bad), { ip: "1.1.1.1" })).ok, JSON.stringify(bad).slice(0, 70)).toBe(false);
  });
  it("freezes what it says: a later price or text change never alters an issued quotation", async () => {
    const q = await make(); await duct.saveConfig({ ...DEFAULT_CONFIG, systems: DEFAULT_CONFIG.systems.map((s) => (s.key === "gi" ? { ...s, modes: { ...s.modes, "supply-fabricate-install": { enabled: true, rate: 999 } } } : s)) }, "Admin");
    expect(get(q.id)).toMatchObject({ total: 13650 }); expect(snap(q).lines[0].unitPrice).toBe(130);
    expect((await duct.publicDuctView(q.accessToken))?.totals.total).toBe(13650);
  });
  it("marks specifications the customer left blank or 'not sure' as subject to technical review, and preselects nothing", async () => {
    const q = await make({ spec: { gauge: "not-sure", indoorOutdoor: "indoor" } });
    expect(snap(q).review.map((r) => r.key)).toEqual(expect.arrayContaining(["gauge", "pressure", "application"])); expect(snap(q).review.map((r) => r.key)).not.toContain("indoorOutdoor");
    expect(snap(q).specRows.find((r) => r.labelEn.includes("gauge"))).toMatchObject({ confirmed: false });
  });
  it("attaches the drawings and BOQ uploaded earlier, with their category", async () => {
    const key = "b".repeat(32);
    expect((await duct.saveDuctUpload(Buffer.from("%PDF-1.4 mechanical drawing"), "Plan 1.pdf", key, "drawing", "h")).ok).toBe(true);
    expect((await duct.saveDuctUpload(Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.alloc(40)]), "BOQ final.xlsx", key, "boq", "h")).ok).toBe(true);
    const q = await make({ uploadKey: key });
    expect(mem.files.map((f) => [f.quoteId, f.category])).toEqual([[q.id, "drawing"], [q.id, "boq"]]); expect(snap(q).files.map((f) => f.category)).toEqual(["drawing", "boq"]);
  });
  it("builds the PDF and emails it (in the customer's language) without ever failing the request", async () => {
    const q = await make({ lang: "ar" }); await duct.afterCreateDuct(q.id);
    expect(mem.mails[0]).toMatchObject({ to: ["omar@example.com"], adminCopy: false });
    expect((mem.mails[0].attachments as { filename: string }[])[0].filename).toBe(`OSTA-Ductwork-Quotation-${q.number}-AR.pdf`); expect(String(mem.mails[0].text)).toContain(`/duct-quote/${q.accessToken}`);
  });
});

describe("files", () => {
  const key = "c".repeat(32);
  it("judges a file by its real bytes: PDF, images, XLSX, XLS and DWG pass; everything else is refused", async () => {
    const ok = [[Buffer.from("%PDF-1.4 drawing"), "a.pdf"], [Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(20).fill(0)]), "a.jpg"], [Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.alloc(40)]), "a.xlsx"], [Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(40)]), "a.xls"], [Buffer.from("AC1027" + "\0".repeat(30)), "a.dwg"]] as [Buffer, string][];
    for (const [b, n] of ok) expect(duct.sniffDuctFile(b, n), n).not.toBeNull();
    for (const [b, n] of [[Buffer.from("MZ" + "x".repeat(40)), "virus.pdf"], [Buffer.from("<script>alert(1)</script>".padEnd(40)), "a.pdf"], [Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.alloc(40)]), "a.exe"], [Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.from("vbaProject"), Buffer.alloc(40)]), "macro.xlsx"], [Buffer.from("AC1027" + "\0".repeat(30)), "a.txt"]] as [Buffer, string][]) expect(duct.sniffDuctFile(b, n), n).toBeNull();
  });
  it("needs a category, respects the file count and size limits, and rejects an invalid upload key", async () => {
    const pdf = Buffer.from("%PDF-1.4 drawing......");
    expect((await duct.saveDuctUpload(pdf, "a.pdf", key, "", "h")).ok).toBe(false); expect((await duct.saveDuctUpload(pdf, "a.pdf", "short", "boq", "h")).ok).toBe(false);
    for (let i = 0; i < DEFAULT_CONFIG.uploads.maxFiles; i++) expect((await duct.saveDuctUpload(pdf, `p${i}.pdf`, key, "drawing", "h")).ok).toBe(true);
    expect(await duct.saveDuctUpload(pdf, "one-more.pdf", key, "drawing", "h")).toMatchObject({ ok: false });
    expect(await duct.saveDuctUpload(Buffer.concat([pdf, Buffer.alloc(16 * 1024 * 1024)]), "big.pdf", "d".repeat(32), "boq", "h")).toMatchObject({ ok: false });
  });
});

describe("the customer's own link", () => {
  it("shows the quotation to its owner only; AC and ductwork links never open each other", async () => {
    const q = await make(); const v = await duct.publicDuctView(q.accessToken);
    expect(v).toMatchObject({ number: q.number, status: "Generated", canEdit: true, canSubmit: true, totals: { total: 13650 } }); expect(JSON.stringify(v)).not.toContain("internalNotes");
    expect(await duct.publicDuctView("nope")).toBeNull(); expect(await ac.publicView(q.accessToken)).toBeNull();
    expect(await ac.submitByCustomer(q.accessToken, false)).toMatchObject({ ok: false }); expect((await ac.editByCustomer(q.accessToken, {}, { ip: "1" })).ok).toBe(false);
    mem.quotes.push({ id: "ac1", kind: "ac-install", accessToken: "A".repeat(30), status: "Generated", expiresAt: new Date(Date.now() + 864e5), snapshot: {}, project: {} }); expect(await duct.publicDuctView("A".repeat(30))).toBeNull();
  });
  it("editing keeps a NEW version, recomputes everything and keeps the old version on record", async () => {
    const q = await make();
    const r = await duct.editDuctByCustomer(q.accessToken, body({ input: { sections: [section({ system: "pir", area: 50 })], accessories: [], services: [] } }), { ip: "1.1.1.1" });
    expect(r).toMatchObject({ ok: true, version: 2 }); expect(get(q.id)).toMatchObject({ version: 2, total: 8400, status: "Generated" });
    expect(mem.versions.map((v) => [v.version, v.total])).toEqual([[1, 13650], [2, 8400]]);
  });
  it("cannot be edited once the team is reviewing it, after a decision, or after the team revised the lines", async () => {
    const q = await make();
    for (const s of ["Under Technical Review", "Accepted", "Rejected", "Converted to Project"]) { get(q.id).status = s; expect((await duct.editDuctByCustomer(q.accessToken, body(), { ip: "1" })).ok, s).toBe(false); }
    get(q.id).status = "Generated"; get(q.id).snapshot = { ...snap(q), manual: true };
    expect(await duct.editDuctByCustomer(q.accessToken, body(), { ip: "1" })).toMatchObject({ ok: false, error: expect.stringContaining("revised") });
  });
  it("the three requests tell the team but confirm nothing", async () => {
    for (const type of ["inspection", "final", "inquiry"] as const) {
      const q = await make(); mem.mails = [];
      expect(await duct.submitDuct(q.accessToken, type)).toMatchObject({ ok: true });
      expect(get(q.id)).toMatchObject({ status: "Submitted", requestType: type }); expect(mem.orders).toHaveLength(0);
      expect(String(mem.mails[0].subject)).toContain({ inspection: "Site inspection requested", final: "Final quotation requested", inquiry: "Project inquiry submitted" }[type]);
      expect((await duct.submitDuct(q.accessToken, type)).ok).toBe(false); // the same request twice is refused
    }
  });
  it("a quotation already sent can still carry a different request, and an expired one cannot be submitted", async () => {
    const q = await make(); await duct.submitDuct(q.accessToken, "inquiry");
    expect(await duct.submitDuct(q.accessToken, "inspection")).toMatchObject({ ok: true }); expect(get(q.id).requestType).toBe("inspection");
    const e = await make(); get(e.id).expiresAt = new Date(Date.now() - 864e5);
    expect(await duct.submitDuct(e.accessToken, "final")).toMatchObject({ ok: false, error: expect.stringContaining("expired") });
    expect((await duct.editDuctByCustomer(e.accessToken, body(), { ip: "1" })).ok).toBe(true); expect((get(e.id).expiresAt as Date).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("the team", () => {
  it("revises the lines into a new version, recomputing the totals, and refuses a revision with no ductwork line", async () => {
    const q = await make(); const lines = snap(q).lines.map((l) => ({ ...l, unitPrice: 120 }));
    expect(await ac.reviseByAdmin(q.id, admin, lines, "no")).toMatchObject({ ok: false });
    expect(await ac.reviseByAdmin(q.id, admin, lines, "Negotiated rate for 100 m2")).toMatchObject({ ok: true, version: 2 });
    expect(get(q.id)).toMatchObject({ status: "Revised", version: 2, subtotal: 12000, total: 12600 }); expect(snap(get(q.id)).manual).toBe(true);
    expect(await ac.reviseByAdmin(q.id, admin, [{ ...lines[0], kind: "service" }], "Remove the ductwork")).toMatchObject({ ok: false });
  });
  it("moves through the ductwork statuses; the review step is 'Under Technical Review'", async () => {
    const q = await make(); await duct.submitDuct(q.accessToken, "final");
    expect(await ac.setStatus(q.id, admin, "Under Review", "")).toMatchObject({ ok: false });
    expect(await ac.setStatus(q.id, admin, "Under Technical Review", "")).toMatchObject({ ok: true });
    expect(await ac.setStatus(q.id, admin, "Site Inspection Required", "Visit on Tuesday")).toMatchObject({ ok: true });
    expect(await ac.setStatus(q.id, admin, "Rejected", "no")).toMatchObject({ ok: false });
    expect(await ac.setStatus(q.id, admin, "Converted to Project", "")).toMatchObject({ ok: false });
  });
  it("sends the quotation with the PDF, accepts it, and turns it into a project / work order request only once accepted", async () => {
    const q = await make(); mem.mails = [];
    expect(await ac.convertToOrder(q.id, admin)).toMatchObject({ ok: false });
    const sent = await ac.sendToCustomer(q.id, admin, "Please review"); expect(sent).toMatchObject({ ok: true, emailed: true });
    expect(String(sent.ok && sent.whatsapp)).toContain(encodeURIComponent("/duct-quote/")); expect((mem.mails[0].attachments as { filename: string }[])[0].filename).toBe(`OSTA-Ductwork-Quotation-${q.number}.pdf`);
    expect(await ac.convertToOrder(q.id, admin)).toMatchObject({ ok: false });
    expect(await ac.setStatus(q.id, admin, "Accepted", "")).toMatchObject({ ok: true }); expect(String(mem.mails.at(-1)?.text)).toContain("next steps");
    const c = await ac.convertToOrder(q.id, admin); expect(c).toMatchObject({ ok: true, orderNumber: "ORD-2026-000009" });
    expect(get(q.id)).toMatchObject({ status: "Converted to Project", orderId: expect.any(String) }); expect(mem.orders[0]).toMatchObject({ status: "Requested" });
    expect(String(mem.orders[0].notes)).toContain("100 m²"); expect(String(mem.orders[0].notes)).toContain("Warehouse B");
    expect(await ac.reviseByAdmin(q.id, admin, snap(get(q.id)).lines, "Too late now")).toMatchObject({ ok: false });
  });
  it("saves the pricing only when it is valid", async () => {
    expect(await duct.saveConfig({ ...DEFAULT_CONFIG, vatPercent: 500 }, "A")).toMatchObject({ ok: false });
    expect(await duct.saveConfig({ ...DEFAULT_CONFIG, systems: [DEFAULT_CONFIG.systems[0], DEFAULT_CONFIG.systems[0]] }, "A")).toMatchObject({ ok: false });
    expect(await duct.saveConfig({ ...DEFAULT_CONFIG, accessories: [{ ...DEFAULT_CONFIG.accessories[0], units: [] }] }, "A")).toMatchObject({ ok: false });
    expect(await duct.saveConfig(priced(), "A")).toMatchObject({ ok: true }); expect((await duct.loadConfig()).accessories[0].prices.PCS).toBe(250);
  });
});
