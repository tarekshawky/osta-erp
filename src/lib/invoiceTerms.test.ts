import { describe, expect, it } from "vitest";
import { DEFAULT_INVOICE_TERMS, isDefaultTerms, parseInvoiceTerms, termsForInvoice, validateInvoiceTerms, MAX_TERMS } from "./invoiceTerms";

const pair = (en: string, ar: string) => ({ en, ar });

describe("invoice terms", () => {
  it("uses the built-in wording until the owner saves their own", () => {
    expect(parseInvoiceTerms(null)).toEqual(DEFAULT_INVOICE_TERMS);
    expect(parseInvoiceTerms("garbage")).toEqual(DEFAULT_INVOICE_TERMS);
    expect(parseInvoiceTerms({ general: "nope" })).toEqual(DEFAULT_INVOICE_TERMS);
    expect(isDefaultTerms(DEFAULT_INVOICE_TERMS)).toBe(true);
  });

  it("uses what the owner saved, in the order they put it", () => {
    const saved = { general: [pair("B", "ب"), pair("A", "أ")], warranty: [pair("W", "ض")] };
    expect(parseInvoiceTerms(saved)).toEqual(saved);
    expect(isDefaultTerms(saved)).toBe(false);
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
    const c = { general: [pair("Plain", "عادي"), pair("{days}-day cover", "ضمان {days} يوم")], warranty: [pair("W {days}", "ض {days}")] };
    expect(termsForInvoice(c, 14)).toEqual({
      general: [pair("Plain", "عادي"), pair("14-day cover", "ضمان 14 يوم")],
      warranty: [pair("W 14", "ض 14")],
    });
    expect(termsForInvoice(c, null)).toEqual({ general: [pair("Plain", "عادي")], warranty: [] });
  });
});
