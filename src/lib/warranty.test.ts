import { describe, expect, it } from "vitest";
import {
  emptyWarranty,
  resolveWarranty,
  warrantyChoiceComplete,
  warrantyDisplayOf,
  warrantyFormOf,
  warrantyStatusOf,
  termsWarrantyDays,
  type WarrantyFormData,
} from "./warranty";
import { invoiceTerms } from "./invoiceData";

const invoiceDate = new Date("2026-11-10T12:00:00Z");
const form = (patch: Partial<WarrantyFormData>): WarrantyFormData => ({ ...emptyWarranty, ...patch });

describe("choosing a warranty", () => {
  it("never picks one for the employee", () => {
    const r = resolveWarranty(emptyWarranty, invoiceDate);
    expect(r.ok).toBe(false);
    expect(warrantyChoiceComplete(emptyWarranty)).toBe(false);
  });

  it("No Warranty stores no duration and no dates", () => {
    const r = resolveWarranty(form({ mode: "NONE", days: "30" }), invoiceDate);
    expect(r).toEqual({ ok: true, value: { warrantyMode: "NONE", warrantyDays: null, warrantyStartDate: null, warrantyUntil: null } });
  });

  it("With Warranty needs a duration of 7, 14 or 30 days", () => {
    expect(resolveWarranty(form({ mode: "WITH" }), invoiceDate).ok).toBe(false);
    expect(resolveWarranty(form({ mode: "WITH", days: "14" }), invoiceDate).ok).toBe(true);
    expect(resolveWarranty({ ...form({ mode: "WITH" }), days: "21" as never }, invoiceDate).ok).toBe(false);
  });

  it("counts from the invoice date when the work was done that day", () => {
    const r = resolveWarranty(form({ mode: "WITH", days: "14" }), invoiceDate);
    expect(r.ok && r.value).toEqual({ warrantyMode: "WITH", warrantyDays: 14, warrantyStartDate: invoiceDate, warrantyUntil: new Date("2026-11-24T12:00:00Z") });
  });

  it("counts from the day the work was done when that differs from the invoice date", () => {
    const r = resolveWarranty(form({ mode: "WITH", days: "7", startMode: "DATE", startDate: "2026-11-15" }), invoiceDate);
    expect(r.ok && r.value.warrantyStartDate).toEqual(new Date("2026-11-15T12:00:00Z"));
    expect(r.ok && r.value.warrantyUntil).toEqual(new Date("2026-11-22T12:00:00Z"));
    expect(resolveWarranty(form({ mode: "WITH", days: "7", startMode: "DATE", startDate: "" }), invoiceDate).ok).toBe(false);
    expect(resolveWarranty(form({ mode: "WITH", days: "7", startMode: "DATE", startDate: "2026-02-31" }), invoiceDate).ok).toBe(false);
  });

  it("stays Pending, with no dates, while the work is not completed", () => {
    const r = resolveWarranty(form({ mode: "WITH", days: "30", startMode: "PENDING" }), invoiceDate);
    expect(r.ok && r.value).toEqual({ warrantyMode: "WITH", warrantyDays: 30, warrantyStartDate: null, warrantyUntil: null });
  });

  it("refuses the legacy choice for a new invoice", () => {
    expect(resolveWarranty(form({ mode: "LEGACY" }), invoiceDate).ok).toBe(false);
  });
});

