import { describe, it, expect, vi, beforeEach } from "vitest";

// A tiny in-memory stand-in for the database, just enough for the agreement workflow.
const mem = vi.hoisted(() => {
  const t = { contracts: [] as Record<string, unknown>[], events: [] as Record<string, unknown>[], docs: [] as Record<string, unknown>[], subs: {} as Record<string, Record<string, unknown>>, invoices: [] as Record<string, unknown>[], payments: [] as Record<string, unknown>[], mails: [] as Record<string, unknown>[], seq: 0, customers: [] as Record<string, unknown>[] };
  return t;
});
const match = (row: Record<string, unknown>, where: Record<string, unknown>) => Object.entries(where).every(([k, v]) => (v && typeof v === "object" && "startsWith" in (v as object) ? String(row[k] ?? "").startsWith((v as { startsWith: string }).startsWith) : row[k] === v));
const sortDesc = (rows: Record<string, unknown>[], by: string) => [...rows].sort((a, b) => String(b[by]).localeCompare(String(a[by])));
vi.mock("@/lib/prisma", () => {
  const db: Record<string, unknown> = {
    contract: {
      findUnique: async ({ where, include }: { where: Record<string, unknown>; include?: unknown }) => { const r = mem.contracts.find((c) => match(c, where)); return r ? { ...r, ...(include ? { events: mem.events.filter((e) => e.contractId === r.id) } : {}) } : null; },
      findFirst: async ({ where, orderBy }: { where: Record<string, unknown>; orderBy?: Record<string, string> }) => { const rows = mem.contracts.filter((c) => match(c, where)); const k = orderBy ? Object.keys(orderBy)[0] : ""; return (k ? sortDesc(rows, k) : rows)[0] ?? null; },
      create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: `c${++mem.seq}`, version: 1, paymentStatus: "unpaid", invoiceId: null, adminNotes: "", rejectionReason: "", approvedAt: null, activationDate: null, expiryDate: null, paidAt: null, createdAt: new Date(), ...data }; mem.contracts.push(r); return r; },
      update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => { const r = mem.contracts.find((c) => match(c, where))!; Object.assign(r, data); return r; },
    },
    contractAddendum: { findFirst: async () => null },
    contractEvent: { create: async ({ data }: { data: Record<string, unknown> }) => { mem.events.push(data); return data; } },
    contractDocument: { create: async ({ data }: { data: Record<string, unknown> }) => { const d = { id: `d${++mem.seq}`, createdAt: new Date(), ...data }; mem.docs.push(d); return d; }, findFirst: async ({ where }: { where: Record<string, unknown> }) => sortDesc(mem.docs.filter((d) => match(d, where)), "createdAt")[0] ?? null },
    contractSettings: { findUnique: async () => ({ paymentInstructionsEn: "Pay by transfer", paymentInstructionsAr: "حوالة" }) },
    maintenanceSubscription: {
      findUnique: async ({ where }: { where: { id: string } }) => mem.subs[where.id] ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { Object.assign((mem.subs[where.id] ??= {}), data); return mem.subs[where.id]; },
    },
    customer: { findFirst: async () => mem.customers[0] ?? null, findUnique: async () => null, update: async () => ({}) },
    invoice: {
      findFirst: async () => mem.invoices[mem.invoices.length - 1] ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => { const i = { id: `i${++mem.seq}`, ...data, items: undefined, _items: (data.items as { create: unknown[] }).create }; mem.invoices.push(i); return i; },
    },
    invoicePayment: { create: async ({ data }: { data: Record<string, unknown> }) => { mem.payments.push(data); return data; } },
  };
  db.$transaction = async (cb: (tx: unknown) => unknown) => cb(db);
  return { prisma: db };
});
vi.mock("./pdf", () => ({ htmlToPdf: async () => Buffer.from("%PDF-1.7 test") }));
vi.mock("@/lib/emailSender", () => ({ emailSender: { send: async (m: Record<string, unknown>) => { mem.mails.push(m); } } }));
vi.mock("@/lib/customerMatch", () => ({ findOrCreateCustomer: async () => ({ id: "cust-new" }) }));
vi.mock("./terms", () => ({ activeTerms: async () => ({ id: "t9", version: 9, clauses: [] }) }));

import * as svc from "./service";
import type { ContractSnapshot } from "./snapshot";
import { DEFAULT_CLAUSES } from "./clauses";

