import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS } from "./invoiceLabels";
import { DEFAULT_INVOICE_TERMS, isDefaultTerms, parseInvoiceTerms, termsForInvoice, validateInvoiceTerms, MAX_TERMS } from "./invoiceTerms";

const pair = (en: string, ar: string) => ({ en, ar });
const titles = DEFAULT_INVOICE_TERMS.titles;
const labels = DEFAULT_INVOICE_TERMS.labels;

describe("invoice terms", () => {
  it("uses the built-in wording until the owner saves their own", () => {
    expect(parseInvoiceTerms(null)).toEqual(DEFAULT_INVOICE_TERMS);
    expect(parseInvoiceTerms("garbage")).toEqual(DEFAULT_INVOICE_TERMS);
    expect(parseInvoiceTerms({ general: "nope" })).toEqual(DEFAULT_INVOICE_TERMS);
    expect(isDefaultTerms(DEFAULT_INVOICE_TERMS)).toBe(true);
  });

  it("uses what the owner saved, in the order they put it", () => {
    const saved = { general: [pair("B", "ب"), pair("A", "أ")], warranty: [pair("W", "ض")], titles, labels };
    expect(parseInvoiceTerms(saved)).toEqual(saved);
    expect(isDefaultTerms(saved)).toBe(false);
  });

  it("gives terms saved before the headings were editable the original headings", () => {
    const old = { general: [pair("B", "ب")], warranty: [] };
    expect(parseInvoiceTerms(old)).toEqual({ ...old, titles, labels });
  });

  it("keeps edited headings, and needs both languages in them", () => {
    const custom = { general: [], warranty: [], titles: { general: pair("TERMS", "الشروط"), warranty: pair("WARRANTY", "الضمان") }, labels };
    expect(parseInvoiceTerms(custom).titles.general).toEqual(pair("TERMS", "الشروط"));
    expect(validateInvoiceTerms({ ...custom, titles: { ...custom.titles, general: pair("TERMS", "") } }).ok).toBe(false);
    expect(validateInvoiceTerms({ ...custom, titles: { ...custom.titles, warranty: pair("x".repeat(81), "ب") } }).ok).toBe(false);
    expect(isDefaultTerms({ ...DEFAULT_INVOICE_TERMS, titles: custom.titles })).toBe(false);
  });

  it("keeps every other word of the invoice at its original wording until edited, and keeps edits", () => {
    expect(parseInvoiceTerms({ general: [], warranty: [] }).labels).toEqual(DEFAULT_LABELS);
    const edited = parseInvoiceTerms({ general: [], warranty: [], labels: { grandTotal: pair("TOTAL DUE", "المطلوب") } });
    expect(edited.labels.grandTotal).toEqual(pair("TOTAL DUE", "المطلوب"));
    expect(edited.labels.subtotal).toEqual(DEFAULT_LABELS.subtotal); // an unsaved word is untouched
    expect(isDefaultTerms(edited)).toBe(false);
    expect(isDefaultTerms(parseInvoiceTerms({ general: DEFAULT_INVOICE_TERMS.general, warranty: DEFAULT_INVOICE_TERMS.warranty }))).toBe(true);
  });

  it("lets a word be empty in one language but not in both", () => {
    const base = { general: [], warranty: [] };
    expect(validateInvoiceTerms({ ...base, labels: { qty: pair("Quantity", "") } }).ok).toBe(true);
    expect(validateInvoiceTerms({ ...base, labels: { qty: pair("", "الكمية") } }).ok).toBe(true);
    expect(validateInvoiceTerms({ ...base, labels: { qty: pair("", "") } }).ok).toBe(false);
    expect(validateInvoiceTerms({ ...base, labels: { qty: pair("x".repeat(301), "ب") } }).ok).toBe(false);
  });

  it("needs both languages in every term and keeps the lists a sane size", () => {
    expect(validateInvoiceTerms({ general: [pair("Only English", "")], warranty: [] }).ok).toBe(false);
    expect(validateInvoiceTerms({ general: [pair("", "فقط عربي")], warranty: [] }).ok).toBe(false);
    expect(validateInvoiceTerms({ general: [pair("x".repeat(1501), "ب")], warranty: [] }).ok).toBe(false);
    expect(validateInvoiceTerms({ general: Array.from({ length: MAX_TERMS + 1 }, () => pair("a", "ب")), warranty: [] }).ok).toBe(false);
    expect(validateInvoiceTerms({ general: [], warranty: [] }).ok).toBe(true); // an empty list is allowed: nothing is printed
    const trimmed = validateInvoiceTerms({ general: [pair("  hi  ", "  مرحبا ")], warranty: [] });
    expect(trimmed.ok && trimmed.value.general[0]).toEqual(pair("hi", "مرحبا"));
  });

  it("fills in the warranty days and drops what needs a warranty when there is none", () => {
    const c = { general: [pair("Plain", "عادي"), pair("{days}-day cover", "ضمان {days} يوم")], warranty: [pair("W {days}", "ض {days}")], titles, labels };
    expect(termsForInvoice(c, 14)).toEqual({
      general: [pair("Plain", "عادي"), pair("14-day cover", "ضمان 14 يوم")],
      warranty: [pair("W 14", "ض 14")],
      titles,
      labels,
    });
    expect(termsForInvoice(c, null)).toEqual({ general: [pair("Plain", "عادي")], warranty: [], titles, labels });
  });
});