describe("warranty status", () => {
  const now = new Date("2026-11-20T08:00:00Z");
  const base = { warrantyMode: "WITH", warrantyDays: 14 };

  it("No Warranty is never active", () => {
    expect(warrantyStatusOf({ warrantyMode: "NONE", warrantyDays: null, warrantyStartDate: null, warrantyUntil: null }, now)).toBe("NO_WARRANTY");
  });

  it("is Pending until the work is completed, and while the start date is still ahead", () => {
    expect(warrantyStatusOf({ ...base, warrantyStartDate: null, warrantyUntil: null }, now)).toBe("PENDING");
    expect(warrantyStatusOf({ ...base, warrantyStartDate: new Date("2026-11-25T12:00:00Z"), warrantyUntil: new Date("2026-12-09T12:00:00Z") }, now)).toBe("PENDING");
  });

  it("is Active through the whole last day, then Expired", () => {
    const rec = { ...base, warrantyStartDate: new Date("2026-11-10T12:00:00Z"), warrantyUntil: new Date("2026-11-20T12:00:00Z") };
    expect(warrantyStatusOf(rec, new Date("2026-11-20T19:59:00Z"))).toBe("ACTIVE"); // 23:59 in the UAE on the last day
    expect(warrantyStatusOf(rec, new Date("2026-11-20T20:01:00Z"))).toBe("EXPIRED"); // just after midnight in the UAE
  });

  it("keeps an invoice from before the choice existed working as it did", () => {
    const legacy = { warrantyMode: null, warrantyDays: null, warrantyStartDate: null };
    expect(warrantyStatusOf({ ...legacy, warrantyUntil: new Date("2026-12-01T12:00:00Z") }, now)).toBe("ACTIVE");
    expect(warrantyStatusOf({ ...legacy, warrantyUntil: new Date("2026-11-01T12:00:00Z") }, now)).toBe("EXPIRED");
    expect(warrantyStatusOf({ ...legacy, warrantyUntil: null }, now)).toBe("NO_WARRANTY");
  });
});

describe("what the invoice shows and says", () => {
  it("shows nothing but 'not included' without a warranty", () => {
    expect(warrantyDisplayOf({ warrantyMode: "NONE", warrantyDays: null, warrantyStartDate: null, warrantyUntil: null })).toEqual({ kind: "NONE" });
    expect(warrantyDisplayOf({ warrantyMode: null, warrantyDays: null, warrantyStartDate: null, warrantyUntil: null })).toEqual({ kind: "NONE" });
  });

  it("names the chosen days in the invoice's own terms and drops the line when there is no warranty", () => {
    const withDays = (d: number) => invoiceTerms(d).map((t) => t.en).join(" | ");
    expect(withDays(30)).toContain("voids the 30-day warranty");
    expect(withDays(7)).toContain("voids the 7-day warranty");
    expect(invoiceTerms(null).some((t) => /warranty/i.test(t.en))).toBe(false);
    expect(invoiceTerms(null)).toHaveLength(invoiceTerms(14).length - 1);
    expect(termsWarrantyDays({ kind: "NONE" })).toBeNull();
    expect(termsWarrantyDays({ kind: "LEGACY", until: invoiceDate })).toBe(14);
  });
});

describe("editing", () => {
  it("brings the saved choice back into the form", () => {
    const saved = { warrantyMode: "WITH", warrantyDays: 14, warrantyStartDate: invoiceDate, warrantyUntil: new Date("2026-11-24T12:00:00Z") };
    expect(warrantyFormOf(saved, invoiceDate)).toEqual({ mode: "WITH", days: "14", startMode: "INVOICE_DATE", startDate: "2026-11-10" });
    expect(warrantyFormOf({ ...saved, warrantyStartDate: new Date("2026-11-12T12:00:00Z") }, invoiceDate).startMode).toBe("DATE");
    expect(warrantyFormOf({ ...saved, warrantyStartDate: null, warrantyUntil: null }, invoiceDate).startMode).toBe("PENDING");
    expect(warrantyFormOf({ warrantyMode: "NONE", warrantyDays: null, warrantyStartDate: null, warrantyUntil: null }, invoiceDate).mode).toBe("NONE");
  });

  it("offers an old invoice's warranty as it is, and nothing preselected when it had none", () => {
    expect(warrantyFormOf({ warrantyMode: null, warrantyDays: null, warrantyStartDate: null, warrantyUntil: new Date("2026-11-24T12:00:00Z") }, invoiceDate).mode).toBe("LEGACY");
    expect(warrantyFormOf({ warrantyMode: null, warrantyDays: null, warrantyStartDate: null, warrantyUntil: null }, invoiceDate).mode).toBe("");
  });
});