const admin: svc.Actor = { type: "admin", id: "a1", name: "Layla" };
const snap = (over: Partial<ContractSnapshot["pricing"]> = {}): ContractSnapshot => ({
  schema: 1, groupKey: "",
  customer: { name: "Sara Ahmed", phone: "+971501234567", whatsapp: "", email: "sara@example.com" },
  property: { emirate: "Dubai", area: "Marina", address: "Tower 1", type: "Apartment", bedrooms: 2, bathrooms: 2, floors: 1, size: null, acUnits: 4, notes: "" },
  package: { id: "p", nameEn: "Gold", nameAr: "الذهبية", durationMonths: 12, lines: [], excluded: [], acUnitsCovered: 5, handymanHours: null, visits: [], bullets: [], specialTerms: { en: [], ar: [] } },
  extras: [], openItems: [], pricing: { currency: "AED", packagePrice: 1499, additional: 0, discount: 0, subtotal: 1499, vatPercent: 5, vat: 71.38, pricesIncludeVat: true, total: 1499, quote: false, ...over },
  terms: { id: "t1", version: 1, clauses: DEFAULT_CLAUSES }, checks: [],
});
const submit = async (s = snap()) => {
  mem.subs.sub1 = { status: "New Request", activationDate: null };
  return svc.createFromSubmission({ subscriptionId: "sub1", lang: "en", groupKey: "", snapshot: s, method: "Website", ip: "1.2.3.4", agent: "UA" });
};
const get = (id: string) => mem.contracts.find((c) => c.id === id)!;
const kinds = () => mem.events.map((e) => e.kind);

beforeEach(() => { mem.contracts = []; mem.events = []; mem.docs = []; mem.subs = {}; mem.invoices = []; mem.payments = []; mem.mails = []; mem.customers = []; mem.seq = 0; });

describe("creating the agreement from a confirmed request", () => {
  it("records the acceptance, a unique number, an unguessable link, and the audit trail", async () => {
    const c = await submit();
    expect(c.number).toBe(`OSTA-AGR-${new Date().getUTCFullYear()}-000001`); expect(c.requestNumber).toMatch(/^OSTA-REQ-\d{4}-000001$/);
    expect(c).toMatchObject({ status: "PENDING_APPROVAL", acceptanceMethod: "Website", acceptanceIp: "1.2.3.4", termsVersion: 1 }); expect(c.acceptedAt).toBeInstanceOf(Date);
    expect(String(c.accessToken)).toMatch(/^[A-Za-z0-9_-]{30,}$/);
    expect(kinds()).toEqual(["submitted", "accepted"]);
    const second = await submit(); expect(second.number.endsWith("000002")).toBe(true); expect(second.accessToken).not.toBe(c.accessToken);
  });
  it("builds the draft PDF and emails it to the customer afterwards, without ever failing the request", async () => {
    const c = await submit();
    await svc.afterSubmission(c.id);
    expect(mem.docs).toHaveLength(1); expect(mem.docs[0]).toMatchObject({ kind: "draft", contractId: c.id });
    expect(mem.mails[0]).toMatchObject({ to: ["sara@example.com"], adminCopy: false }); expect((mem.mails[0].attachments as { filename: string }[])[0].filename).toContain("DRAFT");
  });
});

describe("approval", () => {
  it("issues the payment link: status Awaiting payment, approved price recorded, customer linked, link emailed, request status synced", async () => {
    const c = await submit();
    const r = await svc.approve(c.id, admin);
    expect(r.ok).toBe(true); expect(r.ok && r.paymentUrl).toContain(`/agreement/${c.accessToken}`);
    expect(get(c.id)).toMatchObject({ status: "AWAITING_PAYMENT", approvedTotal: 1499, approvedByName: "Layla", customerId: "cust-new" });
    expect(mem.subs.sub1.status).toBe("Payment Pending");
    expect(String(mem.mails.at(-1)!.subject)).toContain("approved"); expect(String(mem.mails.at(-1)!.text)).toContain(`/agreement/${c.accessToken}`);
    expect(kinds()).toContain("approved");
  });
  it("refuses an agreement with items still to be quoted, one the customer has not accepted, and one already approved", async () => {
    const quoted = await submit(snap({ quote: true })); expect(await svc.approve(quoted.id, admin)).toMatchObject({ ok: false, error: expect.stringContaining("to be quoted") });
    const draft = await submit(); Object.assign(get(draft.id), { status: "DRAFT", acceptedAt: null });
    expect((await svc.approve(draft.id, admin)).ok).toBe(false);
    const ok = await submit(); await svc.approve(ok.id, admin); expect((await svc.approve(ok.id, admin)).ok).toBe(false);
    expect((await svc.approve("missing", admin)).ok).toBe(false);
  });
});

describe("payment and activation", () => {
  const approved = async () => { const c = await submit(); await svc.approve(c.id, admin); mem.mails = []; return c; };
  const pay = { method: "Bank transfer", reference: "TRX-9981", note: "", paidAt: new Date("2026-11-08T12:00:00Z") };

  it("cannot be activated before approval, or without a payment reference", async () => {
    const early = await submit();
    expect(await svc.confirmPayment(early.id, admin, pay)).toMatchObject({ ok: false }); expect(get(early.id).status).toBe("PENDING_APPROVAL");
    const c = await approved();
    expect(await svc.confirmPayment(c.id, admin, { ...pay, reference: "" })).toMatchObject({ ok: false, error: expect.stringContaining("reference") }); expect(get(c.id).status).toBe("AWAITING_PAYMENT");
  });
  it("a recorded payment activates the agreement for 12 months, creates a PAID ERP invoice for the exact total, and issues the final PDF by email", async () => {
    const c = await approved();
    expect((await svc.confirmPayment(c.id, admin, pay)).ok).toBe(true);
    const row = get(c.id);
    expect(row).toMatchObject({ status: "ACTIVE", paymentStatus: "paid", paymentMethod: "Bank transfer", paymentReference: "TRX-9981" });
    const days = Math.round(((row.expiryDate as Date).getTime() - (row.activationDate as Date).getTime()) / 864e5); expect(days).toBeGreaterThanOrEqual(365); expect(days).toBeLessThanOrEqual(366);
    expect(mem.invoices[0]).toMatchObject({ amount: 1499, status: "Paid", paidAmount: 1499, category: "AMC", customerId: "cust-new", createdById: "a1" }); expect(String(mem.invoices[0].number)).toMatch(/^INV-\d{4}-000001$/);
    expect(row.invoiceId).toBe(mem.invoices[0].id); expect(mem.payments[0]).toMatchObject({ kind: "Invoice Created", amount: 1499 });
    expect(mem.docs.at(-1)).toMatchObject({ kind: "final" }); expect(String(mem.mails.at(-1)!.subject)).toContain("active"); expect((mem.mails.at(-1)!.attachments as { filename: string }[])[0].filename).toContain("FINAL");
    expect(mem.subs.sub1.status).toBe("Contract Activated"); expect(kinds()).toEqual(expect.arrayContaining(["payment_recorded", "activated", "final_pdf"]));
    expect((await svc.confirmPayment(c.id, admin, pay)).ok).toBe(false); // not twice
  });
  it("VAT charged on top becomes its own invoice line so the invoice equals the contract total", async () => {
    const c = await submit(snap({ pricesIncludeVat: false, vat: 74.95, total: 1573.95, subtotal: 1499 })); await svc.approve(c.id, admin);
    await svc.confirmPayment(c.id, admin, pay);
    const items = mem.invoices[0]._items as { serviceName: string; unitPrice: number }[];
    expect(items.reduce((s, i) => s + i.unitPrice, 0)).toBeCloseTo(1573.95, 2); expect(items.some((i) => i.serviceName.startsWith("VAT"))).toBe(true);
  });
  it("an approved alternative arrangement activates it but leaves the invoice UNPAID and the agreement not 'paid'", async () => {
    const c = await approved();
    expect((await svc.confirmPayment(c.id, admin, { method: "Approved alternative arrangement", reference: "", note: "Owner approved two instalments", paidAt: new Date() })).ok).toBe(true);
    expect(get(c.id)).toMatchObject({ status: "ACTIVE", paymentStatus: "arrangement" }); expect(mem.invoices[0]).toMatchObject({ status: "Unpaid", paidAmount: 0 });
  });
  it("still activates when the PDF engine fails; the customer can fetch the file later", async () => {
    const c = await approved();
    const pdf = await import("./pdf"); const spy = vi.spyOn(pdf, "htmlToPdf").mockRejectedValueOnce(new Error("no chrome"));
    expect((await svc.confirmPayment(c.id, admin, pay)).ok).toBe(true); spy.mockRestore();
    expect(get(c.id).status).toBe("ACTIVE"); expect(kinds()).toContain("pdf_failed");
  });
});

describe("changing the price and the customer's acceptance", () => {
  it("a revision is a NEW version: acceptance cleared, status Draft, payment link no longer usable, customer asked to accept", async () => {
    const c = await submit(); await svc.approve(c.id, admin); mem.mails = [];
    const r = await svc.revise(c.id, admin, { adjustments: [{ labelEn: "Extra visit", labelAr: "زيارة", amount: 100 }], settleOpenItems: false, reason: "Added an extra visit as requested" });
    expect(r).toMatchObject({ ok: true, version: 2 });
    expect(get(c.id)).toMatchObject({ status: "DRAFT", version: 2, acceptedAt: null, approvedAt: null, approvedTotal: null });
    expect((get(c.id).snapshot as ContractSnapshot).pricing.total).toBe(1599);
    expect(String(mem.mails.at(-1)!.subject)).toContain("updated"); expect(mem.subs.sub1.status).toBe("Quotation Sent");
    expect((await svc.confirmPayment(c.id, admin, { method: "Cash", reference: "R1", note: "", paidAt: new Date() })).ok).toBe(false); // cannot be paid until re-accepted and approved
    expect((await svc.approve(c.id, admin)).ok).toBe(false);
  });
  it("the customer accepts the new version from their link; then it is pending approval again", async () => {
    const c = await submit(); await svc.revise(c.id, admin, { adjustments: [{ labelEn: "Extra", labelAr: "", amount: 50 }], settleOpenItems: false, reason: "Price updated for you" });
    expect((await svc.acceptByLink("wrong-token", { ip: "1.1.1.1", agent: "" })).ok).toBe(false);
    expect((await svc.acceptByLink(String(c.accessToken), { ip: "9.9.9.9", agent: "UA" })).ok).toBe(true);
    expect(get(c.id)).toMatchObject({ status: "PENDING_APPROVAL", acceptanceMethod: "Agreement link", acceptanceIp: "9.9.9.9" }); expect(get(c.id).acceptedAt).toBeInstanceOf(Date);
    expect((await svc.acceptByLink(String(c.accessToken), { ip: "", agent: "" })).ok).toBe(false); // only once
  });
  it("needs a real reason and a real change", async () => {
    const c = await submit();
    expect(await svc.revise(c.id, admin, { adjustments: [{ labelEn: "X", labelAr: "", amount: 10 }], settleOpenItems: false, reason: "no" })).toMatchObject({ ok: false });
    expect(await svc.revise(c.id, admin, { adjustments: [], settleOpenItems: false, reason: "Nothing to change here" })).toMatchObject({ ok: false });
  });
});

describe("the other decisions", () => {
  it("rejecting, cancelling and asking for changes need a reason the customer or the record can show", async () => {
    const c = await submit();
    expect((await svc.reject(c.id, admin, "x")).ok).toBe(false); expect((await svc.requestChanges(c.id, admin, "")).ok).toBe(false); expect((await svc.cancel(c.id, admin, "")).ok).toBe(false);
    expect((await svc.requestChanges(c.id, admin, "Please confirm the address")).ok).toBe(true); expect(get(c.id).status).toBe("CHANGES_REQUESTED"); expect(String(mem.mails.at(-1)!.text)).toContain("Please confirm the address");
    expect((await svc.reject(c.id, admin, "Outside our service area")).ok).toBe(true); expect(get(c.id)).toMatchObject({ status: "REJECTED", rejectionReason: "Outside our service area" }); expect(mem.subs.sub1.status).toBe("Rejected");
    expect((await svc.approve(c.id, admin)).ok).toBe(false); // finished
  });
  it("what the customer's own link shows has no internal notes, and the final PDF is only for active agreements", async () => {
    const c = await submit(); await svc.addNote(c.id, admin, "Customer is a VIP, handle with care");
    const view = await svc.publicView(String(c.accessToken));
    expect(JSON.stringify(view)).not.toContain("VIP"); expect(view).toMatchObject({ status: "PENDING_APPROVAL", customerName: "Sara Ahmed" });
    expect(await svc.publicView("nope")).toBeNull();
  });
});
